#
# Copyright (c) 2026 Nipun Sujesh. All rights reserved.
# Licensed under the AGPLv3. See LICENSE file in the project root for details.
#
# This software is the confidential and proprietary information of Nipun Sujesh.
#

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers.health import router as health_router
from app.routers.chat import router as chat_router
from app.routers.conversations import router as conversations_router
from app.routers.auth import router as auth_router
from app.routers.emotions import router as emotions_router
from app.routers.journal import router as journal_router

app = FastAPI(
    title="Serenity Backend",
    version="0.2.0",
    description="Production-grade mental health companion API",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(emotions_router)
app.include_router(journal_router)
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
        "ollama_endpoint": settings.ollama_endpoint,
        "cors_origins": settings.cors_origins,
    }
