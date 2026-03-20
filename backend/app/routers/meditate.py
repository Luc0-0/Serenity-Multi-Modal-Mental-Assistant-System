import json
import re
import logging
import httpx
from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.session import get_db
from app.models.user import User
from app.models.journal_entry import JournalEntry
from app.models.emotion_log import EmotionLog
from app.models.meditation_session import MeditationSession
from app.routers.auth import get_current_user
from app.services.engines.factory import get_llm_engine
from app.core.config import settings
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/meditate", tags=["meditate"])

VALID_PATTERNS = ("box", "calm", "deep", "wim_hof", "coherent")
VALID_EMOTIONS = ("sadness", "fear", "anger", "joy", "surprise", "disgust", "neutral")


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
        "surprise": "Sometimes things catch us off guard. This session gives you space to pause, process, and recenter.",
        "disgust": "It's natural to feel repelled or overwhelmed. This session will help you clear your mind and reset.",
        "neutral": "A quiet moment for yourself. This session brings you back to the present — nothing more, nothing less.",
    }
    patterns = {
        "fear":    "box",
        "sadness": "calm",
        "anger":   "wim_hof",
        "joy":     "coherent",
        "surprise": "box",
        "disgust": "calm",
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
- surprise: shocked, stunned
- disgust: repulsed, revolted
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


class MeditationLogRequest(BaseModel):
    pattern_used: str
    duration_seconds: int
    completed: bool
    emotion: Optional[str] = None

@router.post("/log")
async def log_meditation_session(
    request: MeditationLogRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log a completed or paused meditation session."""
    try:
        if request.duration_seconds < 60:
            return {"status": "ignored", "message": "Session too short to log (under 60s)."}

        session = MeditationSession(
            user_id=current_user.id,
            pattern_used=request.pattern_used,
            duration_seconds=request.duration_seconds,
            completed=request.completed,
            emotion=request.emotion
        )
        db.add(session)
        await db.commit()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to log meditation session: {e}")
        await db.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/stats")
async def get_meditation_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated meditation stats for the dashboard."""
    try:
        # Get all valid sessions for the user (60s or more)
        stmt = select(MeditationSession).where(
            MeditationSession.user_id == current_user.id,
            MeditationSession.duration_seconds >= 60
        ).order_by(desc(MeditationSession.created_at))
        all_sessions = (await db.execute(stmt)).scalars().all()

        total_seconds = sum(session.duration_seconds for session in all_sessions)
        
        # Calculate pattern usage
        patterns = [s.pattern_used for s in all_sessions if s.pattern_used]
        top_pattern = Counter(patterns).most_common(1)[0][0] if patterns else "None"

        # Group by day for the Mindful Matrix (Contribution Graph)
        # We will return a dictionary, where keys are dates "YYYY-MM-DD"
        history_dict: Dict[str, dict] = {}
        for session in all_sessions:
            date_str = session.created_at.strftime("%Y-%m-%d")
            if date_str not in history_dict:
                history_dict[date_str] = {
                    "date": date_str,
                    "pattern": session.pattern_used, # Use the most recent pattern for the color
                    "duration": 0,
                    "count": 0
                }
            history_dict[date_str]["duration"] += session.duration_seconds
            history_dict[date_str]["count"] += 1
            
        # Generate an AI insight based on recent activity
        insight = "Consistency brings clarity. Take a deep breath and center yourself."
        if len(all_sessions) > 5:
             insight = "Your steady practice is building a lasting foundation of calm."
        elif len(all_sessions) > 0:
             insight = "Every mindful moment counts. You are on the right path."

        return {
            "total_minutes": total_seconds // 60,
            "top_pattern": top_pattern,
            "session_count": len(all_sessions),
            "history_dict": history_dict, # Pass as dict for O(1) matching on frontend grid
            "insight": insight
        }
    except Exception as e:
        logger.error(f"Failed to fetch meditation stats: {e}")
        return {"total_minutes": 0, "top_pattern": "None", "session_count": 0, "history_dict": {}, "insight": "Start your journey today."}


# ── Voice Chat ────────────────────────────────────────────────────────────────

class VoiceChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class VoiceChatRequest(BaseModel):
    messages: List[VoiceChatMessage]
    turn: int           # 1, 2, or 3
    context: str = "guided"  # "guided" | "breathwork"

EMOTION_TO_PATTERN = {
    "fear": "box", "anxiety": "box", "stress": "box",
    "sadness": "calm", "grief": "calm", "depression": "calm",
    "anger": "wim_hof", "frustration": "wim_hof",
    "joy": "coherent", "happiness": "coherent", "gratitude": "coherent",
    "neutral": "box", "tired": "deep", "exhausted": "deep",
}

EMOTION_TO_TRACK = {
    "fear": "fear", "anxiety": "fear", "stress": "fear",
    "sadness": "fear", "grief": "fear", "anger": "fear",
    "joy": "fear", "neutral": "fear", "tired": "fear",
}

def _detect_emotion_from_text(text: str) -> Optional[str]:
    text_lower = text.lower()
    keywords = {
        "fear": ["scared", "afraid", "fear", "anxious", "anxiety", "worry", "worried", "panic", "nervous", "overwhelm"],
        "sadness": ["sad", "depressed", "down", "low", "grief", "cry", "hopeless", "empty", "lonely", "lost"],
        "anger": ["angry", "frustrated", "annoyed", "irritated", "rage", "mad", "furious", "upset"],
        "joy": ["happy", "great", "good", "excited", "grateful", "joyful", "amazing", "wonderful", "calm"],
        "tired": ["tired", "exhausted", "drained", "fatigue", "sleepy", "worn"],
    }
    for emotion, words in keywords.items():
        if any(w in text_lower for w in words):
            return emotion
    return None


@router.post("/voice-chat")
async def voice_chat(
    request: VoiceChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Multi-turn voice conversation that guides user into a meditation session.
    Max 3 user turns — always resolves to start_session by turn 3.
    Falls back to journal/emotion log data if emotion is unclear.
    """
    try:
        # For breathwork context: short single-turn guidance only
        if request.context == "breathwork":
            user_msg = request.messages[-1].content if request.messages else ""
            system = "You are a calm meditation guide. Respond in ONE sentence only. Be grounding and reassuring. Never mention specific technique names."
            prompt = f'The user is mid-breathwork session and says: "{user_msg}". Give a brief reassuring cue.'
            engine = get_llm_engine()
            text = await engine.generate(system, [{"role": "user", "content": prompt}], max_tokens=80, temperature=0.6)
            return {"text": text.strip(), "action": None}

        # Build conversation history for LLM
        history = [{"role": m.role, "content": m.content} for m in request.messages]

        # Try to detect emotion from conversation so far
        user_messages = [m.content for m in request.messages if m.role == "user"]
        combined_user_text = " ".join(user_messages)
        detected_emotion = _detect_emotion_from_text(combined_user_text)

        # Fallback to DB emotion/journal data if unclear
        if not detected_emotion:
            try:
                since = datetime.utcnow() - timedelta(days=30)
                emotion_stmt = (
                    select(EmotionLog)
                    .where(EmotionLog.user_id == current_user.id)
                    .where(EmotionLog.created_at >= since)
                    .order_by(desc(EmotionLog.created_at))
                    .limit(10)
                )
                logs = (await db.execute(emotion_stmt)).scalars().all()
                if logs:
                    counts = Counter(log.primary_emotion for log in logs)
                    detected_emotion = counts.most_common(1)[0][0]
            except Exception:
                detected_emotion = "neutral"

        pattern = EMOTION_TO_PATTERN.get(detected_emotion or "neutral", "box")
        track_id = EMOTION_TO_TRACK.get(detected_emotion or "neutral", "fear")

        # Turn 3 or emotion clearly detected after turn 2 → resolve immediately
        should_resolve = request.turn >= 3 or (request.turn == 2 and detected_emotion is not None)

        if should_resolve:
            system = (
                "You are Serenity, a warm meditation guide. "
                "Write ONE to TWO sentences that acknowledge what the user shared and signal "
                "their session is ready. Never mention breathing technique names or pattern names. "
                "Be warm, human, and poetic. End with something like 'your session is ready' or "
                "'let it carry you' — but vary the phrasing naturally."
            )
            history_for_llm = history + [{
                "role": "user",
                "content": f"[Internal: emotion={detected_emotion}, resolve now, start session]"
            }]
            engine = get_llm_engine()
            text = await engine.generate(system, history_for_llm, max_tokens=100, temperature=0.75)
            return {
                "text": text.strip(),
                "action": "start_session",
                "track_id": track_id,
                "pattern": pattern,
                "emotion": detected_emotion or "neutral",
            }

        # Turn 1 with no user messages yet → opening line
        if not user_messages:
            return {"text": "Take a breath. How are you feeling right now?", "action": None}

        # Turn 2 → follow-up if emotion not yet clear, or gentle confirmation
        system = (
            "You are Serenity, a warm meditation guide. "
            "Ask ONE question to understand how this person is feeling right now. "
            "Under 20 words. Warm and curious, not clinical. "
            "Focus on the present moment or what brought them here today. "
            "Never ask: 'why do you feel that way?', about past trauma, or anything that sounds like therapy intake. "
            "Good examples: 'What's sitting heaviest with you right now?' / 'Is there something specific on your mind?' "
            "Write only the question."
        )
        engine = get_llm_engine()
        text = await engine.generate(system, history, max_tokens=60, temperature=0.7)
        return {"text": text.strip(), "action": None}

    except Exception as e:
        logger.error(f"Voice chat failed: {e}")
        return {
            "text": "I've prepared your session. Let it carry you.",
            "action": "start_session",
            "track_id": "fear",
            "pattern": "box",
            "emotion": "neutral",
        }


# ── Kokoro TTS Speak ──────────────────────────────────────────────────────────

class SpeakRequest(BaseModel):
    text: str

@router.post("/speak")
async def speak(
    request: SpeakRequest,
    current_user: User = Depends(get_current_user),
):
    """Proxy text to Kokoro TTS and stream audio back to client."""
    if not settings.kokoro_url:
        # No Kokoro configured — return 204 so frontend falls back to browser TTS
        return Response(status_code=204)

    text = request.text.strip()[:500]  # cap length for safety

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.kokoro_url}/v1/audio/speech",
                json={
                    "model": "kokoro",
                    "input": text,
                    "voice": settings.kokoro_voice,
                    "response_format": "mp3",
                },
            )
            resp.raise_for_status()
            audio_bytes = resp.content

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-cache"},
        )
    except Exception as e:
        logger.error(f"Kokoro TTS failed: {e}")
        return Response(status_code=204)
