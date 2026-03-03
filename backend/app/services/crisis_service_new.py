import logging
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.crisis_event import CrisisEvent

logger = logging.getLogger(__name__)


class CrisisService:
    """Crisis detection and response via explicit self-harm keywords only."""
    
    # Strict self-harm keywords - must match emotion_service.detect_crisis_signals()
    CRISIS_KEYWORDS = [
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
    
    def __init__(self):
        pass
    
    async def assess_threat(
        self,
        message: str,
        emotion_label: Optional[str] = None,
        conversation_history: Optional[List[str]] = None,
        user_id: Optional[int] = None
    ) -> Dict:
        """Assess crisis threat level using strict self-harm keywords only.
        
        Only triggers crisis mode for explicit self-harm/suicide keywords.
        Words like "anxious", "sad", "struggling" will NOT trigger crisis mode.
        """
        message_lower = message.lower()
        
        # Check for explicit self-harm keywords
        found_keywords = [kw for kw in self.CRISIS_KEYWORDS if kw in message_lower]
        
        if found_keywords:
            logger.warning(f"Crisis keywords detected: {found_keywords}")
            return {
                'requires_escalation': True,
                'severity': 'crisis',
                'confidence': 0.95,
                'response': (
                    "🆘 I'm really concerned about your safety right now. "
                    "Please reach out to a professional immediately:\n\n"
                    "📞 Call 988 (Suicide Prevention Lifeline)\n"
                    "💬 Text 'HELLO' to 741741 (Crisis Text Line)\n"
                    "🚨 Call 911 if you're in immediate danger\n\n"
                    "You matter. Help is available 24/7."
                ),
                'resources': [
                    {
                        'name': 'National Suicide Prevention Lifeline',
                        'phone': '988',
                        'type': 'crisis',
                        'available': '24/7'
                    },
                    {
                        'name': 'Crisis Text Line',
                        'text': "Text 'HELLO' to 741741",
                        'type': 'crisis',
                        'available': '24/7'
                    }
                ]
            }
        
        # No crisis detected
        return {
            'requires_escalation': False,
            'severity': None,
            'confidence': 0.0,
            'response': None,
            'resources': []
        }
    
    async def log_crisis_event(
        self,
        db: AsyncSession,
        user_id: int,
        conversation_id: int,
        message_id: int,
        assessment: Dict
    ) -> Optional[int]:
        """Log crisis event to database."""
        try:
            crisis_event = CrisisEvent(
                user_id=user_id,
                conversation_id=conversation_id,
                message_id=message_id,
                severity=assessment.get('severity'),
                confidence=assessment.get('confidence', 0.0),
                keywords_detected=None,
                response_sent=assessment.get('response'),
                pattern_detected=None
            )
            
            db.add(crisis_event)
            await db.flush()
            
            logger.info(
                f"Crisis event logged: user={user_id}, "
                f"severity={assessment.get('severity')}, "
                f"confidence={assessment.get('confidence')}"
            )
            
            return crisis_event.id
        except Exception as e:
            logger.error(f"Failed to log crisis event: {e}")
            return None
