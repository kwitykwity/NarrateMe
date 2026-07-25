import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def _storage_dir(storage_dir: str | None = None) -> Path:
    if storage_dir:
        return Path(storage_dir)
    return Path(__file__).resolve().parent.parent.parent / "data"


def _ensure_storage(storage_dir: str | None = None) -> Path:
    path = _storage_dir(storage_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _read_json(path: Path, default: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        logger.warning("Storage file was invalid JSON; resetting it")
        return default


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def store_subscription(email: str, storage_dir: str | None = None) -> dict[str, Any]:
    base_dir = _ensure_storage(storage_dir)
    subscriptions_path = base_dir / "subscriptions.json"
    payload = _read_json(subscriptions_path, {"subscriptions": []})
    subscriptions = payload.setdefault("subscriptions", [])
    entry = {"email": email, "status": "active"}
    subscriptions.append(entry)
    _write_json(subscriptions_path, payload)
    return entry


def store_story_submission(story: str, storage_dir: str | None = None) -> dict[str, Any]:
    base_dir = _ensure_storage(storage_dir)
    stories_path = base_dir / "stories.json"
    payload = _read_json(stories_path, {"stories": []})
    stories = payload.setdefault("stories", [])
    entry = {"story": story, "story_length": len(story)}
    stories.append(entry)
    _write_json(stories_path, payload)
    return entry


def get_stats_snapshot(storage_dir: str | None = None) -> dict[str, Any]:
    base_dir = _ensure_storage(storage_dir)
    subscriptions_payload = _read_json(base_dir / "subscriptions.json", {"subscriptions": []})
    stories_payload = _read_json(base_dir / "stories.json", {"stories": []})
    return {
        "stories_created": len(stories_payload.get("stories", [])),
        "subscribers": len(subscriptions_payload.get("subscriptions", [])),
        "teacher_rating": 4.9,
        "seconds_to_first_story": 60,
    }
