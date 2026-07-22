"""Owl narrator avatar generation.

This module is intentionally self-contained so that a collaborator can refine the
owl mascot WITHOUT touching the scene-splitting, image, or audio pipelines.

To change how the owl looks or reacts, edit ONLY the two constants below:

  * OWL_BASE_PROMPT     - the owl's fixed appearance (species, glasses, style, framing).
  * EMOTION_EXPRESSIONS - how each story emotion maps to a facial expression / pose.

The emotion keys MUST match app.models.scene.VALID_EMOTIONS. If you add a new
emotion, add it in BOTH places (and teach the LLM about it in the scene_service
SYSTEM_PROMPT).
"""

import asyncio
import logging

from app.models.scene import DEFAULT_EMOTION, VALID_EMOTIONS
from app.services.image_service import IMAGE_QUALITY, IMAGE_SIZE, get_client

logger = logging.getLogger(__name__)


# --- EDIT HERE to refine the owl's fixed look ---------------------------------
# Everything that should stay constant across every scene lives here. Keep the
# framing (chest-up, facing forward, centered) so the owl reads well when the
# frontend clips it into a circular avatar badge at the bottom of a scene.
#
# NOTE: gpt-image-2 does NOT support transparent backgrounds, so we ask for a
# plain solid background and rely on the frontend to mask the owl into a circle.
OWL_BASE_PROMPT = (
    "A cute, friendly cartoon owl narrator wearing round glasses, "
    "children's storybook illustration style, soft warm colors, big expressive eyes, "
    "chest-up portrait facing forward, centered in frame, "
    "on a plain solid pale-cream background"
)

# --- EDIT HERE to refine per-emotion expressions ------------------------------
# Map each story emotion to a short phrase describing the owl's face/pose. These
# are appended to OWL_BASE_PROMPT. Keys must cover every emotion in
# app.models.scene.VALID_EMOTIONS.
EMOTION_EXPRESSIONS = {
    "happy": "smiling warmly with a joyful, cheerful expression",
    "sad": "with a gentle, downcast and sympathetic expression",
    "excited": "wide-eyed and grinning with an excited, surprised expression, wings raised",
    "scared": "with a worried, wide-eyed nervous expression",
    "calm": "with a calm, gentle and reassuring expression",
}

# Fail loudly at import time if the two vocabularies ever drift apart.
_missing = VALID_EMOTIONS - EMOTION_EXPRESSIONS.keys()
if _missing:
    raise RuntimeError(
        f"owl_service.EMOTION_EXPRESSIONS is missing emotions: {sorted(_missing)}"
    )


def build_owl_prompt(emotion: str) -> str:
    """Compose the full owl image prompt for a given scene emotion."""
    expression = EMOTION_EXPRESSIONS.get(emotion) or EMOTION_EXPRESSIONS[DEFAULT_EMOTION]
    return f"{OWL_BASE_PROMPT}, {expression}"


async def generate_owl(emotion: str, timeout_seconds: int = 120) -> str:
    """Generate an owl avatar image for the given emotion.

    Returns a data URL (or hosted URL) for the owl PNG. Raises TimeoutError on
    timeout, mirroring image_service.generate_image so the API layer can map it
    to a 504.
    """
    import asyncio

    prompt = build_owl_prompt(emotion)
    logger.info(f"Starting owl generation for emotion '{emotion}'")
    logger.debug(f"Owl prompt: {prompt}")

    client = get_client()

    try:
        logger.info("Calling OpenAI images.generate API for owl...")
        response = await asyncio.wait_for(
            client.images.generate(
                model="gpt-image-2",
                prompt=prompt,
                size=IMAGE_SIZE,
                quality=IMAGE_QUALITY,
                n=1,
            ),
            timeout=timeout_seconds,
        )
        logger.info("OpenAI API owl response received")

        image_data = response.data[0]
        if image_data.url:
            logger.info(f"Owl URL received: {image_data.url[:50]}...")
            return image_data.url
        elif image_data.b64_json:
            logger.info(f"Base64 owl received. Length: {len(image_data.b64_json)} chars")
            return f"data:image/png;base64,{image_data.b64_json}"
        else:
            logger.error("No owl image data in response")
            raise ValueError("No owl image data returned")

    except asyncio.TimeoutError:
        logger.error(f"Owl generation timed out after {timeout_seconds} seconds")
        raise TimeoutError(f"Owl generation timed out after {timeout_seconds} seconds")
    except Exception as e:
        logger.error(f"Owl generation failed: {type(e).__name__}: {str(e)}")
        raise
