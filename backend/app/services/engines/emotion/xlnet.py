import logging
from typing import Dict
from app.services.engines.base import EmotionEngine

logger = logging.getLogger(__name__)


class XLNetEmotionEngine(EmotionEngine):
    """XLNet-based emotion classification."""
    
    def __init__(self):
        try:
            from app.services.xlnet_classifier import get_emotion_classifier
            self.classifier = get_emotion_classifier()
            self._available = self.classifier is not None
            print("✓ XLNet emotion engine initialized", flush=True)
            logger.info("✓ XLNet emotion engine initialized")
        except Exception as e:
            print(f"✗ XLNet initialization failed: {type(e).__name__}: {str(e)}", flush=True)
            print(f"Traceback: {__import__('traceback').format_exc()}", flush=True)
            logger.error(f"✗ XLNet initialization failed: {type(e).__name__}: {str(e)}")
            self._available = False
            self.classifier = None
    
    async def analyze(self, text: str) -> Dict:
        if not self._available:
            raise RuntimeError("XLNet classifier not available")
        
        try:
            result = self.classifier.predict(text)
            return {
                'label': result['label'],
                'confidence': result['confidence'],
                'provider': 'xlnet'
            }
        except Exception as e:
            logger.error(f"XLNet analysis failed: {e}")
            raise
    
    @property
    def provider_name(self) -> str:
        return 'xlnet'
    
    @property
    def is_available(self) -> bool:
        return self._available
