from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.db.base import Base


class JournalEntry(Base):
    """User journal entry."""
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True, index=True)
    
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    emotion = Column(String(50), nullable=True, default="neutral")
    mood = Column(String(50), nullable=True)
    tags = Column(JSON, nullable=True, default=[])
    
    extracted_insights = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
