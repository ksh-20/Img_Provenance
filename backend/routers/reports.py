"""
Reports router — generates comprehensive forensics reports with evidence chains.
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from models.schemas import ForensicsReport, DashboardStats

from routers.analysis import get_analysis_store

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def _compute_verdict(deepfake_score: dict, metadata: dict, manipulation_regions: list) -> str:
    score = deepfake_score.get("overall_score", 0)
    if score >= 0.75:
        return "DEEPFAKE"
    elif score >= 0.5 or len(manipulation_regions) >= 5:
        return "MANIPULATED"
    elif score >= 0.3 or not metadata.get("has_exif"):
        return "SUSPICIOUS"
    else:
        return "AUTHENTIC"


def _build_evidence_summary(data: dict) -> list[str]:
    evidence = []
    df = data.get("deepfake_score", {})
    meta = data.get("metadata", {})
    regions = data.get("manipulation_regions", [])

    if df.get("overall_score", 0) > 0.5:
        evidence.append(f"Deepfake confidence score: {df['overall_score']:.2%} — classified as {df.get('confidence_label', 'Unknown')}")
    if df.get("ela_score", 0) > 0.3:
        evidence.append(f"Error Level Analysis detected elevated manipulation score: {df['ela_score']:.2%}")
    if df.get("gan_artifact_score", 0) > 0.3:
        evidence.append(f"GAN artifact fingerprints detected in frequency domain (score: {df['gan_artifact_score']:.2%})")
    if df.get("noise_inconsistency", 0) > 0.3:
        evidence.append("Noise inconsistency across image blocks suggests compositing")
    if meta.get("steganography_detected"):
        evidence.append(f"Steganographic content detected (LSB anomaly: {meta.get('lsb_anomaly_score', 0):.2%})")
    if meta.get("metadata_stripped"):
        evidence.append("EXIF metadata completely stripped — common in images shared after editing")
    for flag in meta.get("suspicious_flags", []):
        evidence.append(flag)
    if regions:
        evidence.append(f"{len(regions)} suspicious manipulation region(s) identified via ELA")
    if not evidence:
        evidence.append("No significant manipulation indicators detected")
    return evidence


def _build_chain_of_custody(data: dict, image_id: str) -> list[dict]:
    chain = [
        {"step": 1, "action": "Image Uploaded", "timestamp": data.get("upload_time"), "agent": "FakeLineage System"},
        {"step": 2, "action": "Perceptual Hashing", "timestamp": data.get("analyzed_at"), "agent": "HashingService"},
        {"step": 3, "action": "ELA Forensic Analysis", "timestamp": data.get("analyzed_at"), "agent": "ForensicsService"},
        {"step": 4, "action": "Deepfake Detection Pipeline", "timestamp": data.get("analyzed_at"), "agent": "DeepfakeService"},
        {"step": 5, "action": "Metadata Extraction & Consistency Check", "timestamp": data.get("analyzed_at"), "agent": "MetadataService"},
        {"step": 6, "action": "Provenance Graph Construction", "timestamp": data.get("analyzed_at"), "agent": "GraphService"},
        {"step": 7, "action": "Social Spread Simulation", "timestamp": data.get("analyzed_at"), "agent": "SocialService"},
        {"step": 8, "action": "Report Generated", "timestamp": datetime.utcnow().isoformat(), "agent": "ReportService"},
    ]
    return chain


@router.get("/{image_id}", response_model=ForensicsReport)
async def get_report(image_id: str):
    store = get_analysis_store()
    if image_id not in store:
        raise HTTPException(status_code=404, detail="Image not found")

    data = store[image_id]
    if "deepfake_score" not in data:
        raise HTTPException(status_code=400, detail="Image not yet analyzed. POST /api/images/analyze first.")

    report_id = str(uuid.uuid4())
    deepfake_score = data["deepfake_score"]
    metadata = data.get("metadata", {})
    manipulation_regions = data.get("manipulation_regions", [])
    provenance_graph = data.get("provenance_graph")
    social_spread = data.get("social_spread")

    if not provenance_graph or not social_spread:
        raise HTTPException(
            status_code=400,
            detail="Complete provenance graph and social spread analysis first."
        )

    verdict = _compute_verdict(deepfake_score, metadata, manipulation_regions)
    evidence = _build_evidence_summary(data)
    custody = _build_chain_of_custody(data, image_id)

    authenticity_score = 1.0 - deepfake_score.get("overall_score", 0.5)

    report = ForensicsReport(
        report_id=report_id,
        image_id=image_id,
        generated_at=datetime.utcnow().isoformat(),
        deepfake_analysis=deepfake_score,
        metadata_analysis=metadata,
        provenance_graph=provenance_graph,
        social_spread=social_spread,
        manipulation_regions=manipulation_regions,
        overall_authenticity_score=round(authenticity_score, 4),
        verdict=verdict,
        evidence_summary=evidence,
        chain_of_custody=custody
    )

    store[image_id]["report"] = report.dict()
    return report


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Dashboard statistics across all analyzed images."""
    store = get_analysis_store()
    total = len(store)
    deepfakes = sum(1 for v in store.values() if v.get("deepfake_score", {}).get("is_deepfake"))
    suspicious = sum(1 for v in store.values()
                     if 0.3 <= v.get("deepfake_score", {}).get("overall_score", 0) < 0.5)
    authentic = sum(1 for v in store.values()
                    if v.get("deepfake_score", {}).get("overall_score", 0) < 0.3)

    scores = [v["deepfake_score"]["overall_score"] for v in store.values() if "deepfake_score" in v]
    avg_integrity = round(1.0 - (sum(scores) / len(scores)) if scores else 0.9, 4)

    recent = sorted(
        [{"image_id": k, "filename": v.get("filename"), "upload_time": v.get("upload_time"),
          "verdict": v.get("report", {}).get("verdict", "Pending")}
         for k, v in store.items()],
        key=lambda x: x.get("upload_time", ""),
        reverse=True
    )[:5]

    return DashboardStats(
        total_analyses=total,
        deepfakes_detected=deepfakes,
        authentic_images=authentic,
        suspicious_images=suspicious,
        total_nodes_in_graphs=sum(
            len(v.get("provenance_graph", {}).get("nodes", [])) for v in store.values()
        ),
        average_integrity_score=avg_integrity,
        platforms_tracked=8,
        recent_analyses=recent
    )
