from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Float,
    ForeignKey,
    JSON,
)
from sqlalchemy.sql import func
from app.db.base import Base


class ConversationContextCache(Base):
    """
    Stores cached summaries for long-running conversations so we do not need
    to recompute the truncation/summarisation cascade on every request.
    """

    __tablename__ = "conversation_context_cache"

    conversation_id = Column(
        Integer, ForeignKey("conversations.id"), primary_key=True, index=True
    )
    summary = Column(Text, nullable=True)
    last_message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    message_count = Column(Integer, default=0, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SemanticMemory(Base):
    """
    Stores vectorised representations of impactful user statements so that
    we can retrieve semantically similar memories for future prompts without
    replaying the entire transcript.
    """

    __tablename__ = "semantic_memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=False)
    emotion_label = Column(String(32), nullable=True)
    importance_score = Column(Float, default=0.0)
    source = Column(String(32), default="chat", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EmotionalProfile(Base):
    """
    Aggregated emotional fingerprint per user. Computed periodically from the
    raw emotion logs so that downstream services can use a compact summary.
    """

    __tablename__ = "emotional_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    period_days = Column(Integer, default=30, nullable=False)
    window_start = Column(DateTime(timezone=True), nullable=False)
    window_end = Column(DateTime(timezone=True), nullable=False)
    dominant_emotion = Column(String(32), nullable=True)
    dominance_pct = Column(Float, default=0.0)
    anxiety_score = Column(Float, default=0.0)
    sadness_score = Column(Float, default=0.0)
    resilience_score = Column(Float, default=0.0)
    volatility_index = Column(Float, default=0.0)
    log_count = Column(Integer, default=0)
    emotion_distribution = Column(JSON, nullable=True)
    trend = Column(String(32), nullable=True)
    computed_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MetaReflection(Base):
    """
    Higher-level summary about the user that captures repeated triggers,
    coping strategies, or improvements. Generated from conversations +
    journals so the assistant can reason about patterns rather than just
    isolated moments.
    """

    __tablename__ = "meta_reflections"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    reflection_summary = Column(Text, nullable=False)
    detected_patterns = Column(JSON, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
