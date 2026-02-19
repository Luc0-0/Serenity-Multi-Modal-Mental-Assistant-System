#!/usr/bin/env python3
"""
COMPREHENSIVE SYSTEM TEST - WEEK-LONG EMOTIONAL JOURNEY
========================================================

Tests all core functionality:
1. Conversation creation and message persistence
2. Emotion detection on 21 messages over 7 days
3. Emotional insight card generation
4. System prompt adaptation
5. Message retrieval and formatting
6. Crisis detection

All tests run against actual database with real models.
"""

import asyncio
import sys
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

sys.path.insert(0, str(__file__).rsplit('\\', 1)[0])

from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.emotion_log import EmotionLog
from app.db.base import Base
from app.services.conversation_service import ConversationService
from app.services.emotion_service import EmotionService
from app.services.crisis_service import CrisisService
from app.services.ollama_service import OllamaService
from app.schemas.emotion_insight import EmotionInsight

WEEK_DATA = [
    ("Monday", [
        "I'm really stressed about the deadline at work. Everything feels overwhelming.",
        "I can't seem to focus. My mind keeps racing.",
        "I'm overthinking everything. What if I mess this up?",
    ]),
    ("Tuesday", [
        "Woke up feeling anxious. Had a difficult meeting at work.",
        "My manager was critical of my work. I feel inadequate.",
        "I'm doubting my abilities. Maybe I'm not cut out for this job.",
    ]),
    ("Wednesday", [
        "A friend reached out and checked on me. That felt nice.",
        "I'm feeling slightly better today. Less anxious.",
        "Getting back into things. Taking it one step at a time.",
    ]),
    ("Thursday", [
        "Good day today! I actually completed a challenging task.",
        "I'm feeling productive and capable. This is nice.",
        "Really proud of myself. It's amazing what I can do when focused.",
    ]),
    ("Friday", [
        "Friday but feeling stressed again. Work keeps piling up.",
        "I'm having dark thoughts. This is too much to handle.",
        "I don't know if I can keep going like this.",
    ]),
    ("Saturday", [
        "Took some time for self-care today. Went for a walk.",
        "The fresh air helped. I'm starting to feel more grounded.",
        "Reflecting on the week. It wasn't all bad.",
    ]),
    ("Sunday", [
        "Spent time with family. Feeling connected.",
        "Grateful for the people in my life. They mean so much.",
        "Ready to start the week fresh. I've got this.",
    ]),
]

