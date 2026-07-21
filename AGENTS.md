# NarrateMe

Turns a written story into a narrated, illustrated, multi-scene presentation. See `README.md` for product overview.

## Cursor Cloud specific instructions

Two services make up the app. Standard commands live in `frontend/package.json` and `backend/requirements.txt`; only the non-obvious bits are noted here.

### Frontend (`frontend/`) — Next.js 16 + React 19 + Tailwind 4

- Dev server: `npm run dev` (serves on port 3000). Lint: `npm run lint`. Build: `npm run build`.
- No automated test suite exists yet.
- The home page "Create Presentation" flow currently does NOT call the backend — it just navigates to `/presentation?story=...` and shows a "Generating presentation..." placeholder. So the frontend runs fully standalone; the backend is not required to exercise the current UI.

### Backend (`backend/`) — FastAPI + Uvicorn

- Dependencies install into a virtualenv at `backend/.venv` (created by the update script).
- Run the dev server from the `backend/` directory: `./.venv/bin/uvicorn app.main:app --reload --port 8000`. Module path is `app.main:app`, so it must be launched with `backend/` as the working directory.
- `GET /health` and server startup work without any API keys.
- `POST /api/scenes` calls the Anthropic API and requires `ANTHROPIC_API_KEY` in the environment (loaded via `.env` / `python-dotenv`). Without it the endpoint returns HTTP 500 ("Could not resolve authentication method") even though the server is healthy. Set this secret to test the scene-splitting pipeline end-to-end.
- CORS only allows `http://localhost:3000`.
