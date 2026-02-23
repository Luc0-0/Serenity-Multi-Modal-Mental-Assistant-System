import logging
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.crisis_event import CrisisEvent
from app.services.engines.factory import get_crisis_engine

logger = logging.getLogger(__name__)


class CrisisService:
    """Crisis detection and response via pluggable engine."""
    
    def __init__(self):
        self.engine = get_crisis_engine()
    
    async def assess_threat(
        self,
        message: str,
        emotion_label: Optional[str] = None,
        conversation_history: Optional[List[str]] = None,
        user_id: Optional[int] = None
    ) -> Dict:
        """Assess crisis threat level."""
        try:
            return await self.engine.assess(
                message=message,
                emotion_label=emotion_label,
                history=conversation_history
            )
        except Exception as e:
            logger.error(f"Crisis assessment failed: {e}")
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
                detected_keywords=None,
                response_provided=assessment.get('response'),
                resources_offered=len(assessment.get('resources', []))
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
