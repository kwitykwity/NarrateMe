import logging
from fastapi import APIRouter, HTTPException
from app.models.owl import OwlRequest, OwlResponse
from app.services.owl_service import generate_owl

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["owl"])


@router.post("/owl", response_model=OwlResponse)
async def create_owl(request: OwlRequest):
    logger.info(f"POST /api/owl - Received request for emotion: {request.emotion}")

    try:
        image_url = await generate_owl(request.emotion)
        logger.info("Owl generation successful")
        return OwlResponse(image_url=image_url)
    except TimeoutError as e:
        logger.error(f"Owl generation timeout: {e}")
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:
        logger.error(f"Owl generation error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate owl")
