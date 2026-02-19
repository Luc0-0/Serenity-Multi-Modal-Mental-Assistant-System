#!/usr/bin/env python3
"""Integration test: Verify Phase 4 works in chat flow."""

import asyncio
import json
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete

from app.db.base import Base
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.emotion_log import EmotionLog
from app.services.emotion_analytics_service import EmotionAnalyticsService


DATABASE_URL = "sqlite+aiosqlite:///./serenity.db"
engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def test_integration():
    """Simulate chat flow with emotion analytics."""
    
    async with SessionLocal() as db:
        print("\n" + "="*70)
        print("PHASE 4 INTEGRATION TEST: Chat Flow with Analytics")
        print("="*70 + "\n")
        
        # Setup test data
        query = select(User).where(User.username == "integration_test")
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                username="integration_test",
                email="integration@test.com",
                hashed_password="test"
            )
            db.add(user)
            await db.flush()
        
        user_id = user.id
        
        # Clear old test data
        await db.execute(delete(EmotionLog).where(EmotionLog.user_id == user_id))
        await db.execute(delete(Message).where(Message.conversation_id.in_(
            select(Conversation.id).where(Conversation.user_id == user_id)
        )))
        await db.execute(delete(Conversation).where(Conversation.user_id == user_id))
        await db.commit()
        
        # Create conversation
        conv = Conversation(user_id=user_id, title="Integration Test")
        db.add(conv)
        await db.flush()
        conv_id = conv.id
        
        # Simulate 5 chat messages with emotions
        print("[INFO] Simulating chat messages with emotions...\n")
        
        messages = [
            ("I've been feeling really sad lately", "sadness", 0.85),
            ("Work has been overwhelming", "fear", 0.75),
            ("I can't handle this stress", "sadness", 0.88),
            ("Everything feels hopeless", "sadness", 0.92),
            ("I don't know how to cope anymore", "sadness", 0.90),
        ]
        
        for user_text, emotion, confidence in messages:
            # Save user message
            msg = Message(conversation_id=conv_id, role="user", content=user_text)
            db.add(msg)
            await db.flush()
            msg_id = msg.id
            
            # Log emotion (as chat endpoint does)
            emotion_log = EmotionLog(
                user_id=user_id,
                conversation_id=conv_id,
                message_id=msg_id,
                primary_emotion=emotion,
                confidence=confidence
            )
            db.add(emotion_log)
            
            # Save assistant response
            assistant_msg = Message(
                conversation_id=conv_id,
                role="assistant",
                content="I'm here to listen..."
            )
            db.add(assistant_msg)
            
            print(f"  Message: '{user_text[:50]}...'")
            print(f"  Emotion: {emotion} ({confidence:.0%})")
        
        await db.commit()
        
        print("\n[INFO] Generating emotional insight (Phase 4)...\n")
        
        # Call analytics service (as chat endpoint does)
        analytics = EmotionAnalyticsService()
        insight = await analytics.generate_user_insights(db, user_id, days=7)
        
        # Display results
        print(f"[RESULT] Emotional Analytics Output:")
        print(f"  Dominant emotion: {insight.dominant_emotion} ({insight.dominance_pct:.0%})")
        print(f"  Log count: {insight.log_count}")
        print(f"  Trend: {insight.trend}")
        print(f"  Trend desc: {insight.trend_description}")
        print(f"  Sustained sadness: {insight.sustained_sadness}")
        print(f"  Volatility: {insight.volatility_flag}")
        print(f"  High risk: {insight.high_risk}")
        print(f"  Avg confidence: {insight.avg_confidence:.2f}")
        
        print(f"\n[LLM] Conditioning fields (for Phase 5B):")
        print(f"  Suggested tone: {insight.suggested_tone}")
        print(f"  Suggested approach: {insight.suggested_approach}")
        print(f"  Avoid triggers: {insight.avoid_triggers}")
        
        # Verify analytics accuracy
        print(f"\n[VERIFY] Checking accuracy...\n")
        
        checks = [
            (insight.log_count == 5, "Log count is 5"),
            (insight.dominant_emotion == "sadness", "Dominant emotion is sadness"),
            (insight.dominance_pct >= 0.80, "Sadness is >80%"),
            (insight.sustained_sadness == True, "Sustained sadness flagged"),
            (insight.trend in ["stable", "changing", "unknown"], "Trend is valid"),
            (insight.suggested_tone == "gentle", "Tone is 'gentle'"),
            (len(insight.avoid_triggers) > 0, "Trigger warnings present"),
        ]
        
        all_pass = True
        for check, desc in checks:
            status = "[OK]" if check else "[FAIL]"
            print(f"  {status} {desc}")
            all_pass = all_pass and check
        
        # Export to JSON (as API would)
        print(f"\n[JSON] Exporting insight...\n")
        
        insight_dict = insight.model_dump()
        insight_dict["computed_at"] = insight_dict["computed_at"].isoformat()
        json_output = json.dumps(insight_dict, indent=2)
        
        print("Sample JSON output (first 400 chars):")
        print(json_output[:400] + "...\n")
        
        if all_pass:
            print("="*70)
            print("[PASS] INTEGRATION TEST SUCCESSFUL")
            print("="*70)
            print("\nPhase 4 is fully integrated into chat flow.")
            print("Ready for Phase 5: XLNet + Ollama integration.\n")
            return True
        else:
            print("\n[FAIL] Some checks failed")
            return False


if __name__ == "__main__":
    success = asyncio.run(test_integration())
    import sys
    sys.exit(0 if success else 1)
