from pydantic import BaseModel


class AudioRequest(BaseModel):
    text: str


class WordTiming(BaseModel):
    word: str
    start: float
    end: float


class AudioResponse(BaseModel):
    audio_url: str
    word_timings: list[WordTiming] = []
