import logging
from pydantic import BaseModel
from fastapi import APIRouter

from app.services.landing_page_service import get_stats_snapshot

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["stats"])

class StatsResponse(BaseModel):
    stories_created: int
    subscribers: int
    teacher_rating: float
    seconds_to_first_story: int

@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    logger.info("GET /api/stats - Fetching platform statistics")
    snapshot = get_stats_snapshot()
    return StatsResponse(**snapshot)
