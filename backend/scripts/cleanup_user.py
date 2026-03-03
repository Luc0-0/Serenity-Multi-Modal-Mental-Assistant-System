#!/usr/bin/env python3
"""
Clean up test user and all related data.
Deletes in correct order to avoid foreign key violations.
"""

import asyncio
import sys
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.append(str((__file__).rsplit("\\scripts", 1)[0]))

from app.core.config import settings
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.emotion_log import EmotionLog
from app.models.journal_entry import JournalEntry
from app.models.crisis_event import CrisisEvent
from app.models.memory import (
    SemanticMemory,
    EmotionalProfile,
    MetaReflection,
    ConversationContextCache,
)


async def cleanup_user(email: str):
    """Delete user and all related data in correct FK order"""
    database_url = settings.database_url or "sqlite+aiosqlite:///./serenity.db"
    engine = create_async_engine(database_url, echo=False, future=True)
    SessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
    )
    
    async with SessionLocal() as session:
        # Find user
        result = await session.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User '{email}' not found")
            await engine.dispose()
            return
        
        user_id = user.id
        print(f"\n🧹 CLEANING UP USER")
        print("="*70)
        print(f"Email: {email}")
        print(f"User ID: {user_id}")
        
        # Step 1: Get conversation IDs
        conv_result = await session.execute(
            select(Conversation.id).where(Conversation.user_id == user_id)
        )
        conversation_ids = conv_result.scalars().all()
        print(f"\nFound {len(conversation_ids)} conversations")
        
        # Step 2: Delete in reverse FK dependency order
        print("\n📋 Deletion order:")
        
        # 2.1: meta_reflections (user_id FK)
        count = await session.execute(
            delete(MetaReflection).where(MetaReflection.user_id == user_id)
        )
        print(f"  1️⃣ meta_reflections: {count.rowcount} rows")
        
        # 2.2: emotional_profiles (user_id FK)
        count = await session.execute(
            delete(EmotionalProfile).where(EmotionalProfile.user_id == user_id)
        )
        print(f"  2️⃣ emotional_profiles: {count.rowcount} rows")
        
        # 2.3: semantic_memories (user_id FK, also message_id, conversation_id FK)
        count = await session.execute(
            delete(SemanticMemory).where(SemanticMemory.user_id == user_id)
        )
        print(f"  3️⃣ semantic_memories: {count.rowcount} rows")
        
        # 2.4: emotion_logs (user_id FK, message_id FK, conversation_id FK)
        count = await session.execute(
            delete(EmotionLog).where(EmotionLog.user_id == user_id)
        )
        print(f"  4️⃣ emotion_logs: {count.rowcount} rows")
        
        # 2.5: journal_entries (user_id FK)
        count = await session.execute(
            delete(JournalEntry).where(JournalEntry.user_id == user_id)
        )
        print(f"  5️⃣ journal_entries: {count.rowcount} rows")
        
        # 2.6: crisis_events (user_id FK, conversation_id FK, message_id FK)
        count = await session.execute(
            delete(CrisisEvent).where(CrisisEvent.user_id == user_id)
        )
        print(f"  6️⃣ crisis_events: {count.rowcount} rows")
        
        # 2.7: conversation_context_cache (conversation_id FK)
        if conversation_ids:
            count = await session.execute(
                delete(ConversationContextCache).where(
                    ConversationContextCache.conversation_id.in_(conversation_ids)
                )
            )
            print(f"  7️⃣ conversation_context_cache: {count.rowcount} rows")
        
        # 2.8: messages (conversation_id FK)
        count = await session.execute(
            delete(Message).where(
                Message.conversation_id.in_(conversation_ids) if conversation_ids else False
            )
        )
        print(f"  8️⃣ messages: {count.rowcount} rows")
        
        # 2.9: conversations (user_id FK)
        count = await session.execute(
            delete(Conversation).where(Conversation.user_id == user_id)
        )
        print(f"  9️⃣ conversations: {count.rowcount} rows")
        
        # 2.10: users (id PK)
        count = await session.execute(
            delete(User).where(User.id == user_id)
        )
        print(f"  🔟 users: {count.rowcount} rows")
        
        await session.commit()
        print(f"\n✅ User and all related data deleted successfully!")
    
    await engine.dispose()


if __name__ == "__main__":
     if len(sys.argv) > 1:
         email = sys.argv[1]
     else:
         email = "aditya.sharma@techmail.com"  # Default test user
     asyncio.run(cleanup_user(email))
