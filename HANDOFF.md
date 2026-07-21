# NarrateMe - Build Handoff

## Project Overview
NarrateMe transforms written stories into narrated, illustrated presentations for children (grades 1-3).

## Current State
**Last commit:** `4b52d85` - Add image generation endpoint with async OpenAI client

### What's Built

#### Backend (FastAPI - Python)
Location: `backend/`

**Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/scenes` | POST | Splits story into 3-5 illustrated scenes using Claude |
| `/api/images` | POST | Generates images from prompts using OpenAI DALL-E |

**Services:**
- `scene_service.py` - Uses Claude (`claude-sonnet-5`) to split stories into scenes with character descriptions and image prompts
- `image_service.py` - Uses OpenAI (`gpt-image-2`) with AsyncOpenAI client for non-blocking image generation

**Models:**
- `StoryRequest` - Input: `{ story: string }`
- `SceneResponse` - Output: `{ character_description, scenes: [{ scene_number, text, image_prompt }] }`
- `ImageRequest` - Input: `{ prompt: string }`
- `ImageResponse` - Output: `{ image_url: string }`

#### Frontend (Next.js 16 + React 19 + Tailwind 4)
Location: `frontend/`

**Pages:**
- `/` - Story input page with textarea and sample story buttons
- `/presentation` - Placeholder page showing story and loading spinner

**Current UI Flow:**
1. User enters/pastes story (min 50 chars)
2. Clicks "Create Presentation"
3. Redirects to `/presentation?story=...`
4. Shows loading state (not yet wired to backend)

## What's NOT Built Yet
- Frontend integration with backend APIs
- Actual presentation rendering (scene cards with images)
- Text-to-speech narration
- Presentation playback controls
- Error handling UI

## Environment Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
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

Runs on `http://localhost:3000`

## API Testing

### Split Story into Scenes
```bash
curl -X POST http://localhost:8000/api/scenes \
  -H "Content-Type: application/json" \
  -d '{"story": "One sunny morning, a small brown puppy named Max wandered away from his home. He sniffed flowers and chased butterflies until he was lost. A kind girl named Lily found Max and saw his collar. She walked him all the way back home. Max was so happy to see his family again!"}'
```

### Generate Image
```bash
curl -X POST http://localhost:8000/api/images \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A small brown puppy in a sunny garden, children book illustration style"}'
```

## Architecture Notes
- Backend uses async/await properly for non-blocking API calls
- CORS configured for `localhost:3000`
- Scene service includes detailed prompt engineering for consistent character descriptions across scenes
- Image service returns base64 data URLs when OpenAI returns b64_json

## Next Steps (Suggested)
1. Wire presentation page to call `/api/scenes` on load
2. For each scene, call `/api/images` with the `image_prompt`
3. Render scene cards with generated images and text
4. Add text-to-speech for narration
5. Add presentation playback (auto-advance with narration timing)
