from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": settings.app_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
