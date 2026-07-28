from pydantic import BaseModel


class AudioRequest(BaseModel):
    text: str
    voice_id: str | None = None  # Optional voice override (e.g., owl voice)


class WordTiming(BaseModel):
    word: str
    start: float
    end: float


class AudioResponse(BaseModel):
    audio_url: str
    word_timings: list[WordTiming] = []
