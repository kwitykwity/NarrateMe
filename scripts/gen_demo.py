"""Resumable generator for the pre-baked demo/backup story.

Splits a fixed story into scenes (cached), then generates one illustration and
one narration per scene by calling the running backend. Decodes the base64 data
URLs to static PNG/MP3 files under frontend/public/demo/ and writes a manifest
at frontend/public/demo-story.json.

Resumable: the scene split is cached to scripts/demo_scenes.json, and any scene
whose image/audio file already exists on disk is skipped, so a mid-run failure
(e.g. a 504 on a slow image) can be recovered by re-running without redoing good
work.

Paths are resolved relative to this file, so it can be run from anywhere as long
as the backend is up on :8000:
    backend/venv/Scripts/python.exe -u scripts/gen_demo.py
"""

import os
import json
import base64
import asyncio

import httpx

BASE_URL = "http://localhost:8000"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
PUBLIC_DIR = os.path.join(REPO_ROOT, "frontend", "public")
DEMO_DIR = os.path.join(PUBLIC_DIR, "demo")
SCENES_CACHE = os.path.join(SCRIPT_DIR, "demo_scenes.json")
MANIFEST_PATH = os.path.join(PUBLIC_DIR, "demo-story.json")

STORY_TITLE = "The Lost Puppy"
STORY_TEXT = (
    "One sunny morning, a small brown puppy named Max wandered away from his "
    "home. He sniffed flowers and chased butterflies until he was lost. A kind "
    "girl named Lily found Max and saw his collar. She walked him all the way "
    "back home. Max was so happy to see his family again!"
)

# Per-request ceilings and retry policy. Images are the slow/flaky call, so give
# them a generous timeout and back off between attempts on a 504.
MAX_ATTEMPTS = 5
SCENES_TIMEOUT = 90
IMAGE_TIMEOUT = 150
AUDIO_TIMEOUT = 90


async def post(client, path, payload, timeout):
    last_err = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            resp = await client.post(f"{BASE_URL}{path}", json=payload, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            last_err = e
            print(f"  {path} attempt {attempt}/{MAX_ATTEMPTS} failed: {e}")
            if attempt < MAX_ATTEMPTS:
                cooldown = 20 * attempt
                print(f"  cooling down {cooldown}s before retry...")
                await asyncio.sleep(cooldown)
    raise RuntimeError(f"{path} failed after {MAX_ATTEMPTS} attempts: {last_err}")


def data_url_to_bytes(data_url):
    # "data:<mime>;base64,<payload>" -> raw bytes
    _, b64 = data_url.split(",", 1)
    return base64.b64decode(b64)


async def get_scenes(client):
    if os.path.exists(SCENES_CACHE):
        print(f"Using cached scene split from {SCENES_CACHE}")
        with open(SCENES_CACHE, "r", encoding="utf-8") as f:
            return json.load(f)

    print("Splitting story into scenes...")
    data = await post(client, "/api/scenes", {"story": STORY_TEXT}, SCENES_TIMEOUT)
    print(f"  got {len(data['scenes'])} scenes")
    with open(SCENES_CACHE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return data


async def main():
    os.makedirs(DEMO_DIR, exist_ok=True)

    async with httpx.AsyncClient() as client:
        scenes_data = await get_scenes(client)
        scenes = scenes_data["scenes"]

        manifest_scenes = []
        for scene in scenes:
            n = scene["scene_number"]
            png_name = f"scene-{n}.png"
            mp3_name = f"scene-{n}.mp3"
            png_path = os.path.join(DEMO_DIR, png_name)
            mp3_path = os.path.join(DEMO_DIR, mp3_name)

            if os.path.exists(png_path):
                print(f"Scene {n}: image already present, skipping")
            else:
                print(f"Scene {n}: generating image...")
                img = await post(client, "/api/images", {"prompt": scene["image_prompt"]}, IMAGE_TIMEOUT)
                png_bytes = data_url_to_bytes(img["image_url"])
                with open(png_path, "wb") as f:
                    f.write(png_bytes)

            if os.path.exists(mp3_path):
                print(f"Scene {n}: audio already present, skipping")
            else:
                print(f"Scene {n}: generating narration...")
                aud = await post(client, "/api/audio", {"text": scene["text"]}, AUDIO_TIMEOUT)
                mp3_bytes = data_url_to_bytes(aud["audio_url"])
                with open(mp3_path, "wb") as f:
                    f.write(mp3_bytes)

            print(
                f"  scene {n}: {png_name} ({os.path.getsize(png_path)} B), "
                f"{mp3_name} ({os.path.getsize(mp3_path)} B)"
            )
            manifest_scenes.append(
                {
                    "scene_number": n,
                    "text": scene["text"],
                    "image_url": f"/demo/{png_name}",
                    "audio_url": f"/demo/{mp3_name}",
                }
            )

        manifest = {"title": STORY_TITLE, "scenes": manifest_scenes}
        with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        print(f"Wrote manifest: {MANIFEST_PATH} ({len(manifest_scenes)} scenes)")


if __name__ == "__main__":
    asyncio.run(main())
