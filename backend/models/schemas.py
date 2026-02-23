from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class ImageUploadResponse(BaseModel):
    image_id: str
    filename: str
    file_size: int
    upload_time: str
    width: int
    height: int
    format: str
    phash: str
    dhash: str
    ahash: str


class DeepfakeScore(BaseModel):
    overall_score: float = Field(..., ge=0, le=1, description="0=real, 1=deepfake")
    face_swap_score: float
    gan_artifact_score: float
    compression_inconsistency: float
    noise_inconsistency: float
    ela_score: float
    is_deepfake: bool
    confidence_label: str  # "Very Low", "Low", "Medium", "High", "Very High"
    model_version: str = "FakeLineage-v1.0"


class ManipulationRegion(BaseModel):
    x: int
    y: int
    width: int
    height: int
    confidence: float
    type: str  # "splicing", "inpainting", "GAN", "copy-move"


class MetadataAnalysis(BaseModel):
    image_id: str
    has_exif: bool
    camera_make: Optional[str]
    camera_model: Optional[str]
    software: Optional[str]
    datetime_original: Optional[str]
    gps_latitude: Optional[float]
    gps_longitude: Optional[float]
    image_width: Optional[int]
    image_height: Optional[int]
    color_space: Optional[str]
    compression_quality: Optional[int]
    steganography_detected: bool
    lsb_anomaly_score: float
    metadata_stripped: bool
    consistency_score: float
    suspicious_flags: List[str]


class ProvenanceNode(BaseModel):
    id: str
    image_id: str
    filename: str
    timestamp: str
    platform: str
    deepfake_score: float
    is_root: bool
    manipulation_type: Optional[str]
    phash: str
    thumbnail_url: str


class ProvenanceEdge(BaseModel):
    source: str
    target: str
    relationship: str  # "derived_from", "similar_to", "copy_of"
    similarity_score: float
    time_delta_hours: float


class ProvenanceGraph(BaseModel):
    image_id: str
    root_node_id: str
    nodes: List[ProvenanceNode]
    edges: List[ProvenanceEdge]
    total_versions: int
    spread_depth: int
    integrity_score: float
    chain_broken: bool


class SocialSpreadNode(BaseModel):
    platform: str
    account_id: str
    account_name: str
    timestamp: str
    shares: int
    likes: int
    reach: int
    deepfake_score: float
    is_bot: bool


class SocialSpreadGraph(BaseModel):
    image_id: str
    platforms: List[str]
    total_reach: int
    viral_coefficient: float
    spread_timeline: List[SocialSpreadNode]
    first_seen: str
    peak_spread_time: str


class ForensicsReport(BaseModel):
    report_id: str
    image_id: str
    generated_at: str
    deepfake_analysis: DeepfakeScore
    metadata_analysis: MetadataAnalysis
    provenance_graph: ProvenanceGraph
    social_spread: SocialSpreadGraph
    manipulation_regions: List[ManipulationRegion]
    overall_authenticity_score: float
    verdict: str  # "AUTHENTIC", "SUSPICIOUS", "MANIPULATED", "DEEPFAKE"
    evidence_summary: List[str]
    chain_of_custody: List[Dict[str, Any]]


class BatchJob(BaseModel):
    job_id: str
    status: str  # "queued", "processing", "completed", "failed"
    total_images: int
    processed_images: int
    created_at: str
    completed_at: Optional[str]
    results: List[Dict[str, Any]]


class AnalysisRequest(BaseModel):
    image_id: str
    include_ela: bool = True
    include_social: bool = True
    generate_report: bool = True


class DashboardStats(BaseModel):
    total_analyses: int
    deepfakes_detected: int
    authentic_images: int
    suspicious_images: int
    total_nodes_in_graphs: int
    average_integrity_score: float
    platforms_tracked: int
    recent_analyses: List[Dict[str, Any]]
