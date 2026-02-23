"""
Social spread router — returns simulated social media propagation data.
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException
from models.schemas import SocialSpreadGraph
from services.social import simulate_social_spread
from routers.analysis import get_analysis_store

router = APIRouter(prefix="/api/social", tags=["Social Spread"])


@router.get("/spread/{image_id}", response_model=SocialSpreadGraph)
async def get_social_spread(image_id: str):
    store = get_analysis_store()
    if image_id not in store:
        raise HTTPException(status_code=404, detail="Image not found")

    data = store[image_id]
    deepfake_score = 0.2
    if "deepfake_score" in data:
        deepfake_score = data["deepfake_score"].get("overall_score", 0.2)

    base_time = datetime.fromisoformat(data.get("upload_time", datetime.utcnow().isoformat()))
    spread = simulate_social_spread(image_id, deepfake_score, base_time)

    store[image_id]["social_spread"] = spread.dict()
    return spread


@router.get("/timeline/{image_id}")
async def get_spread_timeline(image_id: str):
    store = get_analysis_store()
    if image_id not in store or "social_spread" not in store[image_id]:
        raise HTTPException(status_code=400, detail="Run /spread first")
    return {
        "image_id": image_id,
        "timeline": store[image_id]["social_spread"]["spread_timeline"],
        "viral_coefficient": store[image_id]["social_spread"]["viral_coefficient"],
    }


@router.get("/platforms/{image_id}")
async def get_platforms(image_id: str):
    store = get_analysis_store()
    if image_id not in store or "social_spread" not in store[image_id]:
        raise HTTPException(status_code=400, detail="Run /spread first")
    ss = store[image_id]["social_spread"]
    return {
        "image_id": image_id,
        "platforms": ss["platforms"],
        "total_reach": ss["total_reach"],
        "first_seen": ss["first_seen"],
        "peak_spread_time": ss["peak_spread_time"],
    }
