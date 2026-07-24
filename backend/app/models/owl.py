from pydantic import BaseModel


class OwlRequest(BaseModel):
    emotion: str


class OwlResponse(BaseModel):
    image_url: str
