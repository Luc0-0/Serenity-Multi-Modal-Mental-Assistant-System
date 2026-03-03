#!/usr/bin/env python3
"""Phase 4: Emotion Analytics verification and testing."""

import asyncio
import sys
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete

from app.db.base import Base
from app.models.emotion_log import EmotionLog
from app.models.crisis_event import CrisisEvent
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.services.emotion_analytics_service import EmotionAnalyticsService


DATABASE_URL = "sqlite+aiosqlite:///./serenity.db"
engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
analytics_service = EmotionAnalyticsService()


async def setup_db():
    """Create tables if needed."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_test_user(db: AsyncSession) -> int:
    """Get or create test user."""
    import uuid
    
    query = select(User).where(User.username == "test_user")
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        user = User(username="test_user", email=unique_email, hashed_password="test")
        db.add(user)
        await db.flush()
    
    return user.id


async def create_test_data(db: AsyncSession, user_id: int):
    """Create sample emotion logs for testing."""
    
    # Clear old test data
    await db.execute(delete(EmotionLog).where(EmotionLog.user_id == user_id))
    await db.execute(delete(CrisisEvent).where(CrisisEvent.user_id == user_id))
    await db.commit()
    
    # Create conversation
    conv = Conversation(user_id=user_id, title="Test Conversation")
    db.add(conv)
    await db.flush()
    conv_id = conv.id
    
    # Create messages and emotion logs
    emotions_data = [
        ("sadness", 0.85, 6),
        ("sadness", 0.80, 5),
        ("sadness", 0.75, 4),
        ("anger", 0.60, 3),
        ("sadness", 0.82, 2),
        ("sadness", 0.88, 1),
        ("sadness", 0.90, 0),
    ]
    
    for emotion, confidence, days_ago in emotions_data:
        created_at = datetime.now() - timedelta(days=days_ago)
        
        msg = Message(conversation_id=conv_id, role="user", content="test")
        db.add(msg)
        await db.flush()
        msg_id = msg.id
        
        log = EmotionLog(
            user_id=user_id,
            conversation_id=conv_id,
            message_id=msg_id,
            primary_emotion=emotion,
            confidence=confidence,
            created_at=created_at
        )
        db.add(log)
    
    await db.commit()


async def test_basic_insight():
    """Test insight generation with valid data."""
    async with SessionLocal() as db:
        user_id = await get_test_user(db)
        await create_test_data(db, user_id)
        
        insight = await analytics_service.generate_user_insights(db, user_id, days=7)
        
        assert not insight.insufficient_data, "Should have enough data"
        assert insight.log_count == 7, f"Expected 7 logs, got {insight.log_count}"
        assert insight.dominant_emotion == "sadness", f"Expected sadness, got {insight.dominant_emotion}"
        assert insight.dominance_pct >= 0.70, f"Sadness should be >70%, got {insight.dominance_pct:.0%}"
        assert insight.sustained_sadness == True, "Should flag sustained sadness"
        assert insight.trend in ["stable", "changing", "unknown"], f"Invalid trend: {insight.trend}"
        
        print("[PASS] Test 1: Basic insight generation")


async def test_insufficient_data():
    """Test handling of sparse data."""
    async with SessionLocal() as db:
        user_id = await get_test_user(db)
        
        await db.execute(delete(EmotionLog).where(EmotionLog.user_id == user_id))
        await db.commit()
        
        insight = await analytics_service.generate_user_insights(db, user_id, days=7)
        
        assert insight.insufficient_data == True, "Should flag insufficient data"
        assert insight.log_count == 0, "Should have 0 logs"
        assert insight.dominant_emotion == "neutral", "Should default to neutral"
        assert insight.trend == "unknown", "Trend should be unknown"
        
        print("[PASS] Test 2: Insufficient data handling")


async def test_emotion_distribution():
    """Test emotion distribution calculation."""
    async with SessionLocal() as db:
        user_id = await get_test_user(db)
        
        await db.execute(delete(EmotionLog).where(EmotionLog.user_id == user_id))
        
        conv = Conversation(user_id=user_id, title="Diverse Test")
        db.add(conv)
        await db.flush()
        conv_id = conv.id
        
        emotions = ["sadness"] * 5 + ["joy"] * 3 + ["anger"] * 2
        for idx, emotion in enumerate(emotions):
            msg = Message(conversation_id=conv_id, role="user", content="test")
            db.add(msg)
            await db.flush()
            
            log = EmotionLog(
                user_id=user_id,
                conversation_id=conv_id,
                message_id=msg.id,
                primary_emotion=emotion,
                confidence=0.75
            )
            db.add(log)
        
        await db.commit()
        
        insight = await analytics_service.generate_user_insights(db, user_id, days=7)
        
        expected_sadness = 5 / 10
        expected_joy = 3 / 10
        expected_anger = 2 / 10
        
        assert abs(insight.emotion_distribution["sadness"] - expected_sadness) < 0.01
        assert abs(insight.emotion_distribution["joy"] - expected_joy) < 0.01
        assert abs(insight.emotion_distribution["anger"] - expected_anger) < 0.01
        
        print("[PASS] Test 3: Emotion distribution")


async def test_volatility():
    """Test volatility flag calculation."""
    async with SessionLocal() as db:
        user_id = await get_test_user(db)
        
        await db.execute(delete(EmotionLog).where(EmotionLog.user_id == user_id))
        
        conv = Conversation(user_id=user_id, title="Volatility Test")
        db.add(conv)
        await db.flush()
        conv_id = conv.id
        
        confidences = [0.1, 0.9, 0.2, 0.8, 0.15, 0.85]
        emotions = ["sadness", "joy", "anger", "fear", "sadness", "joy"]
        
        for idx, (emotion, confidence) in enumerate(zip(emotions, confidences)):
            msg = Message(conversation_id=conv_id, role="user", content="test")
            db.add(msg)
            await db.flush()
            
            log = EmotionLog(
                user_id=user_id,
                conversation_id=conv_id,
                message_id=msg.id,
                primary_emotion=emotion,
                confidence=confidence
            )
            db.add(log)
        
        await db.commit()
        
        insight = await analytics_service.generate_user_insights(db, user_id, days=7)
        
        assert insight.volatility_flag == True, "Should flag high volatility"
        
        print("[PASS] Test 4: Volatility detection")


async def test_llm_context_fields():
    """Test LLM context field population."""
    async with SessionLocal() as db:
        user_id = await get_test_user(db)
        await create_test_data(db, user_id)
        
        insight = await analytics_service.generate_user_insights(db, user_id, days=7)
        
        assert insight.suggested_tone in ["gentle", "affirming", "validating", "reassuring", "curious", "neutral"]
        assert insight.suggested_approach in ["grounding", "affirmation", "cognitive_reframe", "exploration"]
        assert isinstance(insight.avoid_triggers, list)
        assert len(insight.avoid_triggers) > 0, "Should have trigger warnings for sadness"
        
        print("[PASS] Test 5: LLM context fields populated")


async def test_trend_detection():
    """Test trend detection logic."""
    async with SessionLocal() as db:
        user_id = await get_test_user(db)
        
        await db.execute(delete(EmotionLog).where(EmotionLog.user_id == user_id))
        
        conv = Conversation(user_id=user_id, title="Trend Test")
        db.add(conv)
        await db.flush()
        conv_id = conv.id
        
        emotions = ["sadness"] * 3 + ["joy"] * 3
        
        for idx, emotion in enumerate(emotions):
            msg = Message(conversation_id=conv_id, role="user", content="test")
            db.add(msg)
            await db.flush()
            
            log = EmotionLog(
                user_id=user_id,
                conversation_id=conv_id,
                message_id=msg.id,
                primary_emotion=emotion,
                confidence=0.8
            )
            db.add(log)
        
        await db.commit()
        
        insight = await analytics_service.generate_user_insights(db, user_id, days=7)
        
        assert insight.trend == "changing", f"Expected changing trend, got {insight.trend}"
        assert "sadness" in insight.trend_description or "joy" in insight.trend_description
        
        print("[PASS] Test 6: Trend detection")


async def test_crisis_risk_assessment():
    """Test high risk flag calculation."""
    async with SessionLocal() as db:
        user_id = await get_test_user(db)
        
        await db.execute(delete(EmotionLog).where(EmotionLog.user_id == user_id))
        await db.execute(delete(CrisisEvent).where(CrisisEvent.user_id == user_id))
        
        conv = Conversation(user_id=user_id, title="Risk Test")
        db.add(conv)
        await db.flush()
        conv_id = conv.id
        
        for i in range(5):
            msg = Message(conversation_id=conv_id, role="user", content="test")
            db.add(msg)
            await db.flush()
            
            log = EmotionLog(
                user_id=user_id,
                conversation_id=conv_id,
                message_id=msg.id,
                primary_emotion="sadness",
                confidence=0.85
            )
            db.add(log)
        
        for i in range(2):
            event = CrisisEvent(
                user_id=user_id,
                conversation_id=conv_id,
                severity="danger",
                confidence=0.9
            )
            db.add(event)
        
        await db.commit()
        
        insight = await analytics_service.generate_user_insights(db, user_id, days=7)
        
        assert insight.high_risk == True, "Should flag high risk (2+ crises + sadness)"
        assert insight.crisis_count_48h >= 2, "Should detect crisis count"
        
        print("[PASS] Test 7: Crisis risk assessment")


async def test_schema_export():
    """Test insight can be serialized to JSON."""
    async with SessionLocal() as db:
        user_id = await get_test_user(db)
        await create_test_data(db, user_id)
        
        insight = await analytics_service.generate_user_insights(db, user_id, days=7)
        
        insight_dict = insight.model_dump()
        assert isinstance(insight_dict, dict)
        assert "dominant_emotion" in insight_dict
        assert "emotion_distribution" in insight_dict
        assert "suggested_tone" in insight_dict
        
        insight_dict["computed_at"] = insight_dict["computed_at"].isoformat()
        import json
        json_str = json.dumps(insight_dict)
        assert len(json_str) > 0
        
        print("[PASS] Test 8: Schema export to JSON")


async def test_non_blocking_failure():
    """Test service doesn't crash on DB errors."""
    async with SessionLocal() as db:
        user_id = 99999
        
        insight = await analytics_service.generate_user_insights(db, user_id, days=7)
        
        assert insight.insufficient_data == True
        assert insight.user_id == user_id
        
        print("[PASS] Test 9: Non-blocking error handling")


async def run_all_tests():
    """Run all test suites."""
    await setup_db()
    
    print("\n" + "="*60)
    print("PHASE 4: EMOTION ANALYTICS TESTS")
    print("="*60 + "\n")
    
    try:
        await test_basic_insight()
        await test_insufficient_data()
        await test_emotion_distribution()
        await test_volatility()
        await test_llm_context_fields()
        await test_trend_detection()
        await test_crisis_risk_assessment()
        await test_schema_export()
        await test_non_blocking_failure()
        
        print("\n" + "="*60)
        print("[PASS] ALL TESTS PASSED")
        print("="*60)
        print("\nPhase 4 ready. Emotion analytics working correctly.")
        print("Next: Phase 5A - XLNet emotion classifier integration\n")
        
        return True
    
    except AssertionError as e:
        print(f"\n[FAIL] TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
