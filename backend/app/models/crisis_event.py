from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.base import Base


class CrisisEvent(Base):
    """Crisis intervention log."""
    __tablename__ = "crisis_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True, index=True)
    
    severity = Column(String(20), nullable=False, index=True)
    confidence = Column(Float, nullable=True)
    keywords_detected = Column(Text, nullable=True)
    response_sent = Column(Text, nullable=True)
    pattern_detected = Column(String(255), nullable=True)
    
    user_acknowledged = Column(Boolean, default=False)
    escalated_to_professional = Column(Boolean, default=False)
    followup_provided = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    notes = Column(Text, nullable=True)
