import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from statistics import stdev
from typing import List, Dict, Optional, Tuple

from app.models.emotion_log import EmotionLog
from app.models.crisis_event import CrisisEvent
from app.schemas.emotion_insight import EmotionInsight

logger = logging.getLogger(__name__)


class EmotionAnalyticsService:
    """Aggregates emotion logs into structured insights. Non-LLM."""
    
    EMOTION_TONE_MAP = {
        "sadness": {"tone": "gentle", "approach": "grounding"},
        "joy": {"tone": "affirming", "approach": "affirmation"},
        "anger": {"tone": "validating", "approach": "cognitive_reframe"},
        "fear": {"tone": "reassuring", "approach": "grounding"},
        "surprise": {"tone": "curious", "approach": "exploration"},
        "disgust": {"tone": "validating", "approach": "cognitive_reframe"},
        "neutral": {"tone": "neutral", "approach": "exploration"},
    }
    
    TRIGGER_WARNINGS = {
        "sadness": ["toxic positivity", "dismissal", "minimization"],
        "anger": ["condescension", "blame", "judgment"],
        "fear": ["uncertainty", "ambiguity", "pressure"],
        "disgust": ["minimization", "dismissal"],
    }
    
    def __init__(self):
        pass
    
    async def generate_user_insights(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 7
    ) -> EmotionInsight:
        """Generate complete emotional insight for user."""
        try:
            logs = await self._get_recent_emotions(db, user_id, days)
            
            if not logs or len(logs) < 3:
                return self._default_insight(user_id, days, insufficient=True)
            
            distribution = self._compute_distribution(logs)
            dominant = max(distribution, key=distribution.get)
            dominance_pct = distribution[dominant]
            
            trend, trend_desc = self._detect_trend(logs)
            volatility = self._compute_volatility(logs)
            sustained_sadness = distribution.get("sadness", 0) >= 0.60
            
            high_risk, crisis_count = await self._assess_risk(
                db, user_id, days, distribution
            )
            
            suggested_tone = self.EMOTION_TONE_MAP.get(dominant, {}).get("tone", "neutral")
            suggested_approach = self.EMOTION_TONE_MAP.get(dominant, {}).get("approach", "exploration")
            avoid = self.TRIGGER_WARNINGS.get(dominant, [])
            
            confidences = [log["confidence"] for log in logs]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.5
            
            return EmotionInsight(
                user_id=user_id,
                period_days=days,
                log_count=len(logs),
                insufficient_data=False,
                dominant_emotion=dominant,
                dominance_pct=dominance_pct,
                avg_confidence=avg_confidence,
                emotion_distribution=distribution,
                trend=trend,
                trend_description=trend_desc,
                volatility_flag=volatility > 0.25,
                sustained_sadness=sustained_sadness,
                high_risk=high_risk,
                crisis_count_48h=crisis_count,
                suggested_tone=suggested_tone,
                suggested_approach=suggested_approach,
                avoid_triggers=avoid,
                computed_at=datetime.now()
            )
        
        except Exception as e:
            logger.error(f"Analytics failed for user {user_id}: {str(e)}")
            return self._default_insight(user_id, days, insufficient=True)
    
    async def _get_recent_emotions(
        self,
        db: AsyncSession,
        user_id: int,
        days: int
    ) -> List[Dict]:
        """Fetch emotion logs for time window."""
        try:
            cutoff = datetime.now() - timedelta(days=days)
            
            query = select(
                EmotionLog.id,
                EmotionLog.primary_emotion,
                EmotionLog.confidence,
                EmotionLog.created_at,
                func.date(EmotionLog.created_at).label("created_date")
            ).where(
                EmotionLog.user_id == user_id,
                EmotionLog.created_at >= cutoff
            ).order_by(EmotionLog.created_at.asc())
            
            result = await db.execute(query)
            return [
                {
                    "id": row[0],
                    "primary_emotion": row[1],
                    "confidence": row[2],
                    "created_at": row[3],
                    "created_date": row[4]
                }
                for row in result.all()
            ]
        except Exception as e:
            logger.error(f"Failed to fetch emotions: {str(e)}")
            return []
    
    def _compute_distribution(self, logs: List[Dict]) -> Dict[str, float]:
        """Calculate emotion frequency distribution."""
        counts = {}
        for log in logs:
            emotion = log["primary_emotion"]
            counts[emotion] = counts.get(emotion, 0) + 1
        
        total = sum(counts.values())
        all_emotions = ["sadness", "joy", "anger", "fear", "neutral", "surprise", "disgust"]
        
        return {
            emotion: counts.get(emotion, 0) / total 
            for emotion in all_emotions
        }
    
    def _detect_trend(self, logs: List[Dict]) -> Tuple[str, str]:
        """Detect emotion trend over time."""
        if len(logs) < 3:
            return "unknown", "Insufficient data for trend"
        
        mid = len(logs) // 2
        first_half = logs[:mid]
        second_half = logs[mid:]
        
        first_dist = self._compute_distribution(first_half)
        second_dist = self._compute_distribution(second_half)
        
        first_dominant = max(first_dist, key=first_dist.get)
        second_dominant = max(second_dist, key=second_dist.get)
        
        if first_dominant == second_dominant:
            return "stable", f"Consistent {first_dominant} throughout period"
        else:
            return "changing", f"Shifted from {first_dominant} to {second_dominant}"
    
    def _compute_volatility(self, logs: List[Dict]) -> float:
        """Calculate confidence score variance."""
        confidences = [log["confidence"] for log in logs]
        if len(confidences) < 2:
            return 0.0
        return stdev(confidences)
    
    async def _assess_risk(
        self,
        db: AsyncSession,
        user_id: int,
        days: int,
        distribution: Dict[str, float]
    ) -> Tuple[bool, int]:
        """Check for risk patterns in last 48h."""
        try:
            cutoff = datetime.now() - timedelta(hours=48)
            query = select(func.count(CrisisEvent.id)).where(
                CrisisEvent.user_id == user_id,
                CrisisEvent.created_at >= cutoff
            )
            result = await db.execute(query)
            crisis_count = result.scalar() or 0
            
            high_risk = (
                crisis_count >= 2 and
                (distribution.get("sadness", 0) > 0.50 or 
                 distribution.get("anger", 0) > 0.40)
            )
            
            return high_risk, crisis_count
        
        except Exception as e:
            logger.error(f"Risk assessment failed: {str(e)}")
            return False, 0
    
    def _default_insight(
        self,
        user_id: int,
        days: int,
        insufficient: bool = False
    ) -> EmotionInsight:
        """Safe default when data unavailable."""
        return EmotionInsight(
            user_id=user_id,
            period_days=days,
            log_count=0,
            insufficient_data=insufficient,
            dominant_emotion="neutral",
            dominance_pct=0.0,
            avg_confidence=0.5,
            emotion_distribution={
                "sadness": 0.0, "joy": 0.0, "anger": 0.0,
                "fear": 0.0, "neutral": 1.0, "surprise": 0.0, "disgust": 0.0
            },
            trend="unknown",
            trend_description="No emotional data available",
            volatility_flag=False,
            sustained_sadness=False,
            high_risk=False,
            crisis_count_48h=0,
            suggested_tone="neutral",
            suggested_approach="exploration",
            avoid_triggers=[],
            computed_at=datetime.now()
        )
