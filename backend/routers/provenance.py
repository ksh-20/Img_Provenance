"""
Provenance graph router — builds and returns image lineage graphs.
"""

from fastapi import APIRouter, HTTPException
from models.schemas import ProvenanceGraph
from services.graph import build_provenance_graph
from routers.analysis import get_analysis_store

router = APIRouter(prefix="/api/provenance", tags=["Provenance Graph"])


@router.get("/graph/{image_id}", response_model=ProvenanceGraph)
async def get_provenance_graph(image_id: str):
    """Build and return the provenance graph for an image."""
    store = get_analysis_store()
    if image_id not in store:
        raise HTTPException(status_code=404, detail="Image not found")

    data = store[image_id]
    deepfake_score = 0.1
    if "deepfake_score" in data:
        deepfake_score = data["deepfake_score"].get("overall_score", 0.1)

    metadata = {
        "image_id": image_id,
        "filename": data.get("filename", "image.jpg"),
        "upload_time": data.get("upload_time"),
        "phash": data.get("hashes", {}).get("phash", "0" * 16),
        "deepfake_score": deepfake_score,
    }

    graph = build_provenance_graph(image_id, metadata)

    # Cache in store
    store[image_id]["provenance_graph"] = graph.dict()
    return graph


@router.get("/nodes/{image_id}")
async def get_graph_nodes(image_id: str):
    """Get only the nodes of the provenance graph."""
    store = get_analysis_store()
    if image_id not in store or "provenance_graph" not in store[image_id]:
        raise HTTPException(status_code=400, detail="Run /graph first")
    return store[image_id]["provenance_graph"]["nodes"]


@router.get("/integrity/{image_id}")
async def get_integrity_score(image_id: str):
    """Return the provenance chain integrity score."""
    store = get_analysis_store()
    if image_id not in store or "provenance_graph" not in store[image_id]:
        raise HTTPException(status_code=400, detail="Run /graph first")
    pg = store[image_id]["provenance_graph"]
    return {
        "image_id": image_id,
        "integrity_score": pg.get("integrity_score"),
        "chain_broken": pg.get("chain_broken"),
        "total_versions": pg.get("total_versions"),
        "spread_depth": pg.get("spread_depth"),
    }
