import pytest

from app.services import landing_page_service


@pytest.fixture(autouse=True)
def isolate_landing_page_storage(tmp_path, monkeypatch):
    """Keep landing-page writes out of the tracked files under backend/data/.

    store_subscription / store_story_submission / get_stats_snapshot default to
    backend/data/ when no directory is passed, and the API layer calls them that
    way. So any test that exercises POST /api/demo/story or /api/subscribe
    appended to files under version control, leaving the working tree dirty
    after every `pytest` run (and quietly inflating the landing page's stats).

    Redirect only that default to a per-test tmp dir. An explicit storage_dir
    argument still wins, so tests that pass their own path are unaffected.
    """
    real_storage_dir = landing_page_service._storage_dir

    def _redirect(storage_dir: str | None = None):
        return real_storage_dir(storage_dir) if storage_dir else tmp_path

    monkeypatch.setattr(landing_page_service, "_storage_dir", _redirect)
