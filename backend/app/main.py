#
# Copyright (c) 2026 Nipun Sujesh. All rights reserved.
# Licensed under the AGPLv3. See LICENSE file in the project root for details.
#
# This software is the confidential and proprietary information of Nipun Sujesh.
#

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.limiter import limiter
from app.routers.health import router as health_router
from app.routers.chat import router as chat_router
from app.routers.conversations import router as conversations_router
from app.routers.auth import router as auth_router
from app.routers.emotions import router as emotions_router
from app.routers.journal import router as journal_router
from app.routers.meditate import router as meditate_router
from app.routers.goals import router as goals_router
from app.services.engines.factory import init_engines
import logging
import sys

# Route all app logs to stdout (same stream as uvicorn access logs) so Railway
# displays them in correct chronological order instead of interleaved from stderr.
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(levelname)s: %(name)s — %(message)s",
    force=True,
)

logger = logging.getLogger(__name__)

# Middleware to trust X-Forwarded-Proto from Railway proxy
class TrustedProxyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # If behind proxy and X-Forwarded-Proto is set, update the scheme
        if "x-forwarded-proto" in request.headers:
            request.scope["scheme"] = request.headers["x-forwarded-proto"]
        response = await call_next(request)
        return response

app = FastAPI(
    title="Serenity Backend",
    version="0.2.0",
    description="Production-grade mental health companion API",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add proxy middleware LAST so it runs FIRST (before CORS checks)
app.add_middleware(TrustedProxyMiddleware)

# Global service instances
emotion_service = None
llm_service = None
crisis_service = None

@app.on_event("startup")
async def startup_event():
    """Initialize engines and services at startup."""
    global emotion_service, llm_service, crisis_service
    
    logger.info("Starting engine initialization...")
    await init_engines()
    logger.info("Engines initialized. Creating services...")
    
    from app.services.emotion_service import EmotionService
    from app.services.llm_service import LLMService
    from app.services.crisis_service_new import CrisisService
    
    emotion_service = EmotionService()
    logger.info(f"✓ Emotion service created (using {emotion_service.engine.provider_name})")
    
    llm_service = LLMService()
    logger.info(f"✓ LLM service created (using {llm_service.engine.provider_name})")
    
    crisis_service = CrisisService()
    logger.info(f"✓ Crisis service created (using keyword-based detection)")

    # Warm heavy embedding model in background so first chat does not block.
    from app.services.embedding_service import embedding_service

    embedding_service.start_background_warmup()
    logger.info("✓ Embedding model warmup scheduled")
    
    logger.info("✓ All services initialized successfully")

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(emotions_router)
app.include_router(journal_router)
app.include_router(meditate_router)
app.include_router(goals_router)
app.include_router(chat_router)
app.include_router(conversations_router)


@app.get("/")
def root():
    return {
        "message": "Serenity Backend Running",
        "environment": settings.environment,
        "debug": settings.debug,
    }


@app.get("/config")
def get_config():
    """
    Retrieve current application configuration.
    """
    if not settings.debug:
        return {"error": "Not available in production"}
    
    return {
        "app_name": settings.app_name,
        "environment": settings.environment,
        "database_url": "***" if settings.database_url else None,
        "gemini_endpoint": settings.gemini_endpoint,
        "cors_origins": settings.cors_origins,
    }
