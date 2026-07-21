import os
from openai import AsyncOpenAI


def get_client():
    return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def generate_image(prompt: str) -> str:
    client = get_client()
    response = await client.images.generate(
        model="gpt-image-2",
        prompt=prompt,
        size="1024x1024",
        quality="auto",
        n=1,
    )
    image_data = response.data[0]
    if image_data.url:
        return image_data.url
    elif image_data.b64_json:
        return f"data:image/png;base64,{image_data.b64_json}"
    else:
        raise ValueError("No image data returned")
