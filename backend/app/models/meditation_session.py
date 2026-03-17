import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class MeditationSession(Base):
    __tablename__ = "meditation_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # E.g., "box", "calm", "deep", "wim_hof", "coherent", or "guided"
    pattern_used = Column(String, nullable=False)
    
    # Emotion associated with the session (if any)
    emotion = Column(String, nullable=True)
    
    duration_seconds = Column(Integer, nullable=False, default=0)
    completed = Column(Boolean, nullable=False, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
