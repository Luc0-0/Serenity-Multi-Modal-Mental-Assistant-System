import logging
from typing import Dict
from app.services.engines.base import EmotionEngine

logger = logging.getLogger(__name__)


class KeywordEmotionEngine(EmotionEngine):
    """Fast keyword-based emotion detection with fallback guarantee."""
    
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
    
    def __init__(self):
        self._available = True
        logger.info("✓ Keyword emotion engine initialized")
    
    async def analyze(self, text: str) -> Dict:
        text_lower = text.lower()
        
        for emotion, keywords in self.EMOTION_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return {
                    'label': emotion,
                    'confidence': 0.65,
                    'provider': 'keywords'
                }
        
        return {
            'label': 'neutral',
            'confidence': 0.5,
            'provider': 'keywords'
        }
    
    @property
    def provider_name(self) -> str:
        return 'keywords'
    
    @property
    def is_available(self) -> bool:
        return True  # Always available as fallback
