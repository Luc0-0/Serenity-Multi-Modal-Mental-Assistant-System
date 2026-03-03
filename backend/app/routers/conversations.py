import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.conversation_service import ConversationService
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.emotion_log import EmotionLog
from app.models.journal_entry import JournalEntry
from app.models.crisis_event import CrisisEvent
from app.models.user import User
from app.routers.auth import get_current_user
from sqlalchemy import select, delete

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])
conversation_service = ConversationService()


@router.get("/")
async def get_user_conversations(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Retrieve user conversations."""
    try:
        stmt = select(Conversation).where(
            Conversation.user_id == current_user.id
        ).order_by(Conversation.updated_at.desc())
        
        result = await db.execute(stmt)
        conversations = result.scalars().all()
        
        return [
            {
                "id": c.id,
                "title": c.title or f"Conversation {c.id}",
                "created_at": c.created_at,
                "updated_at": c.updated_at,
                "message_count": len(c.messages) if hasattr(c, 'messages') else 0,
            }
            for c in conversations
        ]
    except Exception as e:
        logger.error(f"Failed to get conversations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversations")


@router.get("/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve conversation messages."""
    try:
        stmt = select(Conversation).where(
            (Conversation.id == conversation_id) & 
            (Conversation.user_id == current_user.id)
        )
        
        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        messages_stmt = select(Message).where(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc())
        
        messages_result = await db.execute(messages_stmt)
        messages = messages_result.scalars().all()
        
        return {
            "conversation_id": conversation_id,
            "title": conversation.title,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at,
                }
                for m in messages
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch messages")


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete conversation."""
    try:
        stmt = select(Conversation).where(
            (Conversation.id == conversation_id) & 
            (Conversation.user_id == current_user.id)
        )
        
        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Cascade delete related records first to avoid foreign key violations
        await db.execute(delete(CrisisEvent).where(CrisisEvent.conversation_id == conversation_id))
        await db.execute(delete(EmotionLog).where(EmotionLog.conversation_id == conversation_id))
        await db.execute(delete(JournalEntry).where(JournalEntry.conversation_id == conversation_id))
        await db.execute(delete(Message).where(Message.conversation_id == conversation_id))
        
        # Finally delete conversation
        await db.delete(conversation)
        await db.commit()
        
        return {"message": "Conversation deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete conversation")
