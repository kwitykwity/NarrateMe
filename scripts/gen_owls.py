"""Generate the pre-baked static owl narrator avatars.

The owl depends only on the scene's emotion (5 values), so instead of generating
owls per session (~50s each) we bake one PNG per emotion once and serve them
statically from frontend/public/owls/. Calls the running backend's /api/owl for
each emotion and decodes the base64 data URL to frontend/public/owls/{emotion}.png.

To refine the owl: edit OWL_BASE_PROMPT / EMOTION_EXPRESSIONS in
backend/app/services/owl_service.py, then re-run this (backend up on :8000):
    backend/venv/Scripts/python.exe -u scripts/gen_owls.py

Image quality follows the backend's IMAGE_QUALITY env var; start the backend
with IMAGE_QUALITY=high for crisper assets if desired.
"""

import os
import base64
import asyncio

import httpx

BASE_URL = "http://localhost:8000"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OWLS_DIR = os.path.join(REPO_ROOT, "frontend", "public", "owls")

# Must stay in sync with owl_service.EMOTION_EXPRESSIONS / scene.VALID_EMOTIONS.
EMOTIONS = ["happy", "sad", "excited", "scared", "calm"]

MAX_ATTEMPTS = 5
OWL_TIMEOUT = 150
CONCURRENCY = 2


async def generate_one(client: httpx.AsyncClient, emotion: str, sem: asyncio.Semaphore) -> None:
    out_path = os.path.join(OWLS_DIR, f"{emotion}.png")
    async with sem:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                print(f"[{emotion}] generating (attempt {attempt}/{MAX_ATTEMPTS})...")
                resp = await client.post(
                    f"{BASE_URL}/api/owl",
                    json={"emotion": emotion},
                    timeout=OWL_TIMEOUT,
                )
                resp.raise_for_status()
                image_url = resp.json()["image_url"]
                if image_url.startswith("data:"):
                    data = base64.b64decode(image_url.split(",", 1)[1])
                else:
                    img = await client.get(image_url, timeout=OWL_TIMEOUT)
                    img.raise_for_status()
                    data = img.content
                with open(out_path, "wb") as f:
                    f.write(data)
                print(f"[{emotion}] saved {out_path} ({len(data)} bytes)")
                return
            except Exception as e:
                print(f"[{emotion}] attempt {attempt} failed: {type(e).__name__}: {e}")
                if attempt < MAX_ATTEMPTS:
                    await asyncio.sleep(3 * attempt)
        print(f"[{emotion}] GAVE UP after {MAX_ATTEMPTS} attempts")


async def main() -> None:
    os.makedirs(OWLS_DIR, exist_ok=True)
    sem = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient() as client:
        await asyncio.gather(*(generate_one(client, e, sem) for e in EMOTIONS))
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
