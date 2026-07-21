# NarrateMe

**Turn a written story into a narrated, illustrated, multi-scene presentation — automatically, in under a minute.**

NarrateMe helps teachers and parents of kids in grades 1–3 turn any plain written story into an engaging, illustrated, narrated presentation, without needing any design, illustration, or audio-production skills. Paste a story in, and NarrateMe splits it into scenes, illustrates each one, narrates it with a warm voice, and plays it back as a simple, read-along presentation.

---

## Status

**MVP Sprint v1 — 2-week build.** This is a proof-of-concept build meant to demo the core pipeline end-to-end. It is not a production product. See [Non-Goals](#non-goals-v1) below for what's intentionally out of scope right now.

### Implementation Status

**Working today:**
- Story input UI — paste/type, sample stories, 50-character minimum
- Scene splitting via Claude → structured JSON with a persistent character description reused across scenes
- Per-scene illustration via an OpenAI image model, using the shared character prompt for consistency
- Presentation player — scene cards (illustration + text), Previous/Next navigation, live image-generation progress
- Backend hardening — request timeouts (60s scenes / 120s images), structured logging, API-key validation, `504` on timeout

**Not yet built (still in v1 scope):**
- Text-to-speech narration per scene (ElevenLabs)
- Word highlighting synced to narration audio
- Static / 2-pose avatar synced to audio playback
- Auto-advance playback
- Pre-generated backup story for demo resilience

**Known gap:** images are generated sequentially at ~30–40s each, so a 4–5 scene story currently takes longer than the 60-second target. Parallelizing image generation is the planned mitigation.

---

## Team

| Name | Role |
|---|---|
| Erasmo Concepcion | Backend/AI Engineer |
| Christina Ruiz | AI/Visual Engineer |
| Bernard Shepard | Audio Engineer |
| Richard Theard | Frontend/UX Lead |

---

## How It Works

1. **Input** — User pastes or types a story into a text box. No login required.
2. **Scene splitting** — An LLM (Claude/GPT) splits the story into 3–5 scenes (beginning/middle/end structure) and outputs structured JSON, including a persistent character description reused across every scene.
3. **Illustration** — DALL-E 3 generates one illustration per scene, using the shared character description to keep the character visually consistent.
4. **Narration** *(planned)* — ElevenLabs (or Amazon Polly) generates narration audio per scene, using a warm, slower-paced voice suited to early readers.
5. **Playback** — A simple presentation player shows each scene's illustration alongside its text, advanced scene by scene with Previous/Next controls. Narration-synced word highlighting, auto-advance, and a static/2-pose avatar are *planned*.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend / Orchestration | Python (FastAPI), Uvicorn, async clients |
| Scene generation | Anthropic Claude (structured JSON output) |
| Image generation | OpenAI image model (returns base64 PNG) |
| Text-to-Speech | ElevenLabs *(planned — not yet integrated)* |
| Avatar | Static image / 2-pose swap *(planned — not yet integrated)* |
| Hosting | Vercel |
| Storage | None required for MVP — stateless, one-shot generation |

---

## Getting Started

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows  (use: source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
```

Create `backend/.env`:

```
API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

Run the API (serves on `http://localhost:8000`):

```bash
uvicorn app.main:app --reload --port 8000
```

**Endpoints:** `GET /health`, `POST /api/scenes` (split story → scenes), `POST /api/images` (prompt → illustration).

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend expects the backend at `http://localhost:8000`.

---

## MVP Scope (Must Have)

- Text input only (no speech-to-text)
- LLM scene splitting into 3–5 scenes
- One illustration per scene (DALL-E 3, consistent character prompt)
- TTS narration per scene
- Simple presentation player (image + highlighted text + auto-advance)
- Static or 2-pose avatar synced to audio playback

## Non-Goals (v1)

- Lip-sync / gesture animation
- Comprehension quizzes or vocabulary activities
- Teacher dashboard, analytics, or story library
- Background music
- Speech-to-text / audio story input
- Multi-language support

---

## Success Criteria (Demo-Ready)

- A teacher/parent can paste a story and get a playable illustrated + narrated presentation in under 60 seconds.
- The pipeline completes without manual intervention on at least 2 different test stories.
- Word highlighting stays roughly in sync with narration.
- A backup pre-generated story is ready in case live generation fails during the demo.

---

## Known Risk

**Character consistency across scenes** — DALL-E-generated illustrations may drift in the character's appearance between scenes. Mitigation for this build is a strong, persistent character-description prompt reused in every image generation call — not a technical/model-level fix. This is flagged as future work rather than solved in the 2-week build.

---

## Timeline (14 Days)

| Days | Milestone |
|---|---|
| 1–2 | Finalize scope, set up repo/API keys, each person validates their API call in isolation |
| 3–7 | Parallel build: pipeline (backend), image gen (AI), TTS (audio), player UI (frontend, against mock data) |
| 8–10 | Integration: connect pipeline end-to-end, add error/timeout handling |
| 11–12 | Polish: word-highlight sync, transitions, loading states, 1–2 pre-generated backup stories |
| 13–14 | Buffer + demo rehearsal |

---

## Future Scope (Post-Sprint)

Avatar lip-sync, comprehension quizzes, teacher dashboard, story library, voice cloning, multi-language support, background music/sound design, analytics.
