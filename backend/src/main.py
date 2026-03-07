from fastapi import FastAPI
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

app.include_router(auth_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}
