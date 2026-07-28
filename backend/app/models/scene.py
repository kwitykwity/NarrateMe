from typing import Literal, Optional
from pydantic import BaseModel, field_validator

# The emotion vocabulary the LLM is allowed to tag scenes with. This is the
# single source of truth on the backend; the owl service maps each of these to
# a facial expression. Keep this list in sync with owl_service.EMOTION_EXPRESSIONS.
VALID_EMOTIONS = {"happy", "sad", "excited", "scared", "calm"}
DEFAULT_EMOTION = "calm"

# Engagement prompt types for active listening features
VALID_ENGAGEMENT_TYPES = {"reading_prompt", "sound_cue", "comprehension_check"}
VALID_TIMINGS = {"before", "after"}


VALID_CONTENT_LEVELS = {"strict", "moderate", "original"}
DEFAULT_CONTENT_LEVEL = "moderate"


class StoryRequest(BaseModel):
    story: str
    content_level: str = DEFAULT_CONTENT_LEVEL

    @field_validator("content_level", mode="before")
    @classmethod
    def normalize_content_level(cls, value: str) -> str:
        if not isinstance(value, str):
            return DEFAULT_CONTENT_LEVEL
        normalized = value.strip().lower()
        return normalized if normalized in VALID_CONTENT_LEVELS else DEFAULT_CONTENT_LEVEL


class EngagementPrompt(BaseModel):
    """An optional engagement prompt to make children active listeners."""
    type: str  # reading_prompt, sound_cue, or comprehension_check
    text: str  # The prompt/question text
    timing: str  # "before" or "after" the scene
    answer_hint: Optional[str] = None  # For comprehension_check only

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, value: str) -> str:
        if not isinstance(value, str):
            return "reading_prompt"
        normalized = value.strip().lower()
        return normalized if normalized in VALID_ENGAGEMENT_TYPES else "reading_prompt"

    @field_validator("timing", mode="before")
    @classmethod
    def normalize_timing(cls, value: str) -> str:
        if not isinstance(value, str):
            return "after"
        normalized = value.strip().lower()
        return normalized if normalized in VALID_TIMINGS else "after"


class Scene(BaseModel):
    scene_number: int
    text: str
    image_prompt: str
    emotion: str = DEFAULT_EMOTION
    engagement: Optional[EngagementPrompt] = None

    @field_validator("emotion", mode="before")
    @classmethod
    def normalize_emotion(cls, value: str) -> str:
        # The LLM occasionally returns an unexpected or missing tone label; fall
        # back to a safe default rather than failing the whole scene split.
        if not isinstance(value, str):
            return DEFAULT_EMOTION
        normalized = value.strip().lower()
        return normalized if normalized in VALID_EMOTIONS else DEFAULT_EMOTION


class SceneResponse(BaseModel):
    character_description: str = ""
    scenes: list[Scene] = []
    # Content guardrail: set when a story is too intense for young readers to be
    # faithfully softened, so the frontend shows a friendly notice instead of
    # generating a presentation. block_reason is a kid-safe explanation for the
    # adult (never restates the graphic content). Safe stories leave both unset.
    blocked: bool = False
    block_reason: str = ""
