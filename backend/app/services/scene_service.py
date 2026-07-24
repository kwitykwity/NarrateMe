import os
import json
import logging
import asyncio
from anthropic import AsyncAnthropic
from app.models.scene import SceneResponse

logger = logging.getLogger(__name__)


def get_client():
    api_key = os.getenv("API_KEY")
    if not api_key:
        logger.error("API_KEY environment variable not set")
        raise ValueError("API_KEY environment variable not set")
    logger.debug("Anthropic client initialized")
    return AsyncAnthropic(api_key=api_key)

SYSTEM_PROMPT = """You are a children's story editor specializing in creating illustrated storybooks for kids in grades 1-3.

Your task is to split a story into exactly 5 scenes suitable for an illustrated presentation. Each scene should be a natural narrative beat, together forming a beginning, middle, and end.

You must respond with valid JSON in this exact format:
{
  "character_description": "A detailed visual description of the main character(s) that can be used consistently across all illustrations. Include physical features, clothing, and distinctive traits.",
  "scenes": [
    {
      "scene_number": 1,
      "text": "The exact text from the story for this scene.",
      "image_prompt": "A detailed, child-friendly image prompt for DALL-E 3 to illustrate this scene. Include the character description details for consistency.",
      "emotion": "happy"
    }
  ]
}

Guidelines:
- Always produce exactly 5 scenes. Find natural narrative breaks; if the story is short, divide it into finer beats so there are still 5 scenes.
- Keep the original story text intact, just divided into scenes
- Each part of the original text must appear in exactly one scene — never repeat, overlap, or duplicate text between scenes. Concatenating all scene texts in order must reproduce the original story with no repetition. If the story is short, split sentences into smaller phrases to reach 5 scenes rather than repeating any text.
- Character description should be detailed enough for visual consistency across scenes
- Image prompts should be child-friendly, colorful, and suitable for a storybook
- Image prompts should always reference the character's consistent appearance
- Use a warm, friendly illustration style (e.g., "children's book illustration style, warm colors, friendly")
- Tag each scene with an "emotion" that captures its dominant emotional tone. You MUST pick exactly one of: "happy", "sad", "excited", "scared", "calm". This drives a narrator owl's facial expression, so choose the tone a child would feel during that scene."""


async def split_story_into_scenes(story: str, timeout_seconds: int = 60) -> SceneResponse:
    logger.info(f"Starting scene splitting. Story length: {len(story)} chars")

    client = get_client()

    try:
        logger.info("Calling Anthropic messages.create API...")
        message = await asyncio.wait_for(
            client.messages.create(
                model="claude-sonnet-5",
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": f"Please split this story into scenes:\n\n{story}",
                    }
                ],
            ),
            timeout=timeout_seconds
        )
        logger.info("Anthropic API response received")

        # The response may lead with non-text blocks (e.g. a ThinkingBlock when
        # extended thinking is on), so pick the first text block rather than
        # assuming content[0].
        response_text = next(
            (block.text for block in message.content if block.type == "text"),
            None,
        )
        if response_text is None:
            logger.error("No text block in Anthropic response")
            raise ValueError("No text content in scene response from Claude")
        logger.debug(f"Response text length: {len(response_text)} chars")

        # Parse JSON from response
        try:
            data = json.loads(response_text)
            logger.info("JSON parsed successfully")
        except json.JSONDecodeError as e:
            logger.warning(f"Initial JSON parse failed: {e}. Attempting extraction...")
            # Try to extract JSON from the response if it contains extra text
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start != -1 and end > start:
                data = json.loads(response_text[start:end])
                logger.info("JSON extracted and parsed successfully")
            else:
                logger.error(f"Failed to extract JSON from response: {response_text[:200]}...")
                raise ValueError("Failed to parse scene response from Claude")

        scene_count = len(data.get("scenes", []))
        logger.info(f"Scene splitting complete. Generated {scene_count} scenes")
        return SceneResponse(**data)

    except asyncio.TimeoutError:
        logger.error(f"Scene splitting timed out after {timeout_seconds} seconds")
        raise TimeoutError(f"Scene splitting timed out after {timeout_seconds} seconds")
    except Exception as e:
        logger.error(f"Scene splitting failed: {type(e).__name__}: {str(e)}")
        raise
