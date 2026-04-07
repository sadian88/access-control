from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import router as v1_router
from app.ml.face_engine import face_engine
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Carga el modelo InsightFace al iniciar (descarga buffalo_l si no existe)
    face_engine.load()
    yield


app = FastAPI(title="Edge Guard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")

app.mount("/media", StaticFiles(directory=settings.MEDIA_PATH), name="media")


@app.get("/health")
async def health():
    return {"status": "ok"}
