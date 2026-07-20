import os
import json
from anthropic import Anthropic
from app.models.scene import SceneResponse

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are a children's story editor specializing in creating illustrated storybooks for kids in grades 1-3.

Your task is to split a story into 3-5 scenes suitable for an illustrated presentation. Each scene should be a natural narrative beat (beginning, middle, end structure).

You must respond with valid JSON in this exact format:
{
  "character_description": "A detailed visual description of the main character(s) that can be used consistently across all illustrations. Include physical features, clothing, and distinctive traits.",
  "scenes": [
    {
      "scene_number": 1,
      "text": "The exact text from the story for this scene.",
      "image_prompt": "A detailed, child-friendly image prompt for DALL-E 3 to illustrate this scene. Include the character description details for consistency."
    }
  ]
}

Guidelines:
- Split into 3-5 scenes based on story length and natural narrative breaks
- Keep the original story text intact, just divided into scenes
- Character description should be detailed enough for visual consistency across scenes
- Image prompts should be child-friendly, colorful, and suitable for a storybook
- Image prompts should always reference the character's consistent appearance
- Use a warm, friendly illustration style (e.g., "children's book illustration style, warm colors, friendly")"""


async def split_story_into_scenes(story: str) -> SceneResponse:
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Please split this story into scenes:\n\n{story}",
            }
        ],
    )

    response_text = message.content[0].text

    # Parse JSON from response
    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        # Try to extract JSON from the response if it contains extra text
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        if start != -1 and end > start:
            data = json.loads(response_text[start:end])
        else:
            raise ValueError("Failed to parse scene response from Claude")

    return SceneResponse(**data)
