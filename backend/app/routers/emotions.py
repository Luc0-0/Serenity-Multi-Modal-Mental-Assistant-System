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
            "total_logs": 0,
            "period_days": days,
            "emotion_frequency": {},
            "dominant_emotion": None,
            "trend": "no_data",
            "volatility": 0.0
        }
    
    try:
        from app.services.emotion_analytics_service import EmotionAnalyticsService
        service = EmotionAnalyticsService()
        insight = await service.generate_user_insights(db, current_user.id, days)
        
        data = insight.dict()
        data["total_logs"] = data["log_count"]
        # Map trend string to front-end expected 'fluctuating' if not stable
        if data["trend"] in ("changing", "unknown"):
            data["trend"] = "fluctuating"
            
        return data
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


@router.get("/weekly-summary/")
async def get_weekly_summary(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an LLM-written personalised reflection on the user's emotional period."""
    import app.main as main_app

    try:
        since_date = datetime.utcnow() - timedelta(days=days)
        stmt = select(EmotionLog).where(
            (EmotionLog.user_id == current_user.id) &
            (EmotionLog.created_at >= since_date)
        ).order_by(EmotionLog.created_at.asc())

        result = await db.execute(stmt)
        logs = result.scalars().all()

        if not logs or len(logs) < 3:
            return {"summary": "", "generated": False}

        emotion_counts = {}
        daily_breakdown = {}

        for log in logs:
            label = log.primary_emotion or "unknown"
            emotion_counts[label] = emotion_counts.get(label, 0) + 1
            day_key = log.created_at.date().isoformat() if log.created_at else "unknown"
            if day_key not in daily_breakdown:
                daily_breakdown[day_key] = {}
            daily_breakdown[day_key][label] = daily_breakdown[day_key].get(label, 0) + 1

        total = len(logs)
        dominant = max(emotion_counts, key=emotion_counts.get)
        dominance_pct = emotion_counts[dominant] / total

        summary = await main_app.llm_service.generate_weekly_summary(
            dominant_emotion=dominant,
            dominance_pct=dominance_pct,
            total_logs=total,
            daily_breakdown=daily_breakdown,
            days=days,
        )

        return {"summary": summary, "generated": bool(summary)}
    except Exception as e:
        logger.error(f"Failed to generate weekly summary: {str(e)}")
        return {"summary": "", "generated": False}


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
        "joy": "affirming",
        "sadness": "gentle",
        "anger": "validating",
        "fear": "reassuring",
        "surprise": "curious",
        "disgust": "validating",
        "neutral": "balanced",
    }
    return tone_map.get(dominant_emotion, "balanced")


def suggest_approach(dominant_emotion: str) -> str:
    """Suggest approach."""
    approach_map = {
        "joy": "affirmation",
        "sadness": "grounding",
        "anger": "cognitive_reframe",
        "fear": "grounding",
        "surprise": "exploration",
        "disgust": "cognitive_reframe",
        "neutral": "exploration",
    }
    return approach_map.get(dominant_emotion, "exploration")


def is_high_risk(emotion_counts: dict) -> bool:
    """Check for high-risk patterns."""
    if not emotion_counts:
        return False
    
    high_risk_emotions = {"sadness", "anger", "fear", "disgust"}
    total = sum(emotion_counts.values())
    
    for emotion, count in emotion_counts.items():
        if emotion in high_risk_emotions and (count / total) > 0.4:
            return True
    
    return False
