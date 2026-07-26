import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services.landing_page_service import (
    get_stats_snapshot,
    store_story_submission,
    store_subscription,
)


def test_subscribe_and_story_submission_update_stats(tmp_path):
    storage_dir = tmp_path / "data"
    storage_dir.mkdir()

    subscription = store_subscription("reader@example.com", str(storage_dir))
    story = store_story_submission("A small story about a brave fox", str(storage_dir))

    assert subscription["email"] == "reader@example.com"
    assert story["story_length"] == len("A small story about a brave fox")

    stats = get_stats_snapshot(str(storage_dir))
    assert stats["stories_created"] == 1
    assert stats["subscribers"] == 1

    subscriptions_file = storage_dir / "subscriptions.json"
    assert subscriptions_file.exists()
    payload = json.loads(subscriptions_file.read_text(encoding="utf-8"))
    assert payload["subscriptions"][0]["email"] == "reader@example.com"


def test_local_frontend_origins_are_allowed_for_story_submission():
    client = TestClient(app)

    response = client.post(
        "/api/demo/story",
        json={"story": "A short story about a brave fox"},
        headers={"origin": "http://127.0.0.1:3000"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:3000"

    response = client.post(
        "/api/demo/story",
        json={"story": "A short story about a brave fox"},
        headers={"origin": "http://localhost:3000"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
