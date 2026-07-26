import os
from typing import Any


def get_ai_status() -> dict[str, Any]:
    def has_value(*names: str) -> bool:
        return any(bool(os.getenv(name)) for name in names)

    return {
        "scene_splitter": {
            "configured": has_value("API_KEY", "ANTHROPIC_API_KEY"),
            "provider": "anthropic",
            "env_var": "API_KEY or ANTHROPIC_API_KEY",
        },
        "image_generator": {
            "configured": has_value("OPENAI_API_KEY"),
            "provider": "openai",
            "env_var": "OPENAI_API_KEY",
        },
        "narration_generator": {
            "configured": has_value("ELEVENLABS_API_KEY"),
            "provider": "elevenlabs",
            "env_var": "ELEVENLABS_API_KEY",
        },
    }
