import os
import base64
import logging
import asyncio
from elevenlabs.client import AsyncElevenLabs
from elevenlabs.core.api_error import ApiError

logger = logging.getLogger(__name__)

# "Sarah" - a soft, warm premade voice that suits children's narration and is
# available on free-tier accounts (library voices require a paid plan).
DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"
DEFAULT_MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "mp3_44100_128"

# ElevenLabs' free tier caps concurrent requests; bursts return 429
# concurrent_limit_exceeded. Retry a few times with a short backoff so a
# transient concurrency spike doesn't fail the whole narration.
MAX_ATTEMPTS = 4
RETRY_BACKOFF_SECONDS = 1.5


def get_client():
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        logger.error("ELEVENLABS_API_KEY environment variable not set")
        raise ValueError("ELEVENLABS_API_KEY environment variable not set")
    logger.debug("ElevenLabs client initialized")
    return AsyncElevenLabs(api_key=api_key)


async def generate_narration(text: str, timeout_seconds: int = 60) -> str:
    logger.info(f"Starting narration generation. Text length: {len(text)} chars")
    logger.debug(f"Narration text: {text[:100]}...")

    client = get_client()

    async def _collect() -> bytes:
        logger.info("Calling ElevenLabs text_to_speech.convert API...")
        chunks: list[bytes] = []
        async for chunk in client.text_to_speech.convert(
            DEFAULT_VOICE_ID,
            text=text,
            model_id=DEFAULT_MODEL_ID,
            output_format=OUTPUT_FORMAT,
        ):
            if chunk:
                chunks.append(chunk)
        return b"".join(chunks)

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            audio_bytes = await asyncio.wait_for(_collect(), timeout=timeout_seconds)

            if not audio_bytes:
                logger.error("No audio data in response")
                raise ValueError("No audio data returned")

            logger.info(f"Narration audio received. Size: {len(audio_bytes)} bytes")
            b64 = base64.b64encode(audio_bytes).decode("ascii")
            return f"data:audio/mpeg;base64,{b64}"

        except asyncio.TimeoutError:
            logger.error(f"Narration generation timed out after {timeout_seconds} seconds")
            raise TimeoutError(f"Narration generation timed out after {timeout_seconds} seconds")
        except ApiError as e:
            if e.status_code == 429 and attempt < MAX_ATTEMPTS:
                backoff = RETRY_BACKOFF_SECONDS * attempt
                logger.warning(
                    f"ElevenLabs 429 concurrent_limit_exceeded "
                    f"(attempt {attempt}/{MAX_ATTEMPTS}); retrying in {backoff}s"
                )
                await asyncio.sleep(backoff)
                continue
            logger.error(f"Narration generation failed: ApiError status={e.status_code}: {e.body}")
            raise
        except Exception as e:
            logger.error(f"Narration generation failed: {type(e).__name__}: {str(e)}")
            raise
