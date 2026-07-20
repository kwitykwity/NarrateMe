from pydantic import BaseModel


class StoryRequest(BaseModel):
    story: str


class Scene(BaseModel):
    scene_number: int
    text: str
    image_prompt: str


class SceneResponse(BaseModel):
    character_description: str
    scenes: list[Scene]
