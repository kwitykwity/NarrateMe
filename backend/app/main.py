import os
import logging
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.scenes import router as scenes_router
from app.api.images import router as images_router
from app.api.audio import router as audio_router
from app.api.owl import router as owl_router

app = FastAPI(
    title="NarrateMe API",
    description="API for turning stories into narrated, illustrated presentations",
    version="0.1.0",
)

# Allowed frontend origins, comma-separated in CORS_ORIGINS (e.g. the Vercel URL in
# prod). Falls back to the local dev frontend so local setups need no config.
cors_origins = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scenes_router)
app.include_router(images_router)
app.include_router(audio_router)
app.include_router(owl_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
