from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.emotion_log import EmotionLog
from app.models.message import Message
from app.core.config import settings
import os

# Lazy load classifier
_emotion_classifier = None


def _get_emotion_classifier():
    """Lazy load emotion classifier."""
    global _emotion_classifier
    if _emotion_classifier is None:
        from app.services.xlnet_classifier import get_emotion_classifier
        _emotion_classifier = get_emotion_classifier()
    return _emotion_classifier


class EmotionService:
    """Detects emotion from text and logs to database."""
     
    EMOTION_KEYWORDS = {
        "sadness": [
            "sad", "depressed", "down", "hopeless", "blue", "miserable", "unhappy",
            "devastated", "heartbroken", "grief", "sorrowful", "melancholy", "gloomy",
            "failing", "alone", "lonely", "nobody", "understand"
        ],
        "joy": [
            "happy", "excited", "joyful", "delighted", "pleased", "wonderful", "good",
            "great", "awesome", "love", "grateful", "blessed", "thrilled", "proud",
            "hope", "better", "helped", "acknowledged", "learning", "handle", "kinder"
        ],
        "fear": [
            "scared", "anxious", "afraid", "terrified", "nervous", "worried",
            "panic", "dread", "fearful", "stressed", "overwhelmed", "concerned",
            "deadlines", "barely", "sleep", "thinking", "going back", "forth"
        ],
        "anger": [
            "angry", "furious", "rage", "frustrated", "irritated", "annoyed",
            "mad", "enraged", "livid", "outraged", "pissed"
        ],
        "surprise": [
            "shocked", "stunned", "amazed", "astonished", "surprised", "startled",
            "unexpected", "wow", "unbelievable"
        ],
        "disgust": [
            "disgusted", "repulsed", "gross", "nasty", "yuck", "revolted",
            "sick", "vile", "abhorrent", "loathsome"
        ]
    }
    
    def __init__(self, use_xlnet: bool = None):
        """Initialize service."""
        if use_xlnet is None:
            use_xlnet = os.getenv("USE_XLNET", "false").lower() == "true"
        
        self.use_xlnet = use_xlnet
        
        if self.use_xlnet:
            print("✓ EmotionService: Using XLNet model")
        else:
            print("✓ EmotionService: Using keyword-based detection")
    
    async def detect_emotion(self, text: str) -> Dict[str, any]:
        """Detect emotion."""
        if self.use_xlnet:
            # XLNet model
            try:
                classifier = _get_emotion_classifier()
                return classifier.predict(text)
            except Exception as e:
                print(f"✗ Model failed, falling back to keywords: {str(e)}")
                return self._detect_emotion_keywords(text)
        else:
            # Keyword detection
            return self._detect_emotion_keywords(text)
    
    def _detect_emotion_keywords(self, text: str) -> Dict[str, any]:
        """Keyword emotion detection."""
        text_lower = text.lower()
        
        # Check keywords
        for emotion, keywords in self.EMOTION_KEYWORDS.items():
            if any(keyword in text_lower for keyword in keywords):
                return {
                    "label": emotion,
                    "confidence": 0.75
                }
        
        # Default to neutral
        return {
            "label": "neutral",
            "confidence": 0.5
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
        """Detect crisis signals."""
        crisis_keywords = [
            "hurt myself",
            "cut myself",
            "kill myself",
            "kill myself",
            "suicide",
            "end it",
            "overdose",
            "not worth living",
            "better off dead"
        ]
        
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in crisis_keywords)
