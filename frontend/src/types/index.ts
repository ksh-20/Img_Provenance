// API types mirroring backend Pydantic schemas

export interface ImageUploadResponse {
  image_id: string;
  filename: string;
  file_size: number;
  upload_time: string;
  width: number;
  height: number;
  format: string;
  phash: string;
  dhash: string;
  ahash: string;
}

export interface DeepfakeScore {
  overall_score: number;
  face_swap_score: number;
  gan_artifact_score: number;
  compression_inconsistency: number;
  noise_inconsistency: number;
  ela_score: number;
  is_deepfake: boolean;
  confidence_label: string;
  model_version: string;
}

export interface ManipulationRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  type: string;
}

export interface MetadataAnalysis {
  image_id: string;
  has_exif: boolean;
  camera_make: string | null;
  camera_model: string | null;
  software: string | null;
  datetime_original: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  image_width: number | null;
  image_height: number | null;
  color_space: string | null;
  compression_quality: number | null;
  steganography_detected: boolean;
  lsb_anomaly_score: number;
  metadata_stripped: boolean;
  consistency_score: number;
  suspicious_flags: string[];
}

export interface ProvenanceNode {
  id: string;
  image_id: string;
  filename: string;
  timestamp: string;
  platform: string;
  deepfake_score: number;
  is_root: boolean;
  manipulation_type: string | null;
  phash: string;
  thumbnail_url: string;
}

export interface ProvenanceEdge {
  source: string;
  target: string;
  relationship: string;
  similarity_score: number;
  time_delta_hours: number;
}

export interface ProvenanceGraph {
  image_id: string;
  root_node_id: string;
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
  total_versions: number;
  spread_depth: number;
  integrity_score: number;
  chain_broken: boolean;
}

export interface SocialSpreadNode {
  platform: string;
  account_id: string;
  account_name: string;
  timestamp: string;
  shares: number;
  likes: number;
  reach: number;
  deepfake_score: number;
  is_bot: boolean;
}

export interface SocialSpreadGraph {
  image_id: string;
  platforms: string[];
  total_reach: number;
  viral_coefficient: number;
  spread_timeline: SocialSpreadNode[];
  first_seen: string;
  peak_spread_time: string;
}

export interface ForensicsReport {
  report_id: string;
  image_id: string;
  generated_at: string;
  deepfake_analysis: DeepfakeScore;
  metadata_analysis: MetadataAnalysis;
  provenance_graph: ProvenanceGraph;
  social_spread: SocialSpreadGraph;
  manipulation_regions: ManipulationRegion[];
  overall_authenticity_score: number;
  verdict: 'AUTHENTIC' | 'SUSPICIOUS' | 'MANIPULATED' | 'DEEPFAKE';
  evidence_summary: string[];
  chain_of_custody: Array<{ step: number; action: string; timestamp: string; agent: string }>;
}

export interface AnalysisResult {
  image_id: string;
  verdict: 'AUTHENTIC' | 'SUSPICIOUS' | 'MANIPULATED' | 'DEEPFAKE';
  deepfake_score: DeepfakeScore;
  ela_map: number[][];
  metadata: MetadataAnalysis;
  manipulation_regions: ManipulationRegion[];
  analyzed_at: string;
}

export interface DashboardStats {
  total_analyses: number;
  deepfakes_detected: number;
  authentic_images: number;
  suspicious_images: number;
  total_nodes_in_graphs: number;
  average_integrity_score: number;
  platforms_tracked: number;
  recent_analyses: Array<{ image_id: string; filename: string; upload_time: string; verdict: string }>;
}
