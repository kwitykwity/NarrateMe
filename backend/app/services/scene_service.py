import os
import json
import logging
import asyncio
from anthropic import AsyncAnthropic
from app.models.scene import SceneResponse

logger = logging.getLogger(__name__)


def get_client():
    api_key = (
        os.getenv("API_KEY")
        or os.getenv("ANTHROPIC_API_KEY")
        or os.getenv("ANTHROPIC_API_KEY")
    )
    if not api_key:
        logger.error("Anthropic API key not configured (API_KEY or ANTHROPIC_API_KEY)")
        raise ValueError("Anthropic API key not configured")
    logger.debug("Anthropic client initialized")
    return AsyncAnthropic(api_key=api_key)

SYSTEM_PROMPT = """You are a children's story editor specializing in creating illustrated storybooks for kids in grades 1-3.

Your task is to split a story into exactly 5 scenes suitable for an illustrated presentation. Each scene should be a natural narrative beat, together forming a beginning, middle, and end.

CONTENT SAFETY (highest priority — the result is narrated aloud to young children):
The audience is children in grades 1-3. Many classic stories (e.g. Aesop's fables) carry good morals but contain mature details — death, killing, violence, cruelty, or evil. Apply a MODERATE standard:
- SOFTEN salvageable content: gently rewrite mature moments into age-appropriate outcomes while preserving the story's arc and its moral. For example, a character who dies "goes away" or "is never seen again"; a predator "chases off" or "scares" rather than kills or eats; violence becomes a narrow escape or a lesson learned. Mild peril or sadness is fine when it resolves positively.
- Keep the moral and the shape of the story intact — adapt wording, don't invent a different story.
- BLOCK truly unsuitable input: if a story is fundamentally inappropriate for young children (graphic or gory violence, cruelty or torture, sexual content, hate, or self-harm) and cannot be faithfully softened while staying true to it, do NOT produce scenes. Instead return the blocked response below.

You must respond with valid JSON in ONE of these two formats.

If the story is usable (after softening if needed):
{
  "blocked": false,
  "character_description": "A detailed visual description of the main character(s) that can be used consistently across all illustrations. Include physical features, clothing, and distinctive traits.",
  "scenes": [
    {
      "scene_number": 1,
      "text": "The (age-appropriately adapted) story text for this scene.",
      "image_prompt": "A detailed, child-friendly image prompt for DALL-E 3 to illustrate this scene. Include the character description details for consistency.",
      "emotion": "happy"
    }
  ]
}

If the story must be blocked:
{
  "blocked": true,
  "block_reason": "A short, gentle, kid-safe explanation for the grown-up (one or two sentences). Do NOT restate the graphic content; just say it isn't suitable for young readers and suggest trying a gentler story.",
  "character_description": "",
  "scenes": []
}

Guidelines (for the non-blocked case):
- Always produce exactly 5 scenes. Find natural narrative breaks; if the story is short, divide it into finer beats so there are still 5 scenes.
- Preserve the original wording where it is already age-appropriate; only change what the content-safety rule requires. Do not add commentary or invent unrelated events.
- Each part of the (adapted) story should appear in exactly one scene — never repeat, overlap, or duplicate text between scenes. If the story is short, split sentences into smaller phrases to reach 5 scenes rather than repeating any text.
- Character description should be detailed enough for visual consistency across scenes
- Image prompts should be child-friendly, colorful, and suitable for a storybook, and must also respect the content-safety rule (never depict violence, gore, or scary imagery)
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

        if data.get("blocked"):
            logger.info("Story blocked by content-safety guardrail")
            return SceneResponse(
                blocked=True,
                block_reason=data.get("block_reason", ""),
            )

        scene_count = len(data.get("scenes", []))
        logger.info(f"Scene splitting complete. Generated {scene_count} scenes")
        return SceneResponse(**data)

    except asyncio.TimeoutError:
        logger.error(f"Scene splitting timed out after {timeout_seconds} seconds")
        raise TimeoutError(f"Scene splitting timed out after {timeout_seconds} seconds")
    except Exception as e:
        logger.error(f"Scene splitting failed: {type(e).__name__}: {str(e)}")
        raise
