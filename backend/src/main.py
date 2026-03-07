from fastapi import FastAPI

from src.config import settings
from src.api.auth import router as auth_router

app = FastAPI(
    title=settings.PROJECT_NAME
)

app.include_router(auth_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}
