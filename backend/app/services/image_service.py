import os
import logging
import asyncio
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


def get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY environment variable not set")
        raise ValueError("OPENAI_API_KEY environment variable not set")
    logger.debug("OpenAI client initialized")
    return AsyncOpenAI(api_key=api_key)


async def generate_image(prompt: str, timeout_seconds: int = 120) -> str:
    logger.info(f"Starting image generation. Prompt length: {len(prompt)} chars")
    logger.debug(f"Image prompt: {prompt[:100]}...")

    client = get_client()

    try:
        logger.info("Calling OpenAI images.generate API...")
        response = await asyncio.wait_for(
            client.images.generate(
                model="gpt-image-2",
                prompt=prompt,
                size="1024x1024",
                quality="auto",
                n=1,
            ),
            timeout=timeout_seconds
        )
        logger.info("OpenAI API response received")

        image_data = response.data[0]
        if image_data.url:
            logger.info(f"Image URL received: {image_data.url[:50]}...")
            return image_data.url
        elif image_data.b64_json:
            logger.info(f"Base64 image received. Length: {len(image_data.b64_json)} chars")
            return f"data:image/png;base64,{image_data.b64_json}"
        else:
            logger.error("No image data in response")
            raise ValueError("No image data returned")

    except asyncio.TimeoutError:
        logger.error(f"Image generation timed out after {timeout_seconds} seconds")
        raise TimeoutError(f"Image generation timed out after {timeout_seconds} seconds")
    except Exception as e:
        logger.error(f"Image generation failed: {type(e).__name__}: {str(e)}")
        raise
