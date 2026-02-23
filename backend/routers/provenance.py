from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from models.schemas import ProvenanceGraph
from models.db_models import User, AnalysisRecord, ProvenanceRecord
from services.graph import build_provenance_graph
from database import get_db
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/provenance", tags=["Provenance Graph"])


@router.get("/graph/{image_id}", response_model=ProvenanceGraph)
async def get_provenance_graph(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Build and return the provenance graph for an image."""
    record = db.query(AnalysisRecord).filter(
        AnalysisRecord.image_id == image_id,
        AnalysisRecord.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Image record not found")

    metadata = {
        "image_id": image_id,
        "filename": record.filename,
        "upload_time": record.analyzed_at.isoformat(),
        "phash": record.phash,
        "deepfake_score": record.deepfake_score,
    }

    graph = build_provenance_graph(image_id, metadata)

    # Persistence
    prov_record = db.query(ProvenanceRecord).filter(ProvenanceRecord.image_id == image_id).first()
    if not prov_record:
        prov_record = ProvenanceRecord(
            user_id=current_user.id,
            image_id=image_id
        )
        db.add(prov_record)
        
    prov_record.node_count = len(graph.nodes)
    prov_record.edge_count = len(graph.edges)
    prov_record.integrity_score = graph.integrity_score
    prov_record.graph_data = graph.dict()
    db.commit()

    return graph


@router.get("/nodes/{image_id}")
async def get_graph_nodes(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get only the nodes of the provenance graph."""
    prov_record = db.query(ProvenanceRecord).filter(
        ProvenanceRecord.image_id == image_id,
        ProvenanceRecord.user_id == current_user.id
    ).first()
    
    if not prov_record or not prov_record.graph_data:
        raise HTTPException(status_code=400, detail="Run /graph/{image_id} first")
    return prov_record.graph_data["nodes"]


@router.get("/integrity/{image_id}")
async def get_integrity_score(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return the provenance chain integrity score."""
    prov_record = db.query(ProvenanceRecord).filter(
        ProvenanceRecord.image_id == image_id,
        ProvenanceRecord.user_id == current_user.id
    ).first()
    
    if not prov_record or not prov_record.graph_data:
        raise HTTPException(status_code=400, detail="Run /graph/{image_id} first")
    
    pg = prov_record.graph_data
    return {
        "image_id": image_id,
        "integrity_score": pg.get("integrity_score"),
        "chain_broken": pg.get("chain_broken"),
        "total_versions": pg.get("total_versions"),
        "spread_depth": pg.get("spread_depth"),
    }
