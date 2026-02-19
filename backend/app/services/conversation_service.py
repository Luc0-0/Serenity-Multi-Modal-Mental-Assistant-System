"""
Conversation memory and context management service.
Handles multi-turn conversation persistence and history retrieval.
"""

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.models.user import User
from datetime import datetime


class ConversationService:
    """
    Manages conversations and message persistence.
    Provides context window retrieval for LLM calls.
    """

    def __init__(self):
        pass

    async def create_conversation(
        self, db: AsyncSession, user_id: int, title: str = None
    ) -> int:
        """
        Create new conversation for user.

        Args:
            db: Async database session
            user_id: User ID
            title: Conversation title (optional, auto-generated from first message)

        Returns:
            conversation_id (int)

        Raises:
            ValueError: If user doesn't exist
        """
        # Validate user exists
        user_result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError(f"User {user_id} not found")

        # Create conversation
        conversation = Conversation(
            user_id=user_id,
            title=title
        )
        db.add(conversation)
        await db.flush()  # Get ID without committing
        conversation_id = conversation.id

        return conversation_id

    async def get_conversation_history(
        self, db: AsyncSession, conversation_id: int, limit: int = 20
    ) -> list:
        """
        Retrieve conversation history in OpenAI format.

        Args:
            db: Async database session
            conversation_id: Conversation ID
            limit: Max messages to retrieve (default 20)

        Returns:
            List of dicts: [{"role": "user|assistant", "content": "..."}, ...]
            Ordered chronologically (oldest first)

        Raises:
            ValueError: If conversation doesn't exist
        """
        # Check conversation exists
        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conversation = conv_result.scalar_one_or_none()
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")

        # Get last N messages ordered by creation
        messages_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        messages = messages_result.scalars().all()

        # Format as OpenAI-style list
        history = [
            {
                "role": message.role.value,
                "content": message.content
            }
            for message in messages
        ]

        return history

    async def save_message(
        self, db: AsyncSession, conversation_id: int, role: str, content: str
    ) -> int:
        """
        Save message to conversation.

        Args:
            db: Async database session
            conversation_id: Conversation ID
            role: Message role ('user', 'assistant', 'system')
            content: Message content

        Returns:
            message_id (int)

        Raises:
            ValueError: If conversation doesn't exist or role invalid
        """
        # Validate conversation exists
        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conversation = conv_result.scalar_one_or_none()
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")

        # Validate role
        valid_roles = {"user", "assistant", "system"}
        if role not in valid_roles:
            raise ValueError(f"Invalid role: {role}. Must be one of {valid_roles}")

        # Create message
        message = Message(
            conversation_id=conversation_id,
            role=MessageRole(role),
            content=content
        )
        db.add(message)
        await db.flush()
        message_id = message.id

        return message_id

    async def validate_conversation_ownership(
        self, db: AsyncSession, user_id: int, conversation_id: int
    ) -> bool:
        """
        Check if conversation belongs to user.

        Args:
            db: Async database session
            user_id: User ID
            conversation_id: Conversation ID

        Returns:
            True if user owns conversation, False otherwise
        """
        result = await db.execute(
            select(Conversation).where(
                (Conversation.id == conversation_id)
                & (Conversation.user_id == user_id)
            )
        )
        conversation = result.scalar_one_or_none()
        return conversation is not None

    async def auto_title_conversation(
        self, db: AsyncSession, conversation_id: int, first_message: str
    ) -> None:
        """
        Auto-generate and set conversation title from first message.

        Args:
            db: Async database session
            conversation_id: Conversation ID
            first_message: First message text (to extract title from)
        """
        # Extract first 5 words as title
        words = first_message.split()[:5]
        title = " ".join(words)
        if len(first_message.split()) > 5:
            title += "..."

        # Update conversation
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conversation = result.scalar_one()
        conversation.title = title
        await db.flush()

    async def update_conversation_title(
        self, db: AsyncSession, conversation_id: int, title: str
    ) -> None:
        """
        Update conversation title.

        Args:
            db: Async database session
            conversation_id: Conversation ID
            title: New title
        """
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if conversation:
            conversation.title = title
            await db.flush()
