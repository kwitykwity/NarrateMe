import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["demo"])

# Path to local demo-story manifest fallback
DEMO_STORY_PATH = Path(__file__).parent.parent.parent.parent / "frontend" / "public" / "demo-story.json"


@router.get("/demo")
async def get_demo_story():
    """
    Returns the pre-baked demo story manifest for the landing page player.
    """
    logger.info("GET /api/demo - Fetching demo story manifest")
    
    # Try reading demo-story.json if available
    if DEMO_STORY_PATH.exists():
        try:
            with open(DEMO_STORY_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data
        except Exception as e:
            logger.error(f"Error reading demo story JSON: {e}")

    # Fallback structure
    return {
        "title": "The Lost Puppy",
        "scenes": [
            {
                "scene_number": 1,
                "text": "One sunny morning, a small brown puppy named Max wandered away from his home. He sniffed flowers and chased butterflies until he was lost.",
                "emotion": "scared",
                "image_url": "/demo/scene-1.png",
                "audio_url": "/demo/scene-1.mp3",
                "word_timings": [
                    {"word": "One", "start": 0.0, "end": 0.464},
                    {"word": "sunny", "start": 0.511, "end": 0.766},
                    {"word": "morning,", "start": 0.824, "end": 1.277},
                    {"word": "a", "start": 1.324, "end": 1.393},
                    {"word": "small", "start": 1.474, "end": 1.753},
                    {"word": "brown", "start": 1.8, "end": 2.055},
                    {"word": "puppy", "start": 2.125, "end": 2.426},
                    {"word": "named", "start": 2.508, "end": 2.74},
                    {"word": "Max", "start": 2.81, "end": 3.204},
                    {"word": "wandered", "start": 3.297, "end": 3.692},
                    {"word": "away", "start": 3.727, "end": 3.913},
                    {"word": "from", "start": 3.959, "end": 4.087},
                    {"word": "his", "start": 4.133, "end": 4.214},
                    {"word": "home.", "start": 4.272, "end": 4.69},
                    {"word": "He", "start": 5.016, "end": 5.132},
                    {"word": "sniffed", "start": 5.19, "end": 5.492},
                    {"word": "flowers", "start": 5.538, "end": 6.014},
                    {"word": "and", "start": 6.06, "end": 6.153},
                    {"word": "chased", "start": 6.211, "end": 6.525},
                    {"word": "butterflies", "start": 6.571, "end": 7.187},
                    {"word": "until", "start": 7.245, "end": 7.454},
                    {"word": "he", "start": 7.512, "end": 7.558},
                    {"word": "was", "start": 7.593, "end": 7.686},
                    {"word": "lost.", "start": 7.744, "end": 8.406}
                ]
            },
            {
                "scene_number": 2,
                "text": "A kind girl named Lily found Max and saw his collar.",
                "emotion": "calm",
                "image_url": "/demo/scene-2.png",
                "audio_url": "/demo/scene-2.mp3"
            },
            {
                "scene_number": 3,
                "text": "She walked him all the way back home.",
                "emotion": "calm",
                "image_url": "/demo/scene-3.png",
                "audio_url": "/demo/scene-3.mp3"
            },
            {
                "scene_number": 4,
                "text": "Max was so happy to see his family again!",
                "emotion": "excited",
                "image_url": "/demo/scene-4.png",
                "audio_url": "/demo/scene-4.mp3"
            }
        ]
    }
