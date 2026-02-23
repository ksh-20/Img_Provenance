"""
Analysis router — image upload, deepfake analysis, ELA heatmap, metadata endpoints.
"""

import os
import uuid
import json
import aiofiles
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from PIL import Image

from models.schemas import (
    ImageUploadResponse, DeepfakeScore, MetadataAnalysis, AnalysisRequest
)
from services.deepfake import analyze_image
from services.metadata import extract_metadata
from services.hashing import compute_hashes
from services.forensics import perform_ela, detect_manipulation_regions

router = APIRouter(prefix="/api/images", tags=["Image Analysis"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory analysis store
_analysis_store: dict = {}


def get_analysis_store():
    return _analysis_store


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...)):
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

    upload_time = datetime.utcnow().isoformat()
    response = ImageUploadResponse(
        image_id=image_id,
        filename=file.filename,
        file_size=len(content),
        upload_time=upload_time,
        width=width,
        height=height,
        format=fmt,
        phash=hashes["phash"],
        dhash=hashes["dhash"],
        ahash=hashes["ahash"]
    )

    # Cache for later use
    _analysis_store[image_id] = {
        "file_path": file_path,
        "filename": file.filename,
        "upload_time": upload_time,
        "hashes": hashes,
        "width": width,
        "height": height,
        "format": fmt,
        "file_size": len(content),
    }

    return response


@router.post("/analyze/{image_id}")
async def analyze(image_id: str, request: Optional[AnalysisRequest] = None):
    """Run full deepfake + ELA + metadata analysis on an uploaded image."""
    if image_id not in _analysis_store:
        raise HTTPException(status_code=404, detail="Image not found")

    data = _analysis_store[image_id]
    file_path = data["file_path"]

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    # Run all analyses
    deepfake_score, ela_map = analyze_image(file_path)
    metadata = extract_metadata(file_path)
    metadata.image_id = image_id
    manipulation_regions = detect_manipulation_regions(file_path, ela_map)

    # Cache results
    _analysis_store[image_id].update({
        "deepfake_score": deepfake_score.dict(),
        "ela_map": ela_map,
        "metadata": metadata.dict(),
        "manipulation_regions": [r.dict() for r in manipulation_regions],
        "analyzed_at": datetime.utcnow().isoformat(),
    })

    return {
        "image_id": image_id,
        "deepfake_score": deepfake_score.dict(),
        "ela_map": ela_map,
        "metadata": metadata.dict(),
        "manipulation_regions": [r.dict() for r in manipulation_regions],
        "analyzed_at": datetime.utcnow().isoformat(),
    }


@router.get("/ela/{image_id}")
async def get_ela_heatmap(image_id: str):
    """Get the ELA heatmap for a previously analyzed image."""
    if image_id not in _analysis_store:
        raise HTTPException(status_code=404, detail="Image not found")
    data = _analysis_store[image_id]
    if "ela_map" not in data:
        raise HTTPException(status_code=400, detail="Image not yet analyzed. POST /analyze first.")
    return {"image_id": image_id, "ela_map": data["ela_map"]}


@router.get("/{image_id}")
async def get_image_info(image_id: str):
    """Get stored info and analysis results for an image."""
    if image_id not in _analysis_store:
        raise HTTPException(status_code=404, detail="Image not found")
    return _analysis_store[image_id]


@router.get("/{image_id}/thumbnail")
async def get_thumbnail(image_id: str):
    """Return a small thumbnail for graph node display."""
    from fastapi.responses import StreamingResponse
    import io

    if image_id not in _analysis_store:
        raise HTTPException(status_code=404, detail="Image not found")

    file_path = _analysis_store[image_id].get("file_path")
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


@router.get("/")
async def list_images():
    """List all uploaded images."""
    return [
        {
            "image_id": k,
            "filename": v.get("filename"),
            "upload_time": v.get("upload_time"),
            "analyzed": "deepfake_score" in v,
        }
        for k, v in _analysis_store.items()
    ]
