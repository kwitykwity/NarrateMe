import logging
from fastapi import APIRouter, HTTPException
from app.models.audio import AudioRequest, AudioResponse
from app.services.audio_service import generate_narration

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["audio"])


@router.post("/audio", response_model=AudioResponse)
async def create_audio(request: AudioRequest):
    logger.info(f"POST /api/audio - Received request with text length: {len(request.text)}")

    if len(request.text.strip()) < 1:
        logger.warning("Text empty, returning 400")
        raise HTTPException(status_code=400, detail="Text must not be empty")

    try:
        audio_url = await generate_narration(request.text)
        logger.info("Narration generation successful")
        return AudioResponse(audio_url=audio_url)
    except TimeoutError as e:
        logger.error(f"Narration generation timeout: {e}")
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:
        logger.error(f"Narration generation error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate narration")
