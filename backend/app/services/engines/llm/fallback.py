import logging
from typing import Dict, List
from app.services.engines.base import LLMEngine

logger = logging.getLogger(__name__)


class FallbackLLMEngine(LLMEngine):
    """Fallback LLM that provides minimal but safe responses."""
    
    RESPONSE_TEMPLATES = {
        "sad": "That sounds really hard. I'm here. What do you need right now?",
        "anxious": "I hear you. Let's take this one step at a time. What's on your mind?",
        "angry": "Okay, that's frustrating. What happened?",
        "joy": "That's amazing! Tell me more.",
        "default": "I'm listening. Tell me more about that."
    }
    
    def __init__(self):
        self._available = True
        logger.info("✓ Fallback LLM engine initialized")
    
    async def generate(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> str:
        """Return safe fallback response."""
        if messages:
            last_msg = messages[-1].get('content', '').lower()
            
            if any(word in last_msg for word in ['sad', 'depressed', 'down', 'sad']):
                return self.RESPONSE_TEMPLATES['sad']
            elif any(word in last_msg for word in ['anxious', 'worried', 'scared', 'panic']):
                return self.RESPONSE_TEMPLATES['anxious']
            elif any(word in last_msg for word in ['angry', 'furious', 'mad']):
                return self.RESPONSE_TEMPLATES['angry']
            elif any(word in last_msg for word in ['happy', 'excited', 'great', 'amazing']):
                return self.RESPONSE_TEMPLATES['joy']
        
        return self.RESPONSE_TEMPLATES['default']
    
    async def generate_title(self, text: str) -> str:
        """Generate basic title from text."""
        return ""
    
    @property
    def provider_name(self) -> str:
        return 'fallback'
    
    @property
    def is_available(self) -> bool:
        return True  # Always available
