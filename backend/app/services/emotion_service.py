import logging
from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.emotion_log import EmotionLog
from app.models.message import Message
from app.services.engines.factory import get_emotion_engine

logger = logging.getLogger(__name__)


class EmotionService:
    """Detects emotion from text and logs to database."""
    
    def __init__(self):
        self.engine = get_emotion_engine()
    
    async def detect_emotion(self, text: str) -> Dict[str, any]:
        """Detect emotion using configured engine."""
        try:
            return await self.engine.analyze(text)
        except Exception as e:
            logger.error(f"Emotion detection failed: {e}")
            return {
                "label": "neutral",
                "confidence": 0.5,
                "provider": "error_fallback"
            }
    
    async def log_emotion(
        self,
        db: AsyncSession,
        user_id: int,
        conversation_id: int,
        message_id: int,
        label: str,
        confidence: float
    ) -> Optional[int]:
        """Log emotion."""
        try:
            # Create ORM object
            emotion_log = EmotionLog(
                user_id=user_id,
                conversation_id=conversation_id,
                message_id=message_id,
                primary_emotion=label,
                confidence=confidence,
                intensity=None,  # Future intensity calculation
                tags=None,
                notes=None
            )
            
            # Add to session
            db.add(emotion_log)
            
            # Flush to get ID (but don't commit yet)
            await db.flush()
            emotion_id = emotion_log.id
            
            print(f"✓ Emotion logged: user={user_id}, conversation={conversation_id}, message={message_id}, emotion={label}, confidence={confidence}, emotion_log_id={emotion_id}")
            
            return emotion_id
            
        except Exception as e:
            print(f"✗ Failed to log emotion: {str(e)}")
            # Don't raise - let chat continue
            return None
    
    async def detect_crisis_signals(self, message: str) -> bool:
        """Detect crisis signals - only for actual harm indicators, not sadness."""
        # Only detect actual crisis keywords related to self-harm or suicide
        crisis_keywords = [
            "hurt myself",
            "cut myself",
            "kill myself",
            "suicide",
            "suicidal",
            "end it all",
            "overdose",
            "not worth living",
            "better off dead",
            "want to die",
            "don't want to live",
            "harm myself"
        ]
        
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in crisis_keywords)
