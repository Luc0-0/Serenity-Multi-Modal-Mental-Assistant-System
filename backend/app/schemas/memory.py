from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class SemanticMemorySnippet(BaseModel):
    content: str
    emotion_label: Optional[str] = None
    importance: float = Field(default=0.0, ge=0.0, le=1.0)
    match_score: float = Field(default=0.0, ge=0.0, le=1.0)
    source: str = "chat"


class ShortTermContext(BaseModel):
    summary: Optional[str]
    recent_messages: List[Dict[str, str]]


class EmotionalProfileSummary(BaseModel):
    dominant_emotion: Optional[str] = None
    dominance_pct: float = 0.0
    volatility_index: float = 0.0
    resilience_score: float = 0.0
    log_count: int = 0
    trend: Optional[str] = None
    computed_at: Optional[datetime] = None


class MetaReflectionSummary(BaseModel):
    summary: Optional[str] = None
    detected_patterns: Optional[Dict[str, Any]] = None
    generated_at: Optional[datetime] = None


class MemoryBundle(BaseModel):
    short_term: ShortTermContext
    semantic_memories: List[SemanticMemorySnippet]
    emotional_profile: Optional[EmotionalProfileSummary] = None
    meta_reflection: Optional[MetaReflectionSummary] = None
