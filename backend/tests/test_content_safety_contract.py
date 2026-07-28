"""Executable form of EVAL_CARD.md — the content-safety guardrail contract.

These tests pin the *plumbing* contract end-to-end through `POST /api/scenes`:
given each verdict Claude can return, does the API surface it in the shape the
frontend consumes? They deliberately mock the Claude call, so they run offline
with no API key.

What they do NOT cover: whether the model's *judgment* is correct (does it
actually soften a fable's death, does it actually block gore). That requires a
live key and is still tracked as pending in EVAL_CARD.md. The value here is that
a regression in parsing, status codes, or response shape can no longer ship
silently between those live runs.
"""

import json
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app.services import scene_service

client = TestClient(app)

# The API rejects anything under 50 characters before reaching the guardrail.
STORY = (
    "Once upon a time there was a small brown puppy named Max who wandered "
    "away from his home and got lost in the woods."
)


def _patch_claude(monkeypatch, payload: dict):
    """Make the Claude call return `payload` as its single text block."""
    block = MagicMock()
    block.type = "text"
    block.text = json.dumps(payload)

    message = MagicMock()
    message.content = [block]
    message.stop_reason = "end_turn"
    message.usage = MagicMock()
    message.usage.output_tokens = 100

    mock = MagicMock()
    mock.messages.create = AsyncMock(return_value=message)
    monkeypatch.setattr(scene_service, "get_client", lambda: mock)


def _scenes(count: int) -> list[dict]:
    return [
        {
            "scene_number": i,
            "text": f"Scene {i}.",
            "image_prompt": "a small brown puppy, storybook illustration",
            "emotion": "happy",
        }
        for i in range(1, count + 1)
    ]


# --- Golden example -------------------------------------------------------
# EVAL_CARD: "The Lost Puppy" -> blocked: false, scenes generated.


def test_golden_story_returns_scenes_and_is_not_blocked(monkeypatch):
    _patch_claude(
        monkeypatch,
        {
            "blocked": False,
            "character_description": "a small brown puppy",
            "scenes": _scenes(4),
        },
    )

    response = client.post("/api/scenes", json={"story": STORY})

    assert response.status_code == 200
    body = response.json()
    assert body["blocked"] is False
    assert body["block_reason"] == ""
    assert len(body["scenes"]) == 4


# --- Adversarial (soft) ---------------------------------------------------
# EVAL_CARD: softenable content -> not blocked, arc intact, scenes generated.
# Offline we can only assert that a "softened" verdict passes through intact
# (it must NOT be mistaken for a block); whether the text was truly softened is
# a live-key question.


def test_softened_story_passes_through_as_playable(monkeypatch):
    _patch_claude(
        monkeypatch,
        {
            "blocked": False,
            "character_description": "a clever fox",
            "scenes": _scenes(4),
        },
    )

    response = client.post("/api/scenes", json={"story": STORY, "content_level": "moderate"})

    assert response.status_code == 200
    body = response.json()
    assert body["blocked"] is False
    assert len(body["scenes"]) == 4, "softened stories must still be playable"


# --- Adversarial (hard) ---------------------------------------------------
# EVAL_CARD: unsalvageable content -> blocked: true, gentle reason, NO scenes.
# This is the contract the frontend's block notice depends on: a *200* (not an
# error status), carrying the reason and an empty scene list.


def test_blocked_story_returns_200_with_reason_and_no_scenes(monkeypatch):
    reason = "This story isn't a good fit for young readers. Try a gentler one."
    _patch_claude(monkeypatch, {"blocked": True, "block_reason": reason})

    response = client.post("/api/scenes", json={"story": STORY})

    # A block is a verdict, not a failure: returning 4xx/5xx here would send the
    # frontend down its error path (and into the backup story) instead of
    # showing the notice.
    assert response.status_code == 200
    body = response.json()
    assert body["blocked"] is True
    assert body["block_reason"] == reason
    assert body["scenes"] == [], "a blocked story must not leak scene content"


def test_blocked_story_without_reason_still_blocks(monkeypatch):
    """The model may omit block_reason. That must not downgrade the verdict —
    the frontend substitutes its own wording for an empty reason."""
    _patch_claude(monkeypatch, {"blocked": True})

    response = client.post("/api/scenes", json={"story": STORY})

    assert response.status_code == 200
    body = response.json()
    assert body["blocked"] is True
    assert body["scenes"] == []
