import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from app.db.session import get_db
from app.models.user import User
from app.models.emotion_log import EmotionLog
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/emotions", tags=["emotions"])


@router.get("/insights/")
async def get_emotion_insights(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve emotion insights."""
    if not current_user:
        return {
            "user_id": None,
            "period_days": days,
            "emotion_frequency": {},
            "dominant_emotion": None,
            "total_logs": 0,
            "trend": "no_data",
            "volatility": 0.0
        }
    
    try:
        since_date = datetime.utcnow() - timedelta(days=days)
        
        stmt = select(EmotionLog).where(
            (EmotionLog.user_id == current_user.id) &
            (EmotionLog.created_at >= since_date)
        ).order_by(EmotionLog.created_at.desc())
        
        result = await db.execute(stmt)
        emotion_logs = result.scalars().all()
        
        if not emotion_logs:
            return {
                "user_id": current_user.id,
                "period_days": days,
                "emotion_frequency": {},
                "dominant_emotion": None,
                "total_logs": 0,
                "trend": "no_data",
                "volatility": 0.0
            }
        
        emotion_counts = {}
        emotion_confidence = {}
        daily_breakdown = {}  # Daily emotion tracking
        
        for log in emotion_logs:
            label = log.primary_emotion or "unknown"
            emotion_counts[label] = emotion_counts.get(label, 0) + 1
            if label not in emotion_confidence:
                emotion_confidence[label] = []
            emotion_confidence[label].append(log.confidence or 0.5)
            
            # Track by day (YYYY-MM-DD)
            day_key = log.created_at.date().isoformat() if log.created_at else "unknown"
            if day_key not in daily_breakdown:
                daily_breakdown[day_key] = {}
            daily_breakdown[day_key][label] = daily_breakdown[day_key].get(label, 0) + 1
        
        dominant_emotion = max(emotion_counts, key=emotion_counts.get) if emotion_counts else None
        dominance_pct = (emotion_counts.get(dominant_emotion, 0) / len(emotion_logs)) if emotion_logs else 0
        
        volatility = calculate_volatility([log.confidence or 0.5 for log in emotion_logs])
        
        return {
            "user_id": current_user.id,
            "period_days": days,
            "emotion_frequency": emotion_counts,
            "dominant_emotion": dominant_emotion,
            "dominance_pct": dominance_pct,
            "total_logs": len(emotion_logs),
            "trend": "stable" if volatility < 0.2 else "fluctuating",
            "volatility": volatility,
            "suggested_tone": suggest_tone(dominant_emotion),
            "suggested_approach": suggest_approach(dominant_emotion),
            "high_risk": is_high_risk(emotion_counts),
            "daily_breakdown": daily_breakdown  # Include daily breakdown
        }
    except Exception as e:
        logger.error(f"Failed to get emotion insights: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch insights")


@router.get("/history/")
async def get_emotion_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve emotion history."""
    try:
        stmt = select(EmotionLog).where(
            EmotionLog.user_id == current_user.id
        ).order_by(EmotionLog.created_at.desc()).limit(limit)
        
        result = await db.execute(stmt)
        emotion_logs = result.scalars().all()
        
        return {
            "user_id": current_user.id,
            "emotions": [
                {
                    "id": log.id,
                    "label": log.primary_emotion,
                    "confidence": log.confidence,
                    "created_at": log.created_at.isoformat() if log.created_at else None
                }
                for log in emotion_logs
            ],
            "total": len(emotion_logs)
        }
    except Exception as e:
        logger.error(f"Failed to get emotion history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch emotion history")


@router.get("/daily-summary/")
async def get_daily_summary(
    date: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve daily summary."""
    try:
        if date:
            target_date = datetime.fromisoformat(date)
        else:
            target_date = datetime.utcnow()
        
        start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        
        stmt = select(EmotionLog).where(
            (EmotionLog.user_id == current_user.id) &
            (EmotionLog.created_at >= start) &
            (EmotionLog.created_at < end)
        ).order_by(EmotionLog.created_at.asc())
        
        result = await db.execute(stmt)
        emotion_logs = result.scalars().all()
        
        emotion_counts = {}
        for log in emotion_logs:
            label = log.primary_emotion or "unknown"
            emotion_counts[label] = emotion_counts.get(label, 0) + 1
        
        dominant = max(emotion_counts, key=emotion_counts.get) if emotion_counts else None
        
        return {
            "user_id": current_user.id,
            "date": start.date().isoformat(),
            "emotion_frequency": emotion_counts,
            "dominant_emotion": dominant,
            "total_logs": len(emotion_logs),
            "emotions": [
                {
                    "id": log.id,
                    "label": log.primary_emotion,
                    "confidence": log.confidence,
                    "created_at": log.created_at.isoformat() if log.created_at else None
                }
                for log in emotion_logs
            ]
        }
    except Exception as e:
        logger.error(f"Failed to get daily summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch daily summary")


def calculate_volatility(confidences: list) -> float:
    """Calculate volatility."""
    if not confidences or len(confidences) < 2:
        return 0.0
    
    mean = sum(confidences) / len(confidences)
    variance = sum((x - mean) ** 2 for x in confidences) / len(confidences)
    return min(variance ** 0.5, 1.0)


def suggest_tone(dominant_emotion: str) -> str:
    """Suggest tone."""
    tone_map = {
        "happy": "uplifting",
        "sad": "compassionate",
        "anxious": "calming",
        "angry": "supportive",
        "neutral": "balanced",
        "stressed": "reassuring",
        "calm": "encouraging"
    }
    return tone_map.get(dominant_emotion, "balanced")


def suggest_approach(dominant_emotion: str) -> str:
    """Suggest approach."""
    approach_map = {
        "happy": "reinforce_positive",
        "sad": "provide_comfort",
        "anxious": "grounding_techniques",
        "angry": "validate_feelings",
        "neutral": "open_exploration",
        "stressed": "stress_management",
        "calm": "deepen_reflection"
    }
    return approach_map.get(dominant_emotion, "balanced_exploration")


def is_high_risk(emotion_counts: dict) -> bool:
    """Check for high-risk patterns."""
    if not emotion_counts:
        return False
    
    high_risk_emotions = {"sad", "anxious", "stressed", "angry", "suicidal", "hopeless"}
    total = sum(emotion_counts.values())
    
    for emotion, count in emotion_counts.items():
        if emotion in high_risk_emotions and (count / total) > 0.4:
            return True
    
    return False
