from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import select, update, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import (
    ConversationContextCache,
    SemanticMemory,
    EmotionalProfile as EmotionalProfileModel,
    MetaReflection as MetaReflectionModel,
)
from app.models.message import Message
from app.models.journal_entry import JournalEntry
from app.schemas.memory import (
    MemoryBundle,
    ShortTermContext,
    SemanticMemorySnippet,
    EmotionalProfileSummary,
    MetaReflectionSummary,
)
from app.services.embedding_service import embedding_service
from app.services.emotion_analytics_service import EmotionAnalyticsService

logger = logging.getLogger(__name__)


class MemoryService:
    """
    Coordinates all layered memory features:
    - short-term cached context summaries
    - semantic long-term recall
    - structured emotional profiles
    - meta reflections
    """

    SEMANTIC_LIMIT = 3
    PROFILE_TTL = timedelta(hours=12)
    REFLECTION_TTL = timedelta(days=2)

    def __init__(self) -> None:
        self.analytics_service = EmotionAnalyticsService()

    async def build_memory_bundle(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        conversation_id: int,
        history: List[dict],
        user_message: str,
    ) -> MemoryBundle:
        summary, trimmed_history = self._extract_summary(history)
        await self._upsert_context_cache(
            db=db,
            conversation_id=conversation_id,
            summary=summary,
            message_count=len(trimmed_history),
        )

        semantic = await self._retrieve_semantic_memories(
            db=db, user_id=user_id, reference_text=user_message
        )
        emotional_profile = await self._get_or_compute_profile(db=db, user_id=user_id)
        meta_reflection = await self._get_meta_reflection(
            db=db, user_id=user_id, profile=emotional_profile
        )

        return MemoryBundle(
            short_term=ShortTermContext(summary=summary, recent_messages=trimmed_history),
            semantic_memories=semantic,
            emotional_profile=emotional_profile,
            meta_reflection=meta_reflection,
        )

    async def maybe_store_semantic_memory(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        conversation_id: int,
        message_id: int,
        message_text: str,
        emotion_label: Optional[str],
        source: str = "chat",
    ) -> None:
        score = self._score_importance(message_text, emotion_label)
        if score < 0.55:
            return

        embedding = await embedding_service.embed(message_text)
        if not embedding:
            return

        memory = SemanticMemory(
            user_id=user_id,
            message_id=message_id,
            conversation_id=conversation_id,
            content=message_text,
            embedding=embedding,
            emotion_label=emotion_label,
            importance_score=score,
            source=source,
        )
        db.add(memory)
        await db.flush()

    async def _upsert_context_cache(
        self,
        *,
        db: AsyncSession,
        conversation_id: int,
        summary: Optional[str],
        message_count: int,
    ) -> None:
        existing = await db.execute(
            select(ConversationContextCache).where(
                ConversationContextCache.conversation_id == conversation_id
            )
        )
        row = existing.scalar_one_or_none()
        if row:
            await db.execute(
                update(ConversationContextCache)
                .where(ConversationContextCache.conversation_id == conversation_id)
                .values(summary=summary, message_count=message_count)
            )
        else:
            cache = ConversationContextCache(
                conversation_id=conversation_id,
                summary=summary,
                message_count=message_count,
            )
            db.add(cache)
        await db.flush()

    def _extract_summary(self, history: List[dict]):
        summary = None
        trimmed = []
        for message in history:
            if (
                message.get("role") == "system"
                and message.get("content", "").startswith("[CONTEXT SUMMARY]")
            ):
                text = message.get("content", "")
                summary = text.replace("[CONTEXT SUMMARY]", "", 1).strip()
            else:
                trimmed.append(message)
        return summary, trimmed

    async def _retrieve_semantic_memories(
        self,
        *,
        db: AsyncSession,
        user_id: int,
        reference_text: str,
    ) -> List[SemanticMemorySnippet]:
        reference_embedding = await embedding_service.embed(reference_text)
        if not reference_embedding:
            return []

        result = await db.execute(
            select(SemanticMemory)
                .where(SemanticMemory.user_id == user_id)
                .order_by(desc(SemanticMemory.importance_score))
                .limit(50)
        )
        candidates = result.scalars().all()

        scored = []
        for memory in candidates:
            try:
                similarity = self._cosine_similarity(reference_embedding, memory.embedding)
            except Exception:
                similarity = 0.0
            if similarity <= 0:
                continue
            scored.append(
                SemanticMemorySnippet(
                    content=memory.content,
                    emotion_label=memory.emotion_label,
                    importance=memory.importance_score or 0.0,
                    match_score=similarity,
                    source=memory.source,
                )
            )

        scored.sort(key=lambda item: item.match_score, reverse=True)
        return scored[: self.SEMANTIC_LIMIT]

    async def _get_or_compute_profile(
        self, *, db: AsyncSession, user_id: int
    ) -> Optional[EmotionalProfileSummary]:
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(EmotionalProfileModel)
            .where(EmotionalProfileModel.user_id == user_id)
            .order_by(desc(EmotionalProfileModel.computed_at))
            .limit(1)
        )
        profile_row = result.scalar_one_or_none()
        if (
            profile_row
            and profile_row.computed_at
            and now - profile_row.computed_at <= self.PROFILE_TTL
        ):
            return EmotionalProfileSummary(
                dominant_emotion=profile_row.dominant_emotion,
                dominance_pct=profile_row.dominance_pct or 0.0,
                volatility_index=profile_row.volatility_index or 0.0,
                resilience_score=profile_row.resilience_score or 0.0,
                log_count=profile_row.log_count or 0,
                trend=profile_row.trend,
                computed_at=profile_row.computed_at,
            )

        insight = await self.analytics_service.generate_user_insights(
            db=db, user_id=user_id, days=30
        )
        profile_data = EmotionalProfileModel(
            user_id=user_id,
            period_days=insight.period_days,
            window_start=(now - timedelta(days=insight.period_days)).replace(tzinfo=timezone.utc),
            window_end=now.replace(tzinfo=timezone.utc),
            dominant_emotion=insight.dominant_emotion,
            dominance_pct=insight.dominance_pct,
            anxiety_score=insight.emotion_distribution.get("fear", 0.0)
            + insight.emotion_distribution.get("anxious", 0.0),
            sadness_score=insight.emotion_distribution.get("sadness", 0.0),
            resilience_score=max(0.0, 1.0 - (insight.volatility_flag * 0.5)),
            volatility_index=1.0 if insight.volatility_flag else 0.0,
            log_count=insight.log_count,
            emotion_distribution=insight.emotion_distribution,
            trend=insight.trend,
        )
        if profile_row:
            profile_row.dominant_emotion = profile_data.dominant_emotion
            profile_row.dominance_pct = profile_data.dominance_pct
            profile_row.anxiety_score = profile_data.anxiety_score
            profile_row.sadness_score = profile_data.sadness_score
            profile_row.resilience_score = profile_data.resilience_score
            profile_row.volatility_index = profile_data.volatility_index
            profile_row.log_count = profile_data.log_count
            profile_row.emotion_distribution = profile_data.emotion_distribution
            profile_row.trend = profile_data.trend
            profile_row.window_start = profile_data.window_start
            profile_row.window_end = profile_data.window_end
            profile_row.computed_at = datetime.now(timezone.utc)
        else:
            db.add(profile_data)
            profile_data.computed_at = datetime.now(timezone.utc)
        await db.flush()

        return EmotionalProfileSummary(
            dominant_emotion=profile_data.dominant_emotion,
            dominance_pct=profile_data.dominance_pct or 0.0,
            volatility_index=profile_data.volatility_index or 0.0,
            resilience_score=profile_data.resilience_score or 0.0,
            log_count=profile_data.log_count or 0,
            trend=profile_data.trend,
            computed_at=datetime.now(timezone.utc),
        )

    async def _get_meta_reflection(
        self,
        *,
        db: AsyncSession,
        user_id: int,
        profile: Optional[EmotionalProfileSummary],
    ) -> Optional[MetaReflectionSummary]:
        result = await db.execute(
            select(MetaReflectionModel)
            .where(MetaReflectionModel.user_id == user_id)
            .order_by(desc(MetaReflectionModel.generated_at))
            .limit(1)
        )
        reflection = result.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if (
            reflection
            and reflection.generated_at
            and now - reflection.generated_at <= self.REFLECTION_TTL
        ):
            return MetaReflectionSummary(
                summary=reflection.reflection_summary,
                detected_patterns=reflection.detected_patterns,
                generated_at=reflection.generated_at,
            )

        synthesized = await self._synthesise_reflection(db=db, user_id=user_id, profile=profile)
        model = MetaReflectionModel(
            user_id=user_id,
            reflection_summary=synthesized.summary or "",
            detected_patterns=synthesized.detected_patterns,
        )
        db.add(model)
        await db.flush()
        return MetaReflectionSummary(
            summary=model.reflection_summary,
            detected_patterns=model.detected_patterns,
            generated_at=model.generated_at,
        )

    async def _synthesise_reflection(
        self,
        *,
        db: AsyncSession,
        user_id: int,
        profile: Optional[EmotionalProfileSummary],
    ) -> MetaReflectionSummary:
        journal_q = await db.execute(
            select(JournalEntry)
            .where(JournalEntry.user_id == user_id)
            .order_by(desc(JournalEntry.created_at))
            .limit(5)
        )
        journals = journal_q.scalars().all()
        tags = []
        for entry in journals:
            if isinstance(entry.tags, list):
                tags.extend(entry.tags)
            elif isinstance(entry.tags, str):
                tags.extend(entry.tags.split(","))

        tag_summary = ", ".join(sorted(set(tag for tag in tags if tag))) or "No tags logged recently."

        dom = profile.dominant_emotion if profile else "neutral"
        dominance_pct = round((profile.dominance_pct or 0.0) * 100)
        resilience = round((profile.resilience_score or 0.0) * 100)

        summary = (
            f"Dominant emotion over the last month: {dom} ({dominance_pct}% of logs). "
            f"Resilience indicators sit near {resilience}%. "
            f"Recent entries mention: {tag_summary}."
        )
        patterns = {
            "dominant_emotion": dom,
            "trend": profile.trend if profile else None,
            "journal_tags": list(sorted(set(tags))) if tags else [],
        }
        return MetaReflectionSummary(summary=summary, detected_patterns=patterns)

    def _score_importance(self, text: str, emotion_label: Optional[str]) -> float:
        if not text:
            return 0.0
        score = min(len(text) / 400.0, 0.4)
        strong_emotions = {"sadness", "fear", "anger", "hopeless"}
        if emotion_label and emotion_label.lower() in strong_emotions:
            score += 0.25
        markers = ["always", "never", "I feel", "I've been", "no one", "worthless"]
        if any(marker.lower() in text.lower() for marker in markers):
            score += 0.25
        if "suicide" in text.lower() or "harm myself" in text.lower():
            score += 0.4
        return min(score, 1.0)

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5 or 1.0
        norm_b = sum(x * x for x in b) ** 0.5 or 1.0
        # Clamp to [0, 1] to handle floating-point precision issues
        return min(1.0, max(0.0, dot / (norm_a * norm_b)))


memory_service = MemoryService()
