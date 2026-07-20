from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.api.scenes import router as scenes_router

load_dotenv()

app = FastAPI(
    title="NarrateMe API",
    description="API for turning stories into narrated, illustrated presentations",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scenes_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
