from fastapi import APIRouter
from datetime import datetime
from app.services.engines.factory import (
    get_emotion_engine,
    get_llm_engine,
    get_crisis_engine
)
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "serenity-backend"
    }


@router.get("/health/engines")
def engine_health():
    """Check status of all AI engines."""
    try:
        emotion_engine = get_emotion_engine()
        llm_engine = get_llm_engine()
        crisis_engine = get_crisis_engine()
        
        return {
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "engines": {
                "emotion": {
                    "provider": settings.emotion_provider,
                    "available": emotion_engine.is_available,
                    "engine_name": emotion_engine.provider_name
                },
                "llm": {
                    "provider": settings.llm_provider,
                    "available": llm_engine.is_available,
                    "engine_name": llm_engine.provider_name
                },
                "crisis": {
                    "provider": settings.crisis_provider,
                    "available": crisis_engine.is_available,
                    "engine_name": crisis_engine.provider_name
                }
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }
