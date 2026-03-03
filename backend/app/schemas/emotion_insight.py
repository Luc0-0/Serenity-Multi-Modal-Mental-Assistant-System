from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime


class EmotionInsight(BaseModel):
    """Structured emotional intelligence object for analytics and LLM context."""
    
    user_id: int
    period_days: int
    
    log_count: int
    insufficient_data: bool
    
    dominant_emotion: str
    dominance_pct: float
    avg_confidence: float
    
    emotion_distribution: Dict[str, float]
    
    trend: str
    trend_description: str
    
    volatility_flag: bool
    sustained_sadness: bool
    high_risk: bool
    crisis_count_48h: int
    
    suggested_tone: str
    suggested_approach: str
    avoid_triggers: List[str]
    
    computed_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
