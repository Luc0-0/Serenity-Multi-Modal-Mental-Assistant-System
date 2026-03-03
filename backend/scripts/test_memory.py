#!/usr/bin/env python3
"""
Test memory architecture: semantic memories, embeddings, emotional profiles, meta-reflections.
Verifies all 4 layers store data correctly.
"""

import argparse
import asyncio
import sys
from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.append(str((__file__).rsplit("\\scripts", 1)[0]))

from app.core.config import settings
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.models.emotion_log import EmotionLog
from app.models.memory import (
    SemanticMemory,
    EmotionalProfile,
    MetaReflection,
    ConversationContextCache,
)
from app.services.memory_service import memory_service
from app.services.embedding_service import embedding_service
from argon2 import PasswordHasher


async def get_or_create_user(session: AsyncSession, email: str, name: str, password: str) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        return user
    
    hashed = PasswordHasher().hash(password)
    user = User(
        name=name,
        username=email.split("@")[0],
        email=email,
        hashed_password=hashed,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    return user


async def test_embedding_service():
    """Test 1: Verify embedding service works"""
    print("\n" + "="*60)
    print("TEST 1: Embedding Service")
    print("="*60)
    
    text = "I feel really sad and hopeless. Nothing matters anymore."
    embedding = await embedding_service.embed(text)
    
    print(f"Text: {text}")
    print(f"Embedding length: {len(embedding)}")
    print(f"Embedding type: {type(embedding)}")
    print(f"First 5 values: {embedding[:5]}")
    
    assert len(embedding) > 0, "Embedding is empty!"
    assert len(embedding) in [384, 64], f"Unexpected embedding size: {len(embedding)}"
    
    if len(embedding) == 384:
        print("✅ SentenceTransformers model loaded (384-dim)")
    else:
        print("⚠️ Using fallback hash embedding (64-dim)")
    
    return True


async def test_semantic_memory(session: AsyncSession, user_id: int, conversation_id: int):
    """Test 2: Store and retrieve semantic memories"""
    print("\n" + "="*60)
    print("TEST 2: Semantic Memory Storage & Retrieval")
    print("="*60)
    
    messages = [
        ("I have been feeling really sad and hopeless lately. Nothing seems to matter anymore. I used to enjoy things but now I feel numb.", "sadness"),
        ("I am so anxious about my future. I worry constantly about failing and being a burden.", "fear"),
        ("I have been making some progress with my therapy. Today I managed to go outside.", "joy"),
        ("I still feel quite hopeless and it is hard to find motivation for anything. The sadness keeps returning.", "sadness"),
    ]
    
    stored_ids = []
    for idx, (text, emotion) in enumerate(messages):
        # Create message
        msg = Message(
            conversation_id=conversation_id,
            role=MessageRole.user,
            content=text,
            created_at=datetime.utcnow() + timedelta(minutes=idx*10),
        )
        session.add(msg)
        await session.flush()
        
        # Create emotion log
        emotion_log = EmotionLog(
            user_id=user_id,
            conversation_id=conversation_id,
            message_id=msg.id,
            primary_emotion=emotion,
            confidence=0.85,
        )
        session.add(emotion_log)
        
        # Store semantic memory
        await memory_service.maybe_store_semantic_memory(
            db=session,
            user_id=user_id,
            conversation_id=conversation_id,
            message_id=msg.id,
            message_text=text,
            emotion_label=emotion,
            source="test",
        )
        
        stored_ids.append(msg.id)
        await session.flush()
        print(f"  [{idx+1}] Stored: {text[:50]}... (emotion: {emotion})")
    
    # Check what was stored
    result = await session.execute(
        select(func.count(SemanticMemory.id)).where(SemanticMemory.user_id == user_id)
    )
    count = result.scalar()
    print(f"\n✅ Total semantic memories stored: {count}")
    assert count > 0, "No semantic memories stored!"
    
    # Retrieve semantically similar
    last_msg = messages[-1][0]
    similarity_results = await memory_service._retrieve_semantic_memories(
        db=session,
        user_id=user_id,
        reference_text=last_msg,
    )
    
    print(f"\n📊 Semantic similarity results for final message:")
    for i, mem in enumerate(similarity_results, 1):
        print(f"  [{i}] Match: {mem.match_score:.2f} | Emotion: {mem.emotion_label} | Content: {mem.content[:40]}...")
    
    return True


async def test_emotional_profile(session: AsyncSession, user_id: int, conversation_id: int):
    """Test 3: Generate emotional profile"""
    print("\n" + "="*60)
    print("TEST 3: Emotional Profile Computation")
    print("="*60)
    
    # Add more emotion logs
    emotions = ["sadness", "fear", "sadness", "anxiety", "sadness", "joy", "sadness"]
    for idx, emotion in enumerate(emotions):
        log = EmotionLog(
            user_id=user_id,
            conversation_id=conversation_id,
            primary_emotion=emotion,
            confidence=0.8 + (idx * 0.01),
            created_at=datetime.utcnow() - timedelta(days=30-idx),
        )
        session.add(log)
    
    await session.flush()
    
    # Generate profile
    profile = await memory_service._get_or_compute_profile(
        db=session,
        user_id=user_id,
    )
    
    print(f"✅ Emotional Profile Generated:")
    print(f"  Dominant emotion: {profile.dominant_emotion}")
    print(f"  Dominance %: {profile.dominance_pct:.1%}")
    print(f"  Resilience: {profile.resilience_score:.1%}")
    print(f"  Volatility: {profile.volatility_index:.2f}")
    print(f"  Trend: {profile.trend}")
    print(f"  Log count: {profile.log_count}")
    
    assert profile.dominant_emotion is not None, "No dominant emotion!"
    assert profile.log_count > 0, "No logs counted!"
    
    return True


async def test_cache(session: AsyncSession, conversation_id: int):
    """Test 4: Conversation cache"""
    print("\n" + "="*60)
    print("TEST 4: Conversation Context Cache")
    print("="*60)
    
    # Check cache
    result = await session.execute(
        select(ConversationContextCache).where(
            ConversationContextCache.conversation_id == conversation_id
        )
    )
    cache = result.scalar_one_or_none()
    
    if cache:
        print(f"✅ Cache exists:")
        print(f"  Message count: {cache.message_count}")
        print(f"  Summary: {cache.summary[:80] if cache.summary else 'None'}...")
        print(f"  Updated: {cache.updated_at}")
    else:
        print("⚠️ No cache yet (will be created on next request)")
    
    return True


async def test_meta_reflection(session: AsyncSession, user_id: int):
    """Test 5: Meta-reflection synthesis"""
    print("\n" + "="*60)
    print("TEST 5: Meta-Reflection")
    print("="*60)
    
    # Get profile first
    profile = await memory_service._get_or_compute_profile(
        db=session,
        user_id=user_id,
    )
    
    # Synthesize reflection
    reflection = await memory_service._synthesise_reflection(
        db=session,
        user_id=user_id,
        profile=profile,
    )
    
    print(f"✅ Reflection Synthesized:")
    print(f"  Summary: {reflection.summary}")
    print(f"  Patterns: {reflection.detected_patterns}")
    
    assert reflection.summary, "No reflection summary!"
    
    return True


async def test_memory_bundle(session: AsyncSession, user_id: int, conversation_id: int):
    """Test 6: Complete memory bundle"""
    print("\n" + "="*60)
    print("TEST 6: Complete Memory Bundle")
    print("="*60)
    
    # Get conversation history
    result = await session.execute(
        select(Message).where(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at)
    )
    messages = result.scalars().all()
    
    history = [
        {"role": msg.role.value, "content": msg.content}
        for msg in messages
    ]
    
    user_msg = history[-1]["content"] if history else "test"
    
    # Build bundle
    bundle = await memory_service.build_memory_bundle(
        db=session,
        user_id=user_id,
        conversation_id=conversation_id,
        history=history,
        user_message=user_msg,
    )
    
    print(f"✅ Memory Bundle Built:")
    print(f"  Short-term summary: {bundle.short_term.summary[:60] if bundle.short_term.summary else 'None'}...")
    print(f"  Semantic memories: {len(bundle.semantic_memories)}")
    if bundle.emotional_profile:
        print(f"  Emotional profile: {bundle.emotional_profile.dominant_emotion}")
    if bundle.meta_reflection:
        print(f"  Meta-reflection: {bundle.meta_reflection.summary[:60]}...")
    
    return True


async def main():
    parser = argparse.ArgumentParser(description="Test memory architecture.")
    parser.add_argument("--email", default="memory_test@example.com")
    parser.add_argument("--name", default="Memory Tester")
    parser.add_argument("--password", default="TestPass123!")
    args = parser.parse_args()
    
    database_url = settings.database_url or "sqlite+aiosqlite:///./serenity.db"
    engine = create_async_engine(database_url, echo=False, future=True)
    SessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
    )
    
    async with SessionLocal() as session:
        # Setup
        user = await get_or_create_user(session, args.email, args.name, args.password)
        
        conversation = Conversation(
            user_id=user.id,
            title="Memory Test Conversation",
        )
        session.add(conversation)
        await session.flush()
        
        print("\n🧪 MEMORY ARCHITECTURE TEST SUITE")
        print(f"User: {args.email}")
        print(f"Conversation ID: {conversation.id}")
        
        try:
            # Run tests
            await test_embedding_service()
            await test_semantic_memory(session, user.id, conversation.id)
            await test_emotional_profile(session, user.id, conversation.id)
            await session.flush()
            await test_cache(session, conversation.id)
            await test_meta_reflection(session, user.id)
            await test_memory_bundle(session, user.id, conversation.id)
            
            await session.commit()
            
            print("\n" + "="*60)
            print("✅ ALL TESTS PASSED")
            print("="*60 + "\n")
            
        except Exception as e:
            print(f"\n❌ TEST FAILED: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
            raise
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
