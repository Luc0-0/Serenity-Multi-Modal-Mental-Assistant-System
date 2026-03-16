import json
import re
import logging
from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.session import get_db
from app.models.user import User
from app.models.journal_entry import JournalEntry
from app.models.emotion_log import EmotionLog
from app.routers.auth import get_current_user
from app.services.engines.factory import get_llm_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/meditate", tags=["meditate"])

VALID_PATTERNS = ("box", "calm", "deep", "wim_hof", "coherent")
VALID_EMOTIONS = ("sadness", "fear", "anger", "joy", "neutral")


def _extract_json(text: str) -> str:
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```", "", text).strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        return text[start:end]
    return text


def _fallback(emotion: str = "neutral") -> dict:
    insights = {
        "fear":    "Your mind has been carrying a lot of weight lately. This session will help you slow down and find steady ground beneath you.",
        "sadness": "You've been feeling the heaviness of things recently. This session offers a moment of warmth and gentleness — just for you.",
        "anger":   "There's been a lot of friction and frustration in your days. This session is here to help you release that heat and return to yourself.",
        "joy":     "You're in a good place right now. This session will help you stay grounded in it and carry that warmth forward.",
        "neutral": "A quiet moment for yourself. This session brings you back to the present — nothing more, nothing less.",
    }
    patterns = {
        "fear":    "box",
        "sadness": "calm",
        "anger":   "wim_hof",
        "joy":     "coherent",
        "neutral": "box",
    }
    return {
        "suggested_pattern": patterns.get(emotion, "box"),
        "emotion": emotion,
        "insight": insights.get(emotion, insights["neutral"]),
    }


@router.get("/suggest")
async def get_meditation_suggestion(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a personalised meditation suggestion based on recent emotion and journal data."""
    dominant_emotion = "neutral"
    try:
        since = datetime.utcnow() - timedelta(days=30)
        emotion_stmt = (
            select(EmotionLog)
            .where(EmotionLog.user_id == current_user.id)
            .where(EmotionLog.created_at >= since)
            .order_by(desc(EmotionLog.created_at))
            .limit(20)
        )
        emotion_logs = (await db.execute(emotion_stmt)).scalars().all()

        journal_stmt = (
            select(JournalEntry)
            .where(JournalEntry.user_id == current_user.id)
            .order_by(desc(JournalEntry.created_at))
            .limit(5)
        )
        journal_entries = (await db.execute(journal_stmt)).scalars().all()

        if emotion_logs:
            counts = Counter(log.primary_emotion for log in emotion_logs)
            top = counts.most_common(3)
            emotion_context = "Recent emotions: " + ", ".join(f"{e} ({c}x)" for e, c in top)
            dominant_emotion = counts.most_common(1)[0][0]
        else:
            emotion_context = "No recent emotion data."

        if journal_entries:
            excerpts = []
            for e in journal_entries[:3]:
                text = (e.content or "")[:150]
                excerpts.append(f"[{e.emotion or 'neutral'}] {text}")
            journal_context = "Recent journal excerpts:\n" + "\n---\n".join(excerpts)
        else:
            journal_context = "No recent journal entries."

        system_prompt = "You are Serenity's meditation guide. Respond with ONLY valid JSON, no markdown, no extra text."

        user_prompt = f"""Analyze this user's emotional data and return ONLY this JSON object:

{emotion_context}
{journal_context}

Return ONLY:
{{
  "suggested_pattern": "<box | calm | deep | wim_hof | coherent>",
  "emotion": "<sadness | fear | anger | joy | neutral>",
  "insight": "<2-3 warm, personal sentences explaining what you notice in their data and why this session will help them. Reference their actual emotional patterns. Speak directly to them as 'you'.>"
}}

Pattern rules:
- box (4-4-4-4): anxiety, stress, racing thoughts — structured reset
- calm (4-7-8): deep tension, insomnia, agitation — nervous system slowdown
- deep (5-5): sadness, low energy, grounding needed — gentle activation
- wim_hof (30 breaths + hold): anger, frustration, high arousal — controlled intensity release
- coherent (5-5): emotional balance, general wellbeing, joy — heart rate coherence

Emotion rules (pick the single most dominant):
- fear: anxious, stressed, overwhelmed, worried
- sadness: sad, depressed, lonely, hopeless
- anger: angry, frustrated, irritated
- joy: happy, grateful, excited
- neutral: calm, fine, mixed, or no data"""

        engine = get_llm_engine()
        raw = await engine.generate(
            system_prompt,
            [{"role": "user", "content": user_prompt}],
            max_tokens=300,
            temperature=0.7,
        )

        data = json.loads(_extract_json(raw))

        if data.get("suggested_pattern") not in VALID_PATTERNS:
            data["suggested_pattern"] = "box"
        if data.get("emotion") not in VALID_EMOTIONS:
            data["emotion"] = dominant_emotion
        if not data.get("insight"):
            data["insight"] = _fallback(data["emotion"])["insight"]

        return data

    except json.JSONDecodeError as e:
        logger.warning(f"Meditation JSON parse failed: {e}")
        return _fallback(dominant_emotion)
    except Exception as e:
        logger.error(f"Meditation suggest failed: {e}")
        return _fallback()
