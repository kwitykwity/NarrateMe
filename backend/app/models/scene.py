from pydantic import BaseModel, field_validator

# The emotion vocabulary the LLM is allowed to tag scenes with. This is the
# single source of truth on the backend; the owl service maps each of these to
# a facial expression. Keep this list in sync with owl_service.EMOTION_EXPRESSIONS.
VALID_EMOTIONS = {"happy", "sad", "excited", "scared", "calm"}
DEFAULT_EMOTION = "calm"


class StoryRequest(BaseModel):
    story: str


class Scene(BaseModel):
    scene_number: int
    text: str
    image_prompt: str
    emotion: str = DEFAULT_EMOTION

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
    character_description: str
    scenes: list[Scene]
