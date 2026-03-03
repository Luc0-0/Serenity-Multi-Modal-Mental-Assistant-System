import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.conversation import Conversation
from app.models.message import Message
from app.core.config import settings

async def check_conversation(conversation_id: int):
    """Debug a specific conversation."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get conversation
        result = await session.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = result.scalar_one_or_none()
        
        if not conv:
            print(f"Conversation {conversation_id} not found")
            return
        
        print(f"\n=== CONVERSATION {conversation_id} ===")
        print(f"Title: {conv.title}")
        print(f"User: {conv.user_id}")
        print(f"Created: {conv.created_at}\n")
        
        # Get all messages
        messages_result = await session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        messages = messages_result.scalars().all()
        
        print(f"Total Messages: {len(messages)}\n")
        
        for i, msg in enumerate(messages, 1):
            print(f"--- Message {i} ---")
            print(f"ID: {msg.id}")
            print(f"Role: {msg.role.value}")
            print(f"Content: {msg.content[:100]}{'...' if len(msg.content) > 100 else ''}")
            print(f"Created: {msg.created_at}\n")
        
        # Check for duplicates
        content_map = {}
        for msg in messages:
            key = (msg.role.value, msg.content)
            if key not in content_map:
                content_map[key] = []
            content_map[key].append(msg.id)
        
        print("\n=== DUPLICATE CHECK ===")
        duplicates = {k: v for k, v in content_map.items() if len(v) > 1}
        if duplicates:
            print(f"Found {len(duplicates)} duplicate message(s):")
            for (role, content), ids in duplicates.items():
                print(f"  Role: {role}, Content: {content[:50]}...")
                print(f"  IDs: {ids}")
        else:
            print("No duplicates found")
    
    await engine.dispose()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python check_conversation_history.py <conversation_id>")
        sys.exit(1)
    
    conv_id = int(sys.argv[1])
    asyncio.run(check_conversation(conv_id))
