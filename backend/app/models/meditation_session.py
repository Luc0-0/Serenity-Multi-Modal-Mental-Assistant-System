from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.db.base import Base

class MeditationSession(Base):
    __tablename__ = "meditation_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Session type: "box", "calm", "deep", "wim_hof", "coherent", "guided"
    session_type = Column(String(50), nullable=False)

    # Duration in minutes
    duration_minutes = Column(Integer, nullable=False)

    # When session was completed
    completed_at = Column(DateTime(timezone=True), nullable=False)

    # Mood before/after tracking
    mood_before = Column(String(50), nullable=True)
    mood_after = Column(String(50), nullable=True)

    # Optional session notes
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