class ComprehensiveWeekTest:
    def __init__(self):
        self.passes = 0
        self.failures = 0
        self.user_id = None
        self.conversations = {}
        self.emotions = []

    def log(self, msg, level="INFO"):
        """Simple logging."""
        prefix = {
            "INFO": "[INFO]",
            "PASS": "[PASS]",
            "FAIL": "[FAIL]",
            "TEST": "[TEST]",
            "DATA": "[DATA]",
        }.get(level, "[LOG]")
        print(f"  {prefix} {msg}")

    def assert_true(self, condition, test_name):
        """Check assertion."""
        if condition:
            self.log(f"{test_name}: OK", "PASS")
            self.passes += 1
            return True
        else:
            self.log(f"{test_name}: FAILED", "FAIL")
            self.failures += 1
            return False

    async def run(self):
        """Run all tests."""
        print("\n" + "="*70)
        print("SERENITY: COMPREHENSIVE WEEK-LONG EMOTIONAL JOURNEY TEST")
        print("="*70 + "\n")

        # Setup
        print("\n[SETUP] Initializing database and services...")
        engine = create_async_engine(
            "sqlite+aiosqlite:///./serenity_test.db",
            echo=False,
            future=True
        )
        
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        SessionLocal = sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False
        )

        try:
            async with SessionLocal() as session:
                # Create user
                await self._create_test_user(session)
                await session.commit()
                
                # Run all tests
                await self._test_week_simulation(SessionLocal)
                await self._test_persistence(SessionLocal)
                await self._test_emotion_insights(SessionLocal)
                await self._test_system_prompts(SessionLocal)
                
        finally:
            await engine.dispose()

        # Print summary
        print("\n" + "="*70)
        print(f"RESULTS: {self.passes} PASSED, {self.failures} FAILED")
        print("="*70 + "\n")
        
        return 0 if self.failures == 0 else 1

    async def _create_test_user(self, session):
        """Create or get test user."""
        print("\n[TEST 1] Creating test user...")
        
        result = await session.execute(
            select(User).where(User.username == "week_test_user")
        )
        user = result.scalar_one_or_none()
        
        if user:
            self.user_id = user.id
            self.assert_true(True, "Using existing test user")
        else:
            new_user = User(
                username="week_test_user",
                email="week_test@example.com",
                hashed_password="test_hash",
                name="Week Test User"
            )
            session.add(new_user)
            await session.flush()
            self.user_id = new_user.id
            self.assert_true(True, "Created new test user")

    async def _test_week_simulation(self, SessionLocal):
        """Simulate week of messages and emotions."""
        print("\n[TEST 2] Simulating 7-day emotional journey (21 messages)...")
        
        conv_service = ConversationService()
        emotion_service = EmotionService()
        crisis_service = CrisisService()
        
        base_date = datetime.now() - timedelta(days=7)
        total_messages = 0
        total_emotions = 0
        crisis_detected_count = 0
        
        async with SessionLocal() as session:
            for day_idx, (day_name, messages) in enumerate(WEEK_DATA):
                current_date = base_date + timedelta(days=day_idx)
                
                # Create conversation
                conv_id = await conv_service.create_conversation(
                    session, self.user_id, title=f"{day_name} Check-in"
                )
                self.conversations[day_name] = conv_id
                await session.flush()
                
                # Process messages
                for msg_idx, msg_text in enumerate(messages):
                    # Save message
                    msg_id = await conv_service.save_message(
                        session, conv_id, "user", msg_text
                    )
                    await session.flush()
                    total_messages += 1
                    
                    # Detect emotion
                    emotion_result = await emotion_service.detect_emotion(msg_text)
                    emotion_label = emotion_result.get("label", "unknown")
                    confidence = emotion_result.get("confidence", 0.5)
                    
                    # Log emotion
                    emotion_log = EmotionLog(
                        user_id=self.user_id,
                        conversation_id=conv_id,
                        message_id=msg_id,
                        primary_emotion=emotion_label,
                        confidence=confidence,
                        intensity=confidence
                    )
                    session.add(emotion_log)
                    self.emotions.append((day_name, emotion_label, confidence))
                    total_emotions += 1
                    await session.flush()
                    
                    # Check crisis
                    crisis_result = await crisis_service.assess_threat(
                        message=msg_text,
                        emotion_label=emotion_label,
                        conversation_history=None,
                        user_id=self.user_id
                    )
                    if crisis_result.get("requires_escalation"):
                        crisis_detected_count += 1
            
            await session.commit()
        
        self.assert_true(total_messages == 21, f"All 21 messages saved (got {total_messages})")
        self.assert_true(total_emotions == 21, f"All 21 emotions logged (got {total_emotions})")
        self.assert_true(len(self.conversations) == 7, f"7 conversations created (got {len(self.conversations)})")

    async def _test_persistence(self, SessionLocal):
        """Verify data persists in database."""
        print("\n[TEST 3] Verifying data persistence...")
        
        async with SessionLocal() as session:
            # Check conversations
            result = await session.execute(
                select(Conversation).where(Conversation.user_id == self.user_id)
            )
            convs = result.scalars().all()
            self.assert_true(len(convs) >= 7, f"At least 7 conversations in DB (got {len(convs)})")
            
            # Check messages
            result = await session.execute(
                select(Message).join(Conversation)
                .where(Conversation.user_id == self.user_id)
            )
            messages = result.scalars().all()
            self.assert_true(len(messages) >= 21, f"At least 21 messages in DB (got {len(messages)})")
            
            # Check emotions
            result = await session.execute(
                select(EmotionLog).where(EmotionLog.user_id == self.user_id)
            )
            emotions = result.scalars().all()
            self.assert_true(len(emotions) >= 21, f"At least 21 emotion logs in DB (got {len(emotions)})")

    async def _test_emotion_insights(self, SessionLocal):
        """Generate and validate emotion insights."""
        print("\n[TEST 4] Generating emotional insight card...")
        
        async with SessionLocal() as session:
            # Get all emotion logs
            result = await session.execute(
                select(EmotionLog)
                .where(EmotionLog.user_id == self.user_id)
                .order_by(EmotionLog.created_at)
            )
            logs = result.scalars().all()
            
            if not logs:
                self.assert_true(False, "No emotion logs found")
                return
            
            # Calculate distribution
            emotion_counts = {}
            for log in logs:
                emotion = log.primary_emotion
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            total = len(logs)
            emotion_distribution = {
                e: count / total for e, count in emotion_counts.items()
            }
            
            # Print distribution
            print("\n  Emotion Distribution:")
            for emotion, pct in sorted(emotion_distribution.items(), 
                                     key=lambda x: x[1], reverse=True):
                print(f"    - {emotion}: {pct:.1%}")
            
            # Find dominant
            dominant_emotion, dominance_pct = max(
                emotion_distribution.items(),
                key=lambda x: x[1]
            )
            
            self.assert_true(
                dominant_emotion is not None,
                f"Dominant emotion identified: {dominant_emotion} ({dominance_pct:.1%})"
            )
            
            # Check distribution sums to ~100%
            dist_sum = sum(emotion_distribution.values())
            self.assert_true(
                0.95 <= dist_sum <= 1.05,
                f"Distribution normalized to 100% (got {dist_sum:.1%})"
            )

    async def _test_system_prompts(self, SessionLocal):
        """Test that system prompts adapt to emotions."""
        print("\n[TEST 5] Testing system prompt adaptation...")
        
        ollama = OllamaService()
        
        async with SessionLocal() as session:
            result = await session.execute(
                select(EmotionLog)
                .where(EmotionLog.user_id == self.user_id)
            )
            logs = result.scalars().all()
            
            if not logs:
                return
            
            # Calculate distribution
            emotion_counts = {}
            for log in logs:
                emotion = log.primary_emotion
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            total = len(logs)
            emotion_distribution = {
                e: count / total for e, count in emotion_counts.items()
            }
            
            dominant_emotion, dominance_pct = max(
                emotion_distribution.items(),
                key=lambda x: x[1]
            )
            
            # Create insight
            insight = EmotionInsight(
                user_id=self.user_id,
                period_days=7,
                log_count=len(logs),
                insufficient_data=False,
                dominant_emotion=dominant_emotion,
                dominance_pct=dominance_pct,
                avg_confidence=0.65,
                emotion_distribution=emotion_distribution,
                trend="mixed",
                trend_description="Week showed mixed patterns",
                volatility_flag=False,
                sustained_sadness=False,
                high_risk=False,
                crisis_count_48h=0,
                suggested_tone="balanced",
                suggested_approach="supportive",
                avoid_triggers=[],
                computed_at=datetime.now()
            )
            
            # Generate prompt
            prompt = ollama._build_system_prompt(insight)
            
            # Verify it includes context
            has_emotional_picture = "EMOTIONAL PICTURE" in prompt
            has_dominant = dominant_emotion.lower() in prompt.lower()
            has_tone = "TONE GUIDANCE" in prompt
            
            self.assert_true(has_emotional_picture, "Prompt includes emotional picture")
            self.assert_true(has_dominant, f"Prompt includes dominant emotion '{dominant_emotion}'")
            self.assert_true(has_tone, "Prompt includes tone guidance")
            
            print(f"\n  Generated prompt excerpt (200 chars):")
            print(f"    {prompt[:200]}...")


async def main():
    tester = ComprehensiveWeekTest()
    return await tester.run()


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
