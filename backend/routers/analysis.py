from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import os
import uuid
import aiofiles
from PIL import Image

from database import get_db
from models.db_models import User, AnalysisRecord
from models.schemas import (
    ImageUploadResponse, DeepfakeScore, MetadataAnalysis, AnalysisRequest
)
from services.deepfake import analyze_image
from services.metadata import extract_metadata
from services.hashing import compute_hashes
from services.forensics import perform_ela, detect_manipulation_regions, compute_verdict
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/images", tags=["Image Analysis"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload an image for analysis. Returns image_id for subsequent API calls."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_id = str(uuid.uuid4())
    filename = f"{image_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Save file
    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Extract basic image info
    try:
        img = Image.open(file_path)
        width, height = img.size
        fmt = img.format or "JPEG"
    except Exception:
        raise HTTPException(status_code=400, detail="Cannot open image file")

    # Compute hashes
    hashes = compute_hashes(file_path)
    upload_time = datetime.utcnow()

    # Create persistence record
    record = AnalysisRecord(
        user_id=current_user.id,
        image_id=image_id,
        filename=file.filename,
        file_size=len(content),
        image_width=width,
        image_height=height,
        image_format=fmt,
        phash=hashes["phash"],
        analyzed_at=upload_time # Placeholder until full analysis
    )
    db.add(record)
    db.commit()

    return ImageUploadResponse(
        image_id=image_id,
        filename=file.filename,
        file_size=len(content),
        upload_time=upload_time.isoformat(),
        width=width,
        height=height,
        format=fmt,
        phash=hashes["phash"],
        dhash=hashes["dhash"],
        ahash=hashes["ahash"]
    )


@router.post("/analyze/{image_id}")
async def analyze(
    image_id: str, 
    request: Optional[AnalysisRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run full deepfake + ELA + metadata analysis on an uploaded image."""
    record = db.query(AnalysisRecord).filter(
        AnalysisRecord.image_id == image_id,
        AnalysisRecord.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Image record not found for this user")

    # Filename on disk is {image_id}_{original_filename}
    # Find the file in UPLOAD_DIR
    file_path = None
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith(image_id):
            file_path = os.path.join(UPLOAD_DIR, f)
            break

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    # Run all analyses
    deepfake_score, ela_map = analyze_image(file_path)
    metadata = extract_metadata(file_path)
    metadata.image_id = image_id
    manipulation_regions = detect_manipulation_regions(file_path, ela_map)

    # Update persistence record using shared verdict logic
    record.verdict = compute_verdict(
        deepfake_score.overall_score, 
        metadata.suspicious_flags, 
        len(manipulation_regions)
    )
    
    record.deepfake_score = deepfake_score.overall_score
    record.gan_score      = deepfake_score.gan_artifact_score
    record.ela_score      = deepfake_score.ela_score
    record.face_swap_score= deepfake_score.face_swap_score
    record.is_deepfake     = deepfake_score.is_deepfake
    
    record.has_exif         = metadata.has_exif
    record.camera_make      = metadata.camera_make
    record.camera_model     = metadata.camera_model
    record.stego_detected   = metadata.steganography_detected
    record.suspicious_flags = metadata.suspicious_flags
    record.analyzed_at      = datetime.utcnow()

    db.commit()

    return {
        "image_id": image_id,
        "verdict": record.verdict,
        "deepfake_score": deepfake_score.dict(),
        "ela_map": ela_map,
        "metadata": metadata.dict(),
        "manipulation_regions": [r.dict() for r in manipulation_regions],
        "analyzed_at": record.analyzed_at.isoformat(),
    }


@router.get("/ela/{image_id}")
async def get_ela_heatmap(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the ELA heatmap for a previously analyzed image."""
    record = db.query(AnalysisRecord).filter(
        AnalysisRecord.image_id == image_id,
        AnalysisRecord.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Image not found")
        
    # Heatmap isn't stored in DB (too large/non-relational), we re-run ELA or store locally.
    # For now, re-run ELA to keep DB light, or look for a cached file.
    file_path = None
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith(image_id):
            file_path = os.path.join(UPLOAD_DIR, f)
            break
            
    if not file_path:
        raise HTTPException(status_code=404, detail="Original image file missing")
        
    ela_map, _ = perform_ela(file_path)
    return {"image_id": image_id, "ela_map": ela_map}


@router.get("/")
async def list_images(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all images uploaded by the current user."""
    records = db.query(AnalysisRecord).filter(AnalysisRecord.user_id == current_user.id).all()
    return [
        {
            "image_id": r.image_id,
            "filename": r.filename,
            "upload_time": r.analyzed_at.isoformat(),
            "analyzed": r.verdict is not None,
            "verdict": r.verdict
        }
        for r in records
    ]


@router.get("/{image_id}")
async def get_image_info(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get stored info and analysis results for an image."""
    record = db.query(AnalysisRecord).filter(
        AnalysisRecord.image_id == image_id,
        AnalysisRecord.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return {
        "image_id": record.image_id,
        "filename": record.filename,
        "verdict": record.verdict,
        "deepfake_score": {
            "overall_score": record.deepfake_score,
            "is_deepfake": record.is_deepfake
        },
        "metadata": {
            "has_exif": record.has_exif,
            "suspicious_flags": record.suspicious_flags
        }
    }


@router.get("/{image_id}/thumbnail")
async def get_thumbnail(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return a small thumbnail for graph node display."""
    from fastapi.responses import StreamingResponse
    import io

    # Security check: verify ownership
    record = db.query(AnalysisRecord).filter(
        AnalysisRecord.image_id == image_id,
        AnalysisRecord.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Image not found")

    file_path = None
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith(image_id):
            file_path = os.path.join(UPLOAD_DIR, f)
            break
            
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        img = Image.open(file_path)
        img.thumbnail((128, 128))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/jpeg")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate thumbnail")
