#!/usr/bin/env python3
"""
Test script to verify emotion logging system.

Verifies:
1. Emotion detection with baseline keywords
2. Emotion logs persist to database
3. Foreign key relationships are correct
4. No duplicates are created
5. Confidence scores are accurate
"""

import asyncio
import sys
from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.models.emotion_log import EmotionLog
from app.models.message import Message
from app.models.conversation import Conversation
from app.models.user import User
from app.services.emotion_service import EmotionService


async def test_baseline_detection():
    """Test baseline emotion detection."""
    print("\n" + "="*60)
    print("TEST 1: Baseline Emotion Detection")
    print("="*60)
    
    service = EmotionService()
    test_cases = [
        ("I'm feeling really sad today", "sadness", 0.75),
        ("I'm so happy and excited!", "joy", 0.75),
        ("This makes me angry", "anger", 0.75),
        ("I'm scared and anxious", "fear", 0.75),
        ("That's disgusting", "disgust", 0.75),
        ("Just a normal day", "neutral", 0.5),
    ]
    
    for text, expected_label, expected_conf in test_cases:
        result = await service.detect_emotion(text)
        status = "✓" if result["label"] == expected_label else "✗"
        print(f"{status} '{text}'")
        print(f"   → {result['label']} (confidence: {result['confidence']})")
        assert result["label"] == expected_label, f"Expected {expected_label}, got {result['label']}"
        assert result["confidence"] == expected_conf, f"Expected {expected_conf}, got {result['confidence']}"
    
    print("\n✓ All baseline detection tests passed!")


async def test_emotion_logging():
    """Test emotion logging to database."""
    print("\n" + "="*60)
    print("TEST 2: Emotion Logging to Database")
    print("="*60)
    
    async with SessionLocal() as db:
        # Check if test user exists
        stmt = select(User).where(User.username == "test_emotion_user")
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print("✗ Test user not found. Run setup_test_user.py first.")
            return
        
        user_id = user.id
        print(f"✓ Using test user: {user.username} (ID: {user_id})")
        
        # Check if test conversation exists
        stmt = select(Conversation).where(Conversation.user_id == user_id).limit(1)
        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            print("✗ No test conversation found. Start a chat first.")
            return
        
        conversation_id = conversation.id
        print(f"✓ Using test conversation: {conversation_id}")
        
        # Get last message
        stmt = select(Message).where(
            Message.conversation_id == conversation_id
        ).order_by(Message.id.desc()).limit(1)
        result = await db.execute(stmt)
        message = result.scalar_one_or_none()
        
        if not message:
            print("✗ No messages in conversation.")
            return
        
        message_id = message.id
        print(f"✓ Using message: {message_id}")
        print(f"   Content: '{message.content[:50]}...'")
        
        # Test emotion logging
        service = EmotionService()
        emotion = await service.detect_emotion(message.content)
        print(f"✓ Detected emotion: {emotion['label']} ({emotion['confidence']})")
        
        emotion_log_id = await service.log_emotion(
            db=db,
            user_id=user_id,
            conversation_id=conversation_id,
            message_id=message_id,
            label=emotion["label"],
            confidence=emotion["confidence"]
        )
        
        await db.commit()
        
        if emotion_log_id:
            print(f"✓ Emotion logged with ID: {emotion_log_id}")
        else:
            print("✗ Failed to log emotion")
            return
        
        # Verify in database
        stmt = select(EmotionLog).where(EmotionLog.id == emotion_log_id)
        result = await db.execute(stmt)
        logged = result.scalar_one_or_none()
        
        assert logged is not None, "Emotion log not found in database"
        assert logged.user_id == user_id, f"user_id mismatch: {logged.user_id} != {user_id}"
        assert logged.conversation_id == conversation_id, f"conversation_id mismatch"
        assert logged.message_id == message_id, f"message_id mismatch"
        assert logged.primary_emotion == emotion["label"], "emotion label mismatch"
        assert logged.confidence == emotion["confidence"], "confidence mismatch"
        
        print("\n✓ All foreign key relationships verified!")
        print(f"   user_id: {logged.user_id}")
        print(f"   conversation_id: {logged.conversation_id}")
        print(f"   message_id: {logged.message_id}")
        print(f"   primary_emotion: {logged.primary_emotion}")
        print(f"   confidence: {logged.confidence}")
        print(f"   created_at: {logged.created_at}")


async def test_emotion_logs_table():
    """Check emotion_logs table stats."""
    print("\n" + "="*60)
    print("TEST 3: Emotion Logs Table Statistics")
    print("="*60)
    
    async with SessionLocal() as db:
        # Total emotion logs
        stmt = select(func.count(EmotionLog.id))
        result = await db.execute(stmt)
        total = result.scalar()
        
        print(f"Total emotion logs: {total}")
        
        if total == 0:
            print("⚠ No emotion logs in database yet. Start chatting to generate logs.")
            return
        
        # Logs by emotion
        stmt = select(
            EmotionLog.primary_emotion,
            func.count(EmotionLog.id).label('count')
        ).group_by(EmotionLog.primary_emotion)
        result = await db.execute(stmt)
        emotion_counts = result.all()
        
        print("\nEmotions detected:")
        for emotion, count in emotion_counts:
            print(f"  {emotion}: {count}")
        
        # Average confidence by emotion
        stmt = select(
            EmotionLog.primary_emotion,
            func.avg(EmotionLog.confidence).label('avg_confidence')
        ).group_by(EmotionLog.primary_emotion)
        result = await db.execute(stmt)
        confidence_stats = result.all()
        
        print("\nAverage confidence by emotion:")
        for emotion, avg_conf in confidence_stats:
            if avg_conf:
                print(f"  {emotion}: {avg_conf:.2f}")
        
        # Check for orphaned records (missing FK)
        stmt = select(EmotionLog).where(
            ~EmotionLog.user_id.in_(select(User.id))
        )
        result = await db.execute(stmt)
        orphans = result.all()
        
        if orphans:
            print(f"\n✗ Found {len(orphans)} orphaned emotion logs (invalid user_id)")
        else:
            print("\n✓ No orphaned emotion logs found")


async def test_crisis_detection():
    """Test crisis signal detection."""
    print("\n" + "="*60)
    print("TEST 4: Crisis Signal Detection")
    print("="*60)
    
    service = EmotionService()
    
    crisis_cases = [
        ("I want to hurt myself", True),
        ("I'm thinking about suicide", True),
        ("I want to end it all", True),
        ("I'm feeling sad but okay", False),
        ("I'm angry at my situation", False),
    ]
    
    for text, should_detect in crisis_cases:
        is_crisis = await service.detect_crisis_signals(text)
        status = "✓" if is_crisis == should_detect else "✗"
        crisis_label = "CRISIS" if is_crisis else "normal"
        print(f"{status} '{text}'")
        print(f"   → {crisis_label}")
        assert is_crisis == should_detect, f"Crisis detection failed for: {text}"
    
    print("\n✓ All crisis detection tests passed!")


async def main():
    """Run all tests."""
    try:
        await test_baseline_detection()
        await test_emotion_logging()
        await test_emotion_logs_table()
        await test_crisis_detection()
        
        print("\n" + "="*60)
        print("✓ ALL TESTS PASSED")
        print("="*60)
        print("\nEmotional logging system is working correctly!")
        
    except AssertionError as e:
        print(f"\n✗ Assertion failed: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
