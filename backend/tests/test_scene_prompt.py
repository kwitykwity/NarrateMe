import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import scene_service
from app.services.scene_service import get_system_prompt, split_story_into_scenes


def _message(text: str, stop_reason: str = "end_turn"):
    """Minimal stand-in for an Anthropic message with a single text block."""
    block = MagicMock()
    block.type = "text"
    block.text = text

    message = MagicMock()
    message.content = [block]
    message.stop_reason = stop_reason
    message.usage = MagicMock()
    message.usage.output_tokens = 100
    return message


@pytest.mark.parametrize("level", ["strict", "moderate", "original", "unknown-level"])
def test_system_prompt_builds_for_every_content_level(level):
    """The prompt embeds literal JSON examples. Building it with an f-string made
    those braces format expressions, so this raised ValueError for every request."""
    prompt = get_system_prompt(level)

    assert "{content_safety}" not in prompt, "placeholder was not substituted"
    assert '"blocked": false' in prompt, "JSON example was lost"
    assert '"scene_number": 1' in prompt


def test_system_prompt_selects_matching_safety_rules():
    assert "SOFTEN salvageable content" in get_system_prompt("moderate")
    assert "SOFTEN salvageable content" not in get_system_prompt("strict")
    # An unrecognized level falls back to moderate rather than failing.
    assert get_system_prompt("unknown-level") == get_system_prompt("moderate")


def _patch_client(monkeypatch, message):
    client = MagicMock()
    client.messages.create = AsyncMock(return_value=message)
    monkeypatch.setattr(scene_service, "get_client", lambda: client)


@pytest.mark.asyncio
async def test_truncated_response_raises_value_error(monkeypatch):
    """A response cut off at max_tokens leaves a trailing '}' from the last
    complete scene, so the extraction retry also fails. That second failure must
    surface as ValueError (mapped to 503), not an opaque JSONDecodeError (500)."""
    truncated = (
        '{"blocked": false, "character_description": "a puppy", "scenes": ['
        '{"scene_number": 1, "text": "Max ran.", "image_prompt": "pup", "emotion": "scared"}, '
        '{"scene_number": 2, "text": "Lily found him.", "image_prom'
    )
    _patch_client(monkeypatch, _message(truncated, stop_reason="max_tokens"))

    with pytest.raises(ValueError, match="truncated"):
        await split_story_into_scenes("x" * 100)


@pytest.mark.asyncio
async def test_json_wrapped_in_prose_is_still_parsed(monkeypatch):
    payload = json.dumps(
        {
            "blocked": False,
            "character_description": "a brown puppy",
            "scenes": [
                {
                    "scene_number": i,
                    "text": f"Scene {i}.",
                    "image_prompt": "pup",
                    "emotion": "happy",
                }
                for i in range(1, 6)
            ],
        }
    )
    _patch_client(monkeypatch, _message(f"Here you go:\n```json\n{payload}\n```"))

    result = await split_story_into_scenes("x" * 100)

    assert result.blocked is False
    assert len(result.scenes) == 5


@pytest.mark.asyncio
async def test_blocked_story_returns_block_reason(monkeypatch):
    payload = json.dumps(
        {"blocked": True, "block_reason": "Not suitable for young readers."}
    )
    _patch_client(monkeypatch, _message(payload))

    result = await split_story_into_scenes("x" * 100)

    assert result.blocked is True
    assert result.scenes == []
