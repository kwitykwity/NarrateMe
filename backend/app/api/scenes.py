from fastapi import APIRouter, HTTPException
from app.models.scene import StoryRequest, SceneResponse
from app.services.scene_service import split_story_into_scenes

router = APIRouter(prefix="/api", tags=["scenes"])


@router.post("/scenes", response_model=SceneResponse)
async def create_scenes(request: StoryRequest):
    if len(request.story.strip()) < 50:
        raise HTTPException(status_code=400, detail="Story must be at least 50 characters")

    try:
        scenes = await split_story_into_scenes(request.story)
        return scenes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
