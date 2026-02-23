from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from models.schemas import SocialSpreadGraph
from models.db_models import User, AnalysisRecord, SocialRecord
from services.social import simulate_social_spread
from database import get_db
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/social", tags=["Social Spread"])


@router.get("/spread/{image_id}", response_model=SocialSpreadGraph)
async def get_social_spread(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Simulate and persist social spread data."""
    record = db.query(AnalysisRecord).filter(
        AnalysisRecord.image_id == image_id,
        AnalysisRecord.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Image record not found")

    base_time = record.analyzed_at
    spread = simulate_social_spread(image_id, record.deepfake_score, base_time)

    # Persistence
    social_record = db.query(SocialRecord).filter(SocialRecord.image_id == image_id).first()
    if not social_record:
        social_record = SocialRecord(
            user_id=current_user.id,
            image_id=image_id
        )
        db.add(social_record)
        
    social_record.total_reach = spread.total_reach
    social_record.viral_coefficient = spread.viral_coefficient
    social_record.platforms = spread.platforms
    social_record.bot_ratio = 0.12 # Mocking bot ratio for now
    social_record.spread_data = spread.dict()
    db.commit()

    return spread


@router.get("/timeline/{image_id}")
async def get_spread_timeline(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get spread timeline from DB."""
    social_record = db.query(SocialRecord).filter(
        SocialRecord.image_id == image_id,
        SocialRecord.user_id == current_user.id
    ).first()
    
    if not social_record or not social_record.spread_data:
        raise HTTPException(status_code=400, detail="Run /spread/{image_id} first")
        
    return {
        "image_id": image_id,
        "timeline": social_record.spread_data["spread_timeline"],
        "viral_coefficient": social_record.viral_coefficient,
    }


@router.get("/platforms/{image_id}")
async def get_platforms(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get platforms data from DB."""
    social_record = db.query(SocialRecord).filter(
        SocialRecord.image_id == image_id,
        SocialRecord.user_id == current_user.id
    ).first()
    
    if not social_record or not social_record.spread_data:
        raise HTTPException(status_code=400, detail="Run /spread/{image_id} first")
        
    ss = social_record.spread_data
    return {
        "image_id": image_id,
        "platforms": ss["platforms"],
        "total_reach": ss["total_reach"],
        "first_seen": ss["first_seen"],
        "peak_spread_time": ss["peak_spread_time"],
    }
