from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import settings
from src.db.connection import connect_to_mongo, close_mongo_connection
from src.api.auth import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await connect_to_mongo()
    yield
    # shutdown
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}
