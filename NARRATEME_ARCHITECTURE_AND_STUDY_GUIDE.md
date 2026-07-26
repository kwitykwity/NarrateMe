# NarrateMe: Comprehensive Architecture & Self-Study Guide

> **Purpose:** This report breaks down the entire **NarrateMe** repository—its directory layout, technology stack, backend microservices, frontend components, AI data flow, and product positioning. Use this document as your primary reference when studying the codebase on your own or when working with LLMs (e.g., ChatGPT, Claude, Gemini).

---

## 1. Project Overview & High-Level Architecture

**NarrateMe** is an AI-powered EdTech web application designed for early childhood literacy (Grades 1–3, ages 6–9), parents, and teachers. It takes a plain-text story (50–500 words) and automatically generates an interactive, illustrated, and narrated multi-scene presentation in under 60 seconds.

### High-Level System Diagram

```
[ User Input (Next.js UI) ]
            │
            ▼
[ FastAPI Backend (/api) ]
   ├── 1. POST /api/scenes ────► Claude/GPT LLM (Scene Splitting & Character Prompting)
   ├── 2. POST /api/images ────► OpenAI DALL-E 3 (Character-Consistent Illustrations)
   └── 3. POST /api/audio  ────► ElevenLabs TTS (Audio Narration & Word Alignment)
            │
            ▼
[ Interactive Story Player UI ] ◄── (Renders synchronized visuals, audio, & read-along text)
```

---

## 2. Directory & Repository Map

Here is the exact file tree of the project with descriptions of what each directory and file does:

```
NarrateMe/
├── README.md                      # Primary project readme (team roles, status, pipeline steps)
├── MARKETING_DOCUMENTATION.md    # Comprehensive product positioning, vision, and pitch analysis
├── NarrateMe_PRD.txt              # Product Requirements Document (goals, metrics, user journeys)
├── HANDOFF.md                     # Engineering handoff document and technical state
├── docs/
│   └── wireframes/
│       ├── landing_page_wireframe.html  # Standalone marketing landing page wireframe (formerly 1.html)
│       └── demo_library_wireframe.html  # Standalone demo story library wireframe (formerly 2.html)
├── backend/                       # Python FastAPI Backend Service
│   ├── requirements.txt           # Python dependencies (FastAPI, uvicorn, anthropic, openai, elevenlabs)
│   ├── railway.json               # Production deployment config for Railway
│   └── app/
│       ├── main.py                # FastAPI app initialization, CORS middleware, and router mounting
│       ├── api/                   # API Route Handlers
│       │   ├── scenes.py          # POST /api/scenes (Text parsing & scene splitting)
│       │   ├── images.py          # POST /api/images (DALL-E 3 image generation)
│       │   ├── audio.py           # POST /api/audio (ElevenLabs narration & word timings)
│       │   └── owl.py             # Companion avatar / mascot endpoint logic
│       ├── models/                # Pydantic Schemas & Data Contracts
│       │   ├── scene.py           # Request/Response models for story & scene parsing
│       │   └── ...
│       └── services/              # Core Business & AI Service Logic
│           ├── scene_service.py   # LLM prompt engineering for scene division & character prompt
│           ├── image_service.py   # DALL-E 3 image generation service
│           ├── audio_service.py   # ElevenLabs TTS integration & timestamp parsing
│           └── owl_service.py     # Mascot companion logic
└── frontend/                      # Next.js 15+ & React Frontend Web Application
    ├── package.json               # Node.js dependencies (React, Next.js, Tailwind CSS, Lucide icons)
    ├── next.config.ts             # Next.js configuration settings
    ├── public/                    # Static Assets & Fallback Pre-generated Media
    │   ├── demo-story.json        # Pre-generated fallback story JSON payload for resilient live demos
    │   └── demo/                  # Pre-rendered images (scene-1.png) and audio (scene-1.mp3)
    └── src/
        └── app/                   # Next.js App Router Page Layouts
            ├── page.tsx            # Main application homepage & story input interface
            ├── layout.tsx          # Root HTML layout, font setup, and metadata
            └── presentation/       # Interactive story presentation player components
```

---

## 3. The 4-Stage AI Pipeline Breakdown

Understanding how data moves through the application is key to studying this project:

