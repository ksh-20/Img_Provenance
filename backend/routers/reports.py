from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import uuid
import os

from database import get_db
from models.db_models import User, AnalysisRecord, ProvenanceRecord, SocialRecord
from models.schemas import ForensicsReport, DashboardStats
from services.auth_service import get_current_user
from services.pdf_generator import generate_forensics_pdf

router = APIRouter(prefix="/api/reports", tags=["Reports"])


from services.forensics import compute_verdict


def _build_evidence_summary(record: AnalysisRecord) -> list[str]:
    evidence = []
    if record.deepfake_score > 0.45:
        evidence.append(f"Deepfake confidence score: {record.deepfake_score:.2%}")
    if record.ela_score > 0.28:
        evidence.append(f"Error Level Analysis detected elevated manipulation score: {record.ela_score:.2%}")
    if record.gan_score > 0.35:
        evidence.append(f"GAN artifact fingerprints detected in frequency domain (score: {record.gan_score:.2%})")
    if record.stego_detected:
        evidence.append("Steganographic content or LSB anomalies detected")
    
    flags = record.suspicious_flags or []
    for flag in flags:
        evidence.append(flag)
        
    if not evidence:
        evidence.append("No significant manipulation indicators detected")
    return evidence


@router.get("/{image_id}", response_model=ForensicsReport)
async def get_report(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(AnalysisRecord).filter(
        AnalysisRecord.image_id == image_id,
        AnalysisRecord.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")

    prov_record = db.query(ProvenanceRecord).filter(ProvenanceRecord.image_id == image_id).first()
    social_record = db.query(SocialRecord).filter(SocialRecord.image_id == image_id).first()

    verdict = record.verdict or compute_verdict(record.deepfake_score, len(record.suspicious_flags or []), 0)
    evidence = _build_evidence_summary(record)
    
    # Mock custody chain (v1.0)
    custody = [
        {"step": 1, "action": "Image Uploaded", "timestamp": record.analyzed_at.isoformat(), "agent": "FakeLineage System"},
        {"step": 2, "action": "Analysis Completed", "timestamp": record.analyzed_at.isoformat(), "agent": "ForensicsEngine V1.5"}
    ]

    report = ForensicsReport(
        report_id=str(uuid.uuid4()),
        image_id=image_id,
        generated_at=datetime.utcnow().isoformat(),
        deepfake_analysis={
            "overall_score": record.deepfake_score,
            "gan_artifact_score": record.gan_score,
            "ela_score": record.ela_score,
            "face_swap_score": record.face_swap_score,
            "compression_inconsistency": 0.0, # Not in DB, setting default
            "noise_inconsistency": 0.0,       # Not in DB, setting default
            "is_deepfake": record.is_deepfake,
            "confidence_label": "High" if record.is_deepfake else "Low"
        },
        metadata_analysis={
            "image_id": image_id,
            "has_exif": record.has_exif,
            "camera_make": record.camera_make,
            "camera_model": record.camera_model,
            "software": None,
            "datetime_original": None,
            "gps_latitude": None,
            "gps_longitude": None,
            "image_width": record.image_width,
            "image_height": record.image_height,
            "color_space": "RGB",
            "compression_quality": 90,
            "steganography_detected": record.stego_detected,
            "lsb_anomaly_score": 0.0,
            "metadata_stripped": not record.has_exif,
            "consistency_score": 0.8,
            "suspicious_flags": record.suspicious_flags or []
        },
        provenance_graph=prov_record.graph_data if (prov_record and prov_record.graph_data) else {
            "image_id": image_id,
            "root_node_id": "root",
            "nodes": [],
            "edges": [],
            "total_versions": 0,
            "spread_depth": 0,
            "integrity_score": 1.0,
            "chain_broken": False
        },
        social_spread=social_record.spread_data if (social_record and social_record.spread_data) else {
            "image_id": image_id,
            "platforms": [],
            "total_reach": 0,
            "viral_coefficient": 0.0,
            "spread_timeline": [],
            "first_seen": record.analyzed_at.isoformat(),
            "peak_spread_time": record.analyzed_at.isoformat()
        },
        manipulation_regions=[], # Not stored in DB to save space
        overall_authenticity_score=round(1.0 - record.deepfake_score, 4),
        verdict=verdict,
        evidence_summary=evidence,
        chain_of_custody=custody
    )
    return report


@router.get("/pdf/{image_id}")
async def download_pdf_report(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate and return a professional PDF forensics report."""
    report = await get_report(image_id, db, current_user)
    
    pdf_dir = "temp_reports"
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_path = os.path.join(pdf_dir, f"report_{image_id}.pdf")
    
    generate_forensics_pdf(report.dict(), pdf_path)
    
    return FileResponse(
        pdf_path, 
        media_type="application/pdf", 
        filename=f"FakeLineage_Report_{image_id}.pdf"
    )


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dashboard statistics from MySQL for the current user."""
    total = db.query(AnalysisRecord).filter(AnalysisRecord.user_id == current_user.id).count()
    deepfakes = db.query(AnalysisRecord).filter(
        AnalysisRecord.user_id == current_user.id,
        AnalysisRecord.is_deepfake == True
    ).count()
    
    suspicious = db.query(AnalysisRecord).filter(
        AnalysisRecord.user_id == current_user.id,
        AnalysisRecord.deepfake_score >= 0.32,
        AnalysisRecord.deepfake_score < 0.50
    ).count()
    
    authentic = db.query(AnalysisRecord).filter(
        AnalysisRecord.user_id == current_user.id,
        AnalysisRecord.deepfake_score < 0.32
    ).count()

    avg_score = db.query(func.avg(AnalysisRecord.deepfake_score)).filter(
        AnalysisRecord.user_id == current_user.id
    ).scalar() or 0.1
    avg_integrity = round(1.0 - float(avg_score), 4)

    recent_records = db.query(AnalysisRecord).filter(
        AnalysisRecord.user_id == current_user.id
    ).order_by(AnalysisRecord.analyzed_at.desc()).limit(5).all()

    recent = [
        {
            "image_id": r.image_id,
            "filename": r.filename,
            "upload_time": r.analyzed_at.isoformat(),
            "verdict": r.verdict or "Pending"
        }
        for r in recent_records
    ]

    # Provenance Graph nodes count
    total_nodes = db.query(func.sum(ProvenanceRecord.node_count)).filter(
        ProvenanceRecord.user_id == current_user.id
    ).scalar() or 0

    return DashboardStats(
        total_analyses=total,
        deepfakes_detected=deepfakes,
        authentic_images=authentic,
        suspicious_images=suspicious,
        total_nodes_in_graphs=int(total_nodes),
        average_integrity_score=avg_integrity,
        platforms_tracked=8,
        recent_analyses=recent
    )
