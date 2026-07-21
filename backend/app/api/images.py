from fastapi import APIRouter, HTTPException
from app.models.image import ImageRequest, ImageResponse
from app.services.image_service import generate_image

router = APIRouter(prefix="/api", tags=["images"])


@router.post("/images", response_model=ImageResponse)
async def create_image(request: ImageRequest):
    if len(request.prompt.strip()) < 10:
        raise HTTPException(status_code=400, detail="Prompt must be at least 10 characters")

    try:
        image_url = await generate_image(request.prompt)
        return ImageResponse(image_url=image_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
