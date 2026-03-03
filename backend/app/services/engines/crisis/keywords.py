import logging
from typing import Dict, Optional, List
from app.services.engines.base import CrisisEngine

logger = logging.getLogger(__name__)


class KeywordCrisisEngine(CrisisEngine):
    """Keyword-based crisis detection with resource escalation."""
    
    EMERGENCY_KEYWORDS = {
        "direct": [
            "suicide plan", "kill myself", "going to kill myself",
            "going to overdose", "i'll overdose", "i want to overdose",
            "i'm going to jump", "going to jump", "i'll jump",
            "i have a plan", "i have a method", "i've decided to",
            "goodbye", "farewell", "see you in the next life",
            "this is my last message", "last goodbye", "final goodbye"
        ],
        "method": [
            "gun", "shoot myself", "rope", "noose", "hang myself",
            "pills", "overdose", "poison", "jump", "train", "bridge",
            "car exhaust", "crash my car", "wrist", "razor blade"
        ],
        "intent": [
            "won't be around", "won't see you again", "i'm leaving",
            "i'm gone", "not coming back", "see you in afterlife"
        ],
        "timeline": [
            "tonight", "tomorrow night", "this week", "soon",
            "in a few hours", "in an hour", "right now", "immediately"
        ]
    }
    
    DANGER_KEYWORDS = {
        "ideation": [
            "hurt myself", "harm myself", "self-harm", "self harm",
            "cut myself", "cutting", "burn myself", "punch myself",
            "bang my head", "hit myself", "slap myself"
        ],
        "passive": [
            "want to die", "wish i was dead", "wish i wasn't alive",
            "better off without me", "everyone would be better off",
            "no one cares", "no one would miss me"
        ],
        "hopelessness": [
            "no point in living", "never get better", "never going to change",
            "trapped", "stuck forever", "can't take it anymore",
            "it's hopeless", "no way out", "nothing to live for"
        ],
        "isolation": [
            "completely alone", "no one understands", "no support",
            "abandoned", "nobody loves me", "no one wants me"
        ]
    }
    
    WARNING_KEYWORDS = {
        "distress": [
            "overwhelmed", "can't handle", "breaking down", "falling apart",
            "losing it", "on edge", "stressed", "extreme stress"
        ],
        "emotional": [
            "depressed", "depression", "anxious", "anxiety",
            "miserable", "hopeless", "helpless", "desperate",
            "worthless", "useless", "ashamed"
        ],
        "struggle": [
            "struggling", "suffering", "in pain", "difficult", "tough time"
        ],
        "crisis": [
            "crisis", "emergency", "urgent", "need help", "help me"
        ]
    }
    
    RESOURCES = {
        "warning": [
            {
                "name": "National Suicide Prevention Lifeline",
                "phone": "988",
                "text": "Text 'HELLO' to 741741",
                "type": "crisis",
                "available": "24/7"
            },
            {
                "name": "Crisis Text Line",
                "text": "Text 'HELLO' to 741741",
                "type": "crisis",
                "available": "24/7"
            }
        ],
        "danger": [
            {
                "name": "National Suicide Prevention Lifeline",
                "phone": "988",
                "text": "Text 'HELLO' to 741741",
                "url": "https://suicidepreventionlifeline.org",
                "type": "crisis",
                "available": "24/7"
            },
            {
                "name": "Crisis Text Line",
                "text": "Text 'HELLO' to 741741",
                "url": "https://www.crisistextline.org",
                "type": "crisis",
                "available": "24/7"
            },
            {
                "name": "International Association for Suicide Prevention",
                "url": "https://www.iasp.info/resources/Crisis_Centres/",
                "type": "international",
                "description": "Find crisis services worldwide"
            }
        ],
        "emergency": [
            {
                "name": "Emergency Services",
                "phone": "911",
                "type": "emergency",
                "available": "24/7"
            },
            {
                "name": "National Suicide Prevention Lifeline",
                "phone": "988",
                "text": "Text 'HELLO' to 741741",
                "url": "https://suicidepreventionlifeline.org",
                "type": "crisis",
                "available": "24/7"
            }
        ]
    }
    
    def __init__(self):
        self._available = True
        logger.info("✓ Keyword crisis engine initialized")
    
    async def assess(
        self,
        message: str,
        emotion_label: Optional[str] = None,
        history: Optional[List[str]] = None
    ) -> Dict:
        """Assess crisis level and return response with resources."""
        message_lower = message.lower()
        
        # Check emergency level
        emergency_count = sum(
            1 for kw_list in self.EMERGENCY_KEYWORDS.values()
            for kw in kw_list if kw in message_lower
        )
        
        if emergency_count >= 2:
            return self._create_response(
                severity='emergency',
                confidence=0.95,
                requires_escalation=True,
                resource_level='emergency'
            )
        
        # Check danger level
        danger_count = sum(
            1 for kw_list in self.DANGER_KEYWORDS.values()
            for kw in kw_list if kw in message_lower
        )
        
        if danger_count >= 2:
            return self._create_response(
                severity='danger',
                confidence=0.90,
                requires_escalation=True,
                resource_level='danger'
            )
        
        if danger_count == 1:
            return self._create_response(
                severity='danger',
                confidence=0.75,
                requires_escalation=True,
                resource_level='danger'
            )
        
        # Check warning level
        warning_count = sum(
            1 for kw_list in self.WARNING_KEYWORDS.values()
            for kw in kw_list if kw in message_lower
        )
        
        if warning_count >= 2:
            return self._create_response(
                severity='warning',
                confidence=0.70,
                requires_escalation=True,
                resource_level='warning'
            )
        
        # No crisis
        return {
            'requires_escalation': False,
            'severity': None,
            'confidence': 0.0,
            'response': None,
            'resources': []
        }
    
    def _create_response(
        self,
        severity: str,
        confidence: float,
        requires_escalation: bool,
        resource_level: str
    ) -> Dict:
        """Build crisis response with appropriate resources."""
        responses = {
            'warning': (
                "I hear you're going through something really tough. "
                "You don't have to carry this alone. "
                "Please reach out to someone who can help."
            ),
            'danger': (
                "🆘 I'm really concerned about your safety. "
                "Please reach out to a crisis professional right now. "
                "You matter, and people want to help."
            ),
            'emergency': (
                "🆘 IMMEDIATE HELP NEEDED\n\n"
                "Please call 988 or text 'HELLO' to 741741 RIGHT NOW.\n"
                "Or call 911 if you're in immediate danger.\n\n"
                "You are not alone. Help is available 24/7."
            )
        }
        
        return {
            'requires_escalation': requires_escalation,
            'severity': severity,
            'confidence': confidence,
            'response': responses.get(severity, ''),
            'resources': self.RESOURCES.get(resource_level, [])
        }
    
    @property
    def provider_name(self) -> str:
        return 'keywords'
    
    @property
    def is_available(self) -> bool:
        return True