### Stage 1: Story Parsing (`scene_service.py` & `scenes.py`)

* **Endpoint:** `POST /api/scenes`
* **Input:** Raw story text (minimum 50 characters).
* **Process:** 
  1. The backend receives the story and sends it to the LLM (Claude/GPT).
  2. The LLM splits the text into 3–5 logical narrative scenes (Beginning, Middle, End).
  3. Crucially, the LLM extracts a **persistent character description** (e.g., *"a small brown bear cub with a red backpack"*).
* **Output:** JSON array of scenes + the global character prompt.

### Stage 2: Illustration Generation (`image_service.py` & `images.py`)

* **Endpoint:** `POST /api/images`
* **Input:** Individual scene visual description + global persistent character prompt.
* **Process:** Calls OpenAI DALL-E 3 with the combined prompt to ensure the same character looks consistent from scene to scene.
* **Output:** URL/base64 of the generated PNG illustration.

### Stage 3: Voiceover & Alignment (`audio_service.py` & `audio.py`)

* **Endpoint:** `POST /api/audio`
* **Input:** Scene text.
* **Process:** Calls ElevenLabs TTS using a warm voice suited for early readers ("Sarah"). Generates audio while retrieving word-level start and end timestamps (`word_timings`).
* **Output:** Base64 MP3 audio + timestamp array for read-along synchronization.

### Stage 4: Frontend Story Player (`frontend/src/app/presentation/`)

* Combines the text, PNG image, MP3 audio, and word alignment data into an interactive UI.
* Highlights words on screen in sync with the narration as the child listens.

---

## 4. Key Technology Stack

| Layer                  | Technology                    | Purpose                                                    |
|:---------------------- |:----------------------------- |:---------------------------------------------------------- |
| **Frontend Framework** | Next.js (React 19)            | Server-rendered & client-side interactive UI components    |
| **Styling**            | Tailwind CSS                  | Modern, responsive visual styling with custom color tokens |
| **Backend Framework**  | FastAPI (Python 3.11+)        | Asynchronous HTTP REST API server                          |
| **AI LLM Engine**      | Anthropic Claude / OpenAI GPT | Story scene splitting & character description extraction   |
| **AI Image Engine**    | OpenAI DALL-E 3               | Character-consistent scene illustration                    |
| **AI Audio Engine**    | ElevenLabs API                | Text-to-speech narration with word-level alignment         |
| **Deployment**         | Railway                       | Cloud hosting for the FastAPI backend service              |

---

## 5. How to Use This Report to Prompt Other LLMs

When studying or adding features using ChatGPT, Claude, or Gemini, use these pre-made prompts to give the LLM full context:

### Prompt 1: Studying the Backend Logic

> *"I am working on the NarrateMe project. It uses FastAPI for the backend (`backend/app`). I want to study `backend/app/services/scene_service.py`. Can you explain how Pydantic models in `backend/app/models/scene.py` enforce the JSON schema returned by the LLM when splitting stories into scenes?"*

### Prompt 2: Studying the Frontend Presentation Player

> *"I am analyzing the NarrateMe frontend built with Next.js and React (`frontend/src/app`). Explain how word-level timestamps (`word_timings` with `start` and `end` float values from `demo-story.json`) can be used in React `useState` and `useEffect` to highlight text in sync with an HTML5 `<audio>` element."*

### Prompt 3: Studying Character Consistency in AI Prompts

> *"In NarrateMe, character consistency across DALL-E 3 images is achieved by prepending a global character description to every scene prompt. Explain the limitations of this prompt engineering approach versus image-to-image or LoRA fine-tuning."*

---

## 6. Summary Checklist for Self-Study

- [x] **Understand the Problem:** Text-only reading causes focus loss in Grades 1–3; NarrateMe automates visual + audio creation in <60s.
- [x] **Understand the API Handshake:** `POST /api/scenes` ➔ `POST /api/images` ➔ `POST /api/audio`.
- [x] **Understand Demo Resilience:** If API calls fail or timeout, `public/demo-story.json` serves as the fallback dataset.
- [x] **Understand Marketing Assets:** `MARKETING_DOCUMENTATION.md` and `docs/wireframes/` provide the full product pitch and UI vision.
