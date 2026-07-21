# NarrateMe - Build Handoff

## Project Overview
NarrateMe transforms written stories into narrated, illustrated presentations for children (grades 1-3).

## Current State
**Last commit:** `20d2067` - Use next/image for scene illustrations

The core pipeline is wired end-to-end: a user pastes a story, the backend
splits it into scenes with Claude, generates one illustration per scene with
OpenAI, and the frontend renders a navigable scene-by-scene presentation.
Both endpoints have been tested live and return `200`.

### What's Built

#### Backend (FastAPI - Python)
Location: `backend/`

**Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/scenes` | POST | Splits story into 3-5 illustrated scenes using Claude |
| `/api/images` | POST | Generates an illustration from a prompt using OpenAI |

**Services:**
- `scene_service.py` - Uses Claude (`claude-sonnet-5`, `AsyncAnthropic`) to split stories into scenes with character descriptions and image prompts. Wrapped in `asyncio.wait_for` (60s timeout), with structured logging, API-key validation, and JSON-extraction fallback.
- `image_service.py` - Uses OpenAI (`gpt-image-2`, `AsyncOpenAI`) for non-blocking image generation. 120s timeout, structured logging, API-key validation. Returns a base64 data URL (the model returns `b64_json`).

**Models:**
- `StoryRequest` - Input: `{ story: string }`
- `SceneResponse` - Output: `{ character_description, scenes: [{ scene_number, text, image_prompt }] }`
- `ImageRequest` - Input: `{ prompt: string }`
- `ImageResponse` - Output: `{ image_url: string }`

**Error handling:**
- `400` - invalid input (story < 50 chars, prompt < 10 chars)
- `500` - upstream/API failure (generic message to client; full error logged server-side)
- `504` - upstream call exceeded the timeout

#### Frontend (Next.js 16 + React 19 + Tailwind 4)
Location: `frontend/`

**Pages:**
- `/` - Story input page with textarea, character counter, and sample-story buttons
- `/presentation` - Full presentation player: per-scene card (illustration + text), Previous/Next navigation, and live image-generation progress

**UI Flow:**
1. User enters/pastes story (min 50 chars) and clicks "Create Presentation"
2. Story is saved to `sessionStorage` (key `narrateme:story`) and the app routes to `/presentation`
3. Presentation page reads the story, calls `POST /api/scenes`, then calls `POST /api/images` for each scene's `image_prompt`
4. Scene cards render as images arrive; user navigates scene by scene

**Frontend notes:**
- Story is passed via `sessionStorage`, not the URL (avoids query-string length limits). Read with `useSyncExternalStore` to stay hydration-safe.
- The scene-generation effect uses an `AbortController` + `cancelled` guard so React StrictMode / re-renders don't fire duplicate (paid) API calls.
- Per-scene image failures are logged to the console and skipped; the rest continue.
- Illustrations render with `next/image` (`fill`, `unoptimized` for base64/remote sources).

## What's NOT Built Yet
- Text-to-speech narration per scene (ElevenLabs) — `ELEVENLABS_API_KEY` is reserved but unused
- Word highlighting synced to narration audio
- Static / 2-pose avatar synced to audio playback
- Auto-advance playback
- Pre-generated backup story for demo resilience

**Known gap:** images are generated sequentially at ~30-40s each, so a 4-5 scene
story currently exceeds the 60s target. Parallelizing image generation
(`Promise.allSettled`) is the planned mitigation.

## Environment Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
```

Create `backend/.env`:
```
API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

Run:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000` (expects the backend at `http://localhost:8000`).

## API Testing

### Split Story into Scenes
```bash
curl -X POST http://localhost:8000/api/scenes \
  -H "Content-Type: application/json" \
  --data @story.json
```
> Tip: on Git Bash, inline `-d '{...}'` JSON can get mangled and return `422`.
> Put the payload in a file and use `--data @file.json`. Scene splitting
> takes ~12s and returns 3-5 scenes.

### Generate Image
```bash
curl -X POST http://localhost:8000/api/images \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A small brown puppy in a sunny garden, children book illustration style"}'
```
> Returns a base64 data URL (~3MB), takes ~30-40s per image.

## Architecture Notes
- Backend uses async/await throughout for non-blocking upstream calls, each wrapped in `asyncio.wait_for` for timeout safety.
- Logging is configured once at startup in `main.py`; modules use `logging.getLogger(__name__)`.
- CORS configured for `localhost:3000`.
- Scene service includes detailed prompt engineering for consistent character descriptions across scenes.
- Image service returns base64 data URLs (OpenAI returns `b64_json`).
- Stateless: no storage; each request regenerates from scratch.

## Next Steps (Suggested)
1. Add text-to-speech narration per scene (ElevenLabs) and an audio player
2. Parallelize image generation to bring total time under the 60s target
3. Add word highlighting synced to narration audio
4. Add a static / 2-pose avatar synced to audio playback
5. Add auto-advance playback and a pre-generated backup story for demos
