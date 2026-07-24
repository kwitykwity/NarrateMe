import os
import logging
import asyncio
from elevenlabs import VoiceSettings
from elevenlabs.client import AsyncElevenLabs
from elevenlabs.core.api_error import ApiError

logger = logging.getLogger(__name__)

# One word's playback window, derived from ElevenLabs' per-character alignment.
WordTiming = dict[str, object]  # {"word": str, "start": float, "end": float}

# "Sarah" - a soft, warm premade voice that suits children's narration and is
# available on free-tier accounts (library voices require a paid plan).
DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"
DEFAULT_MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "mp3_44100_128"

# Narration playback speed. ElevenLabs accepts 0.7-1.2 (1.0 = normal); 0.9
# reads slightly slower so early readers (grades 1-3) can follow along, per the
# PRD's "warm, slower-paced voice" requirement.
NARRATION_SPEED = 0.9

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


def _aggregate_words(characters, starts, ends) -> list[WordTiming]:
    """Collapse per-character alignment into whitespace-delimited word timings.

    Each word's start is the start time of its first character and its end is the
    end time of its last, so the words line up with the same text split on
    whitespace in the UI.
    """
    words: list[WordTiming] = []
    cur: list[str] = []
    cur_start: float | None = None
    cur_end: float | None = None
    for ch, start, end in zip(characters, starts, ends):
        if ch.isspace():
            if cur:
                words.append({"word": "".join(cur), "start": cur_start, "end": cur_end})
                cur, cur_start, cur_end = [], None, None
        else:
            if not cur:
                cur_start = start
            cur.append(ch)
            cur_end = end
    if cur:
        words.append({"word": "".join(cur), "start": cur_start, "end": cur_end})
    return words


async def generate_narration(
    text: str, timeout_seconds: int = 60
) -> tuple[str, list[WordTiming]]:
    logger.info(f"Starting narration generation. Text length: {len(text)} chars")
    logger.debug(f"Narration text: {text[:100]}...")

    client = get_client()

    async def _call():
        logger.info("Calling ElevenLabs text_to_speech.convert_with_timestamps API...")
        return await client.text_to_speech.convert_with_timestamps(
            DEFAULT_VOICE_ID,
            text=text,
            model_id=DEFAULT_MODEL_ID,
            output_format=OUTPUT_FORMAT,
            voice_settings=VoiceSettings(speed=NARRATION_SPEED),
        )

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            resp = await asyncio.wait_for(_call(), timeout=timeout_seconds)

            if not resp.audio_base_64:
                logger.error("No audio data in response")
                raise ValueError("No audio data returned")

            word_timings: list[WordTiming] = []
            if resp.alignment:
                word_timings = _aggregate_words(
                    resp.alignment.characters,
                    resp.alignment.character_start_times_seconds,
                    resp.alignment.character_end_times_seconds,
                )

            logger.info(
                f"Narration audio received. Base64 length: {len(resp.audio_base_64)}, "
                f"words: {len(word_timings)}"
            )
            # audio_base_64 is already base64-encoded, so embed it directly.
            audio_url = f"data:audio/mpeg;base64,{resp.audio_base_64}"
            return audio_url, word_timings

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
