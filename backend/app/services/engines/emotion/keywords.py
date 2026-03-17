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
            "failing", "alone", "lonely", "nobody"
        ],
        "joy": [
            "happy", "excited", "joyful", "delighted", "pleased", "wonderful", "good",
            "great", "awesome", "love", "grateful", "blessed", "thrilled", "proud",
            "hope", "better", "helped", "acknowledged", "kinder"
        ],
        "fear": [
            "scared", "anxious", "afraid", "terrified", "nervous", "worried",
            "panic", "dread", "fearful", "stressed", "overwhelmed", "concerned",
            "deadlines", "barely"
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
        import re
        from app.utils.emotion_constants import normalize_emotion
        
        text_lower = text.lower()
        scores = {emotion: 0 for emotion in self.EMOTION_KEYWORDS}
        
        for emotion, keywords in self.EMOTION_KEYWORDS.items():
            for kw in keywords:
                # Use word boundaries to prevent substring matches (e.g. 'ad' in 'sad')
                pattern = r'\b' + re.escape(kw) + r'\b'
                matches = re.findall(pattern, text_lower)
                scores[emotion] += len(matches)
                
        best_emotion = max(scores, key=scores.get)
        if scores[best_emotion] > 0:
            return {
                'label': normalize_emotion(best_emotion),
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
