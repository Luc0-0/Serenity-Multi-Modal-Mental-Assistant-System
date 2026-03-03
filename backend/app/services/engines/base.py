from abc import ABC, abstractmethod
from typing import Dict, Optional, List


class EmotionEngine(ABC):
    """Base interface for emotion analysis engines."""
    
    @abstractmethod
    async def analyze(self, text: str) -> Dict:
        """
        Analyze text for emotion.
        
        Returns: {
            'label': str,
            'confidence': float (0-1),
            'provider': str
        }
        """
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass


class LLMEngine(ABC):
    """Base interface for LLM providers."""
    
    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> str:
        """Generate response from LLM."""
        pass
    
    @abstractmethod
    async def generate_title(self, text: str) -> str:
        """Generate conversation title from text."""
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass


class CrisisEngine(ABC):
    """Base interface for crisis detection."""
    
    @abstractmethod
    async def assess(
        self,
        message: str,
        emotion_label: Optional[str] = None,
        history: Optional[List[str]] = None
    ) -> Dict:
        """
        Assess crisis severity.
        
        Returns: {
            'requires_escalation': bool,
            'severity': str,
            'confidence': float,
            'response': str,
            'resources': List[Dict]
        }
        """
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass
