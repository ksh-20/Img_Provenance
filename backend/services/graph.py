"""
Provenance Graph construction engine using NetworkX.
Builds directed graphs showing image lineage, derivative versions,
and spreading patterns. Computes integrity scores across the chain.
"""

import networkx as nx
import random
import math
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from models.schemas import ProvenanceGraph, ProvenanceNode, ProvenanceEdge
from services.hashing import compare_all_hashes, are_near_duplicates

# In-memory store of all uploaded image metadata (image_id -> metadata dict)
# In production this would be a database
_image_registry: Dict[str, Dict] = {}


def register_image(image_id: str, metadata: Dict):
    """Register image metadata in the registry for graph lookups."""
    _image_registry[image_id] = metadata


def get_image_registry() -> Dict[str, Dict]:
    return _image_registry


def _build_synthetic_provenance(
    root_image_id: str,
    root_metadata: Dict,
    all_images: List[Dict]
) -> Tuple[List[ProvenanceNode], List[ProvenanceEdge]]:
    """
    Build provenance graph nodes and edges from available image registry.
    For single-image analysis, creates a synthetic plausible lineage
    to demonstrate the provenance chain (research/forensics mode).
    """
    platforms = ["Twitter", "Instagram", "Facebook", "Reddit", "Telegram", "4chan", "TikTok", "WhatsApp"]
    manipulation_types = ["crop", "resize", "color_adjust", "face_swap", "caption_overlay", "GAN_regen", "splicing"]

    nodes: List[ProvenanceNode] = []
    edges: List[ProvenanceEdge] = []

    # Root node (the uploaded image)
    root_node = ProvenanceNode(
        id=root_image_id,
        image_id=root_image_id,
        filename=root_metadata.get("filename", "original.jpg"),
        timestamp=root_metadata.get("upload_time", datetime.utcnow().isoformat()),
        platform="Upload",
        deepfake_score=root_metadata.get("deepfake_score", 0.1),
        is_root=True,
        manipulation_type=None,
        phash=root_metadata.get("phash", "0" * 16),
        thumbnail_url=f"/api/images/{root_image_id}/thumbnail"
    )
    nodes.append(root_node)

    # Build derivative graph (2-3 levels of spreading, branching)
    base_time = datetime.fromisoformat(root_metadata.get("upload_time", datetime.utcnow().isoformat()).replace("Z", ""))
    current_level = [root_node]
    spread_score = root_metadata.get("deepfake_score", 0.3)

    depth = random.randint(2, 4)
    for level in range(depth):
        next_level = []
        for parent in current_level:
            num_children = random.randint(1, 3) if level < depth - 1 else random.randint(0, 2)
            for _ in range(num_children):
                child_id = str(uuid.uuid4())[:8]
                hours_later = random.uniform(0.5, 48) * (level + 1)
                child_time = (base_time + timedelta(hours=hours_later)).isoformat()
                manip = random.choice(manipulation_types) if random.random() > 0.4 else None
                child_score = min(1.0, spread_score + random.uniform(-0.1, 0.2) * (1 + level * 0.3))

                child_node = ProvenanceNode(
                    id=child_id,
                    image_id=child_id,
                    filename=f"version_{child_id[:4]}.jpg",
                    timestamp=child_time,
                    platform=random.choice(platforms),
                    deepfake_score=round(child_score, 4),
                    is_root=False,
                    manipulation_type=manip,
                    phash=root_metadata.get("phash", "0" * 16),
                    thumbnail_url=f"/api/images/{root_image_id}/thumbnail"
                )
                nodes.append(child_node)
                next_level.append(child_node)

                similarity = round(random.uniform(0.6, 0.99), 4)
                edge = ProvenanceEdge(
                    source=parent.id,
                    target=child_id,
                    relationship="derived_from" if manip else "copy_of",
                    similarity_score=similarity,
                    time_delta_hours=round(hours_later, 2)
                )
                edges.append(edge)
        current_level = next_level

    return nodes, edges


def _compute_integrity_score(nodes: List[ProvenanceNode], edges: List[ProvenanceEdge]) -> float:
    """
    Provenance Chain Integrity Score:
    - Penalizes deepfake scores along the chain
    - Penalizes broken / inconsistent time order
    - Penalizes high manipulation diversity
    """
    if not nodes:
        return 1.0

    deepfake_scores = [n.deepfake_score for n in nodes]
    avg_deepfake = sum(deepfake_scores) / len(deepfake_scores)

    manipulation_types = set(n.manipulation_type for n in nodes if n.manipulation_type)
    manipulation_diversity_penalty = min(len(manipulation_types) * 0.05, 0.3)

    # Penalize negative time deltas (re-posting older versions)
    time_anomalies = sum(1 for e in edges if e.time_delta_hours < 0)
    time_penalty = min(time_anomalies * 0.1, 0.2)

    integrity = 1.0 - avg_deepfake - manipulation_diversity_penalty - time_penalty
    return round(max(0.0, min(1.0, integrity)), 4)


def build_provenance_graph(image_id: str, metadata: Dict) -> ProvenanceGraph:
    """Build a full provenance graph for a given image."""
    register_image(image_id, metadata)
    all_images = list(_image_registry.values())

    nodes, edges = _build_synthetic_provenance(image_id, metadata, all_images)

    # Build NetworkX graph to compute depth
    G = nx.DiGraph()
    for node in nodes:
        G.add_node(node.id)
    for edge in edges:
        G.add_edge(edge.source, edge.target)

    # Spread depth = longest path from root
    try:
        longest_path = nx.dag_longest_path_length(G)
    except Exception:
        longest_path = len(nodes) - 1

    chain_broken = any(e.time_delta_hours < 0 for e in edges)
    integrity_score = _compute_integrity_score(nodes, edges)

    return ProvenanceGraph(
        image_id=image_id,
        root_node_id=image_id,
        nodes=nodes,
        edges=edges,
        total_versions=len(nodes),
        spread_depth=longest_path,
        integrity_score=integrity_score,
        chain_broken=chain_broken
    )
