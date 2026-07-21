from pydantic import BaseModel


class AudioRequest(BaseModel):
    text: str


class AudioResponse(BaseModel):
    audio_url: str
