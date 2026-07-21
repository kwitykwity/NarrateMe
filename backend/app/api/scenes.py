import logging
from fastapi import APIRouter, HTTPException
from app.models.scene import StoryRequest, SceneResponse
from app.services.scene_service import split_story_into_scenes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["scenes"])


@router.post("/scenes", response_model=SceneResponse)
async def create_scenes(request: StoryRequest):
    logger.info(f"POST /api/scenes - Received request with story length: {len(request.story)}")

    if len(request.story.strip()) < 50:
        logger.warning("Story too short, returning 400")
        raise HTTPException(status_code=400, detail="Story must be at least 50 characters")

    try:
        scenes = await split_story_into_scenes(request.story)
        logger.info(f"Scene splitting successful. Generated {len(scenes.scenes)} scenes")
        return scenes
    except TimeoutError as e:
        logger.error(f"Scene splitting timeout: {e}")
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:
        logger.error(f"Scene splitting error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Failed to split story into scenes")
