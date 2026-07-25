import logging
from pydantic import BaseModel
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["stats"])

class StatsResponse(BaseModel):
    stories_created: int
    teacher_rating: float
    seconds_to_first_story: int

@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    logger.info("GET /api/stats - Fetching platform statistics")
    return StatsResponse(
        stories_created=500,
        teacher_rating=4.9,
        seconds_to_first_story=60
    )
