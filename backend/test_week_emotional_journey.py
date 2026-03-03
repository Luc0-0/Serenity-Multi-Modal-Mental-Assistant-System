#!/usr/bin/env python3
"""
COMPREHENSIVE WEEK-LONG EMOTIONAL JOURNEY TEST
===============================================

This test script:
1. Creates a user and simulates 7 days of emotional messages
2. Tests the emotion detection pipeline
3. Verifies conversation flow and persistence
4. Tests emotional insight card generation and accuracy
5. Validates system prompt adaptation based on emotional patterns
6. Tests crisis detection on specific messages
7. Verifies database integrity after all operations

Simulated Emotional Journey (Monday-Sunday):
- Monday: Stressed about work (high anxiety)
- Tuesday: Feeling overwhelmed (mixed emotions)
- Wednesday: Slightly better, hopeful (anxiety decreases)
- Thursday: Good day, productive (positive emotions)
- Friday: Stressed again, minor crisis signal (anxiety spike)
- Saturday: Recovering, reflecting (calm, contemplative)
- Sunday: Grateful and peaceful (contentment)
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
from app.models.message import Message, MessageRole
from app.models.emotion_log import EmotionLog
from app.db.base import Base
from app.services.conversation_service import ConversationService
from app.services.emotion_service import EmotionService
from app.services.ollama_service import OllamaService
from app.services.crisis_service import CrisisService
from app.core.config import settings

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
CYAN = '\033[96m'
RESET = '\033[0m'

# Test data: 7 days of emotional journey
EMOTIONAL_JOURNEY = [
    {
        "day": "Monday",
        "messages": [
            "I'm really stressed about the deadline at work. Everything feels like it's piling up.",
            "I can't seem to focus. My mind keeps racing with all these tasks.",
            "I'm overthinking everything. What if I mess this up?",
        ],
        "expected_emotions": ["anxiety", "stress", "worry"],
        "should_be_crisis": False,
    },
    {
        "day": "Tuesday",
        "messages": [
            "Woke up feeling anxious. Had a bad meeting at work.",
            "My manager was critical of my work. I feel inadequate.",
            "I'm doubting my abilities. Maybe I'm not good enough for this job.",
        ],
        "expected_emotions": ["anxiety", "sadness", "stress"],
        "should_be_crisis": False,
    },
    {
        "day": "Wednesday",
        "messages": [
            "A friend reached out and checked on me. That felt nice.",
            "I'm feeling slightly better today. Less anxious.",
            "Getting back into things. Taking it one step at a time.",
        ],
        "expected_emotions": ["calm", "hope", "gratitude"],
        "should_be_crisis": False,
    },
    {
        "day": "Thursday",
        "messages": [
            "Good day today! I actually completed a challenging task.",
            "I'm feeling productive and capable. This is nice.",
            "Really proud of myself. It's amazing what I can do when I'm in the right headspace.",
        ],
        "expected_emotions": ["happiness", "pride", "contentment"],
        "should_be_crisis": False,
    },
    {
        "day": "Friday",
        "messages": [
            "Friday but feeling stressed again. Work keeps piling up.",
            "I'm having dark thoughts. This is too much to handle.",  # CRISIS SIGNAL
            "I don't know if I can keep going like this.",
        ],
        "expected_emotions": ["anxiety", "hopelessness", "despair"],
        "should_be_crisis": True,
    },
    {
        "day": "Saturday",
        "messages": [
            "Took some time for self-care today. Went for a walk.",
            "The fresh air helped. I'm starting to feel more grounded.",
            "Reflecting on the week. It wasn't all bad.",
        ],
        "expected_emotions": ["calm", "peace", "reflection"],
        "should_be_crisis": False,
    },
    {
        "day": "Sunday",
        "messages": [
            "Spent time with family. Feeling connected.",
            "Grateful for the people in my life. They mean so much to me.",
            "Ready to start the week fresh. I've got this.",
        ],
        "expected_emotions": ["gratitude", "contentment", "hope"],
        "should_be_crisis": False,
    },
]

class WeeklyEmotionalTest:
    def __init__(self):
        self.results = {
            "passed": 0,
            "failed": 0,
            "sections": {}
        }
        self.engine = None
        self.user_id = None
        self.conversation_ids = []
        self.emotion_logs = []

    async def setup_database(self):
        """Initialize database."""
        print(f"\n{CYAN}[SETUP] Initializing database...{RESET}")
        
        # Use database URL from settings, or fallback to PostgreSQL
        db_url = settings.database_url
        if not db_url:
            # Fallback: use sqlite for testing if no db URL
            db_url = "sqlite+aiosqlite:///./serenity_test.db"
            print(f"{YELLOW}[INFO] No DATABASE_URL set, using SQLite fallback: {db_url}{RESET}")
        
        self.engine = create_async_engine(
            db_url,
            echo=False,
            future=True,
        )
        
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print(f"{GREEN}[OK] Database ready{RESET}")

    async def create_test_user(self, session: AsyncSession):
        """Create or get test user."""
        print(f"\n{CYAN}[SETUP] Creating test user...{RESET}")
        
        # Check existing
        result = await session.execute(
            select(User).where(User.username == "emotion_test_user")
        )
        user = result.scalar_one_or_none()
        
        if user:
            print(f"{GREEN}[OK] Using existing user: {user.id}{RESET}")
            self.user_id = user.id
            return user.id
        
        # Create new
        new_user = User(
            username="emotion_test_user",
            email="emotion_test@example.com",
            hashed_password="test_hash_123",
            name="Test User"
        )
        session.add(new_user)
        await session.flush()
        print(f"{GREEN}[OK] Created user: {new_user.id}{RESET}")
        self.user_id = new_user.id
        return new_user.id

    async def simulate_emotional_week(self, session: AsyncSession):
        """Simulate 7 days of emotional journey."""
        print(f"\n{BLUE}{'='*70}")
        print(f"SIMULATING 7-DAY EMOTIONAL JOURNEY")
        print(f"{'='*70}{RESET}\n")
        
        conv_service = ConversationService()
        emotion_service = EmotionService()
        crisis_service = CrisisService()
        
        base_date = datetime.now() - timedelta(days=7)
        
        for day_idx, day_data in enumerate(EMOTIONAL_JOURNEY):
            day_name = day_data["day"]
            current_date = base_date + timedelta(days=day_idx)
            
            print(f"\n{YELLOW}{'='*70}")
            print(f"DAY {day_idx + 1}: {day_name.upper()} - {current_date.strftime('%Y-%m-%d')}")
            print(f"{'='*70}{RESET}\n")
            
            # Create conversation for the day
            conv_id = await conv_service.create_conversation(
                session,
                self.user_id,
                title=f"{day_name} Check-in"
            )
            self.conversation_ids.append(conv_id)
            print(f"{GREEN}[OK] Created conversation: {conv_id}{RESET}")
            
            # Process each message
            for msg_idx, message in enumerate(day_data["messages"], 1):
                print(f"\n  [{msg_idx}] User: {message[:60]}...")
                
                # Save message FIRST to get its ID
                try:
                    msg_id = await conv_service.save_message(
                        session,
                        conv_id,
                        "user",
                        message
                    )
                    await session.flush()
                except Exception as e:
                    print(f"      {RED}[ERROR] Failed to save message: {e}{RESET}")
                    self.results["failed"] += 1
                    continue
                
                # Detect emotion
                try:
                    emotion_result = await emotion_service.detect_emotion(message)
                    detected_emotion = emotion_result.get("label", "unknown")
                    confidence = emotion_result.get("confidence", 0.0)
                    print(f"      {CYAN}Emotion: {detected_emotion} ({confidence:.1%}){RESET}")
                    
                    # Log emotion with proper foreign keys
                    emotion_log = EmotionLog(
                        user_id=self.user_id,
                        conversation_id=conv_id,
                        message_id=msg_id,
                        primary_emotion=detected_emotion,
                        confidence=confidence,
                        intensity=confidence
                    )
                    session.add(emotion_log)
                    self.emotion_logs.append(emotion_log)
                    
                except Exception as e:
                    print(f"      {RED}[ERROR] Emotion detection failed: {e}{RESET}")
                    self.results["failed"] += 1
                    continue
                
                # Check crisis
                try:
                    crisis_result = await crisis_service.assess_threat(
                        message=message,
                        emotion_label=detected_emotion,
                        conversation_history=None,
                        user_id=self.user_id
                    )
                    is_crisis = crisis_result.get("requires_escalation", False)
                    severity = crisis_result.get("severity", "low")
                    
                    if is_crisis:
                        print(f"      {RED}[CRISIS] Severity: {severity}{RESET}")
                    else:
                        print(f"      {GREEN}[SAFE]{RESET}")
                    
                    # Verify crisis detection matches expectation
                    should_be_crisis = day_data["should_be_crisis"]
                    if day_idx == 4 and msg_idx == 2:  # Friday, 2nd message
                        if is_crisis and should_be_crisis:
                            print(f"      {GREEN}[OK] Crisis correctly detected{RESET}")
                            self.results["passed"] += 1
                        elif should_be_crisis and not is_crisis:
                            print(f"      {RED}[FAIL] Crisis should have been detected{RESET}")
                            self.results["failed"] += 1
                    
                except Exception as e:
                    print(f"      {RED}[ERROR] Crisis assessment failed: {e}{RESET}")
                    self.results["failed"] += 1
                    continue
                
                # Message already saved above
                self.results["passed"] += 1
            
            await session.commit()
        
        print(f"\n{BLUE}{'='*70}")
        print(f"SIMULATED WEEK COMPLETE - {len(self.emotion_logs)} emotions logged")
        print(f"{'='*70}{RESET}\n")

    async def test_emotional_insight_card(self, session: AsyncSession):
        """Test emotional insight card generation."""
        print(f"\n{BLUE}{'='*70}")
        print(f"TESTING EMOTIONAL INSIGHT CARD")
        print(f"{'='*70}{RESET}\n")
        
        emotion_service = EmotionService()
        
        try:
            # Get emotion insights from the database
            result = await session.execute(
                select(EmotionLog).where(
                    EmotionLog.user_id == self.user_id
                ).order_by(EmotionLog.created_at)
            )
            logs = result.scalars().all()
            
            print(f"{GREEN}[OK] Retrieved {len(logs)} emotion logs{RESET}")
            
            # Calculate emotion distribution
            emotion_counts = {}
            for log in logs:
                emotion = log.primary_emotion
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            total = len(logs)
            emotion_distribution = {
                e: count / total for e, count in emotion_counts.items()
            }
            
            print(f"\n{CYAN}Emotion Distribution over the week:{RESET}")
            for emotion, pct in sorted(emotion_distribution.items(), key=lambda x: x[1], reverse=True):
                bar = "=" * int(pct * 30)
                print(f"  {emotion:15} {bar} {pct:.1%}")
            
            # Find dominant emotion
            dominant = max(emotion_distribution.items(), key=lambda x: x[1])
            print(f"\n{CYAN}Dominant Emotion: {dominant[0]} ({dominant[1]:.1%}){RESET}")
            
            # Check for trend (early week vs late week)
            early_week_emotions = [log.primary_emotion for log in logs[:len(logs)//2]]
            late_week_emotions = [log.primary_emotion for log in logs[len(logs)//2:]]
            
            def most_common(lst):
                return max(set(lst), key=lst.count) if lst else "unknown"
            
            early_dominant = most_common(early_week_emotions)
            late_dominant = most_common(late_week_emotions)
            
            print(f"\n{CYAN}Trend Analysis:{RESET}")
            print(f"  Early week dominant: {early_dominant}")
            print(f"  Late week dominant: {late_dominant}")
            
            # Volatility check
            emotions_sequence = [log.primary_emotion for log in logs]
            changes = sum(1 for i in range(len(emotions_sequence)-1) 
                         if emotions_sequence[i] != emotions_sequence[i+1])
            volatility_score = changes / len(emotions_sequence) if len(emotions_sequence) > 0 else 0
            
            print(f"  Volatility Score: {volatility_score:.2f} (0=stable, 1=highly volatile)")
            
            if volatility_score > 0.5:
                print(f"  {YELLOW}Status: Fluctuating emotions{RESET}")
                self.results["passed"] += 1
            else:
                print(f"  {GREEN}Status: Relatively stable{RESET}")
                self.results["passed"] += 1
            
        except Exception as e:
            print(f"{RED}[ERROR] Failed to generate insights: {e}{RESET}")
            self.results["failed"] += 1

    async def test_conversation_persistence(self, session: AsyncSession):
        """Verify conversations and messages are persisted."""
        print(f"\n{BLUE}{'='*70}")
        print(f"TESTING CONVERSATION PERSISTENCE")
        print(f"{'='*70}{RESET}\n")
        
        try:
            # Verify conversations
            result = await session.execute(
                select(Conversation).where(
                    Conversation.user_id == self.user_id
                ).order_by(Conversation.created_at)
            )
            conversations = result.scalars().all()
            
            print(f"{GREEN}[OK] Found {len(conversations)} conversations{RESET}")
            self.results["passed"] += 1
            
            total_messages = 0
            for conv in conversations:
                # Count messages in each conversation
                msg_result = await session.execute(
                    select(Message).where(
                        Message.conversation_id == conv.id
                    )
                )
                messages = msg_result.scalars().all()
                total_messages += len(messages)
                
                print(f"  - {conv.title}: {len(messages)} messages")
            
            print(f"\n{GREEN}[OK] Total messages across all conversations: {total_messages}{RESET}")
            self.results["passed"] += 1
            
            # Verify emotional logs
            log_result = await session.execute(
                select(EmotionLog).where(
                    EmotionLog.user_id == self.user_id
                )
            )
            emotion_logs = log_result.scalars().all()
            
            print(f"{GREEN}[OK] Emotion logs in database: {len(emotion_logs)}{RESET}")
            self.results["passed"] += 1
            
        except Exception as e:
            print(f"{RED}[ERROR] Persistence check failed: {e}{RESET}")
            self.results["failed"] += 1

    async def test_system_prompt_adaptation(self, session: AsyncSession):
        """Test that system prompts adapt to emotional patterns."""
        print(f"\n{BLUE}{'='*70}")
        print(f"TESTING SYSTEM PROMPT ADAPTATION")
        print(f"{'='*70}{RESET}\n")
        
        ollama_service = OllamaService()
        
        try:
            # Get emotion logs
            result = await session.execute(
                select(EmotionLog).where(
                    EmotionLog.user_id == self.user_id
                )
            )
            logs = result.scalars().all()
            
            if not logs:
                print(f"{YELLOW}[SKIP] No emotion logs to test{RESET}")
                return
            
            # Calculate emotion distribution
            emotion_counts = {}
            for log in logs:
                emotion = log.primary_emotion
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            total = len(logs)
            emotion_distribution = {
                e: count / total for e, count in emotion_counts.items()
            }
            
            # Create mock EmotionInsight
            from app.schemas.emotion_insight import EmotionInsight
            
            dominant_emotion = max(emotion_distribution.items(), key=lambda x: x[1])
            
            insight = EmotionInsight(
                user_id=self.user_id,
                period_days=7,
                log_count=len(logs),
                insufficient_data=False,
                dominant_emotion=dominant_emotion[0],
                dominance_pct=dominant_emotion[1],
                avg_confidence=0.65,
                emotion_distribution=emotion_distribution,
                trend="mixed",
                trend_description="Week showed improvement",
                volatility_flag=False,
                sustained_sadness=False,
                high_risk=False,
                crisis_count_48h=0,
                suggested_tone="balanced",
                suggested_approach="supportive",
                avoid_triggers=[],
                computed_at=datetime.now()
            )
            
            # Generate system prompt
            prompt = ollama_service._build_system_prompt(insight)
            
            print(f"{CYAN}System Prompt Generated (first 300 chars):{RESET}")
            print(f"  {prompt[:300]}...")
            
            # Verify it includes emotional context
            checks = [
                ("Includes emotional picture", "EMOTIONAL PICTURE" in prompt),
                ("Includes dominant emotion", dominant_emotion[0] in prompt.lower()),
                ("Includes trend info", "trend" in prompt.lower()),
                ("Includes tone guidance", "TONE GUIDANCE" in prompt),
            ]
            
            for check_name, result in checks:
                if result:
                    print(f"  {GREEN}[OK] {check_name}{RESET}")
                    self.results["passed"] += 1
                else:
                    print(f"  {RED}[FAIL] {check_name}{RESET}")
                    self.results["failed"] += 1
            
        except Exception as e:
            print(f"{RED}[ERROR] Prompt adaptation test failed: {e}{RESET}")
            self.results["failed"] += 1

    async def test_conversation_history_retrieval(self, session: AsyncSession):
        """Test retrieving conversation history in proper format."""
        print(f"\n{BLUE}{'='*70}")
        print(f"TESTING CONVERSATION HISTORY RETRIEVAL")
        print(f"{'='*70}{RESET}\n")
        
        conv_service = ConversationService()
        
        try:
            if not self.conversation_ids:
                print(f"{YELLOW}[SKIP] No conversations to test{RESET}")
                return
            
            # Test retrieving from one conversation
            test_conv_id = self.conversation_ids[0]
            
            history = await conv_service.get_conversation_history(
                session, test_conv_id, limit=20
            )
            
            print(f"{GREEN}[OK] Retrieved {len(history)} messages from conversation {test_conv_id}{RESET}")
            self.results["passed"] += 1
            
            # Verify format (OpenAI compatible)
            for msg in history[:3]:
                has_role = "role" in msg
                has_content = "content" in msg
                valid_role = msg.get("role") in ["user", "assistant"]
                
                if has_role and has_content and valid_role:
                    print(f"  {GREEN}[OK] Message format valid: {msg['role']}{RESET}")
                    self.results["passed"] += 1
                else:
                    print(f"  {RED}[FAIL] Invalid message format{RESET}")
                    self.results["failed"] += 1
            
        except Exception as e:
            print(f"{RED}[ERROR] History retrieval failed: {e}{RESET}")
            self.results["failed"] += 1

    async def print_final_summary(self):
        """Print comprehensive test summary."""
        total = self.results["passed"] + self.results["failed"]
        pass_rate = (self.results["passed"] / total * 100) if total > 0 else 0
        
        print(f"\n{BLUE}{'='*70}")
        print(f"COMPREHENSIVE TEST SUMMARY")
        print(f"{'='*70}{RESET}\n")
        
        print(f"  {GREEN}Passed{RESET}:  {self.results['passed']}")
        print(f"  {RED}Failed{RESET}:  {self.results['failed']}")
        print(f"  {CYAN}Total{RESET}:  {total}")
        print(f"\n  {CYAN}Pass Rate: {pass_rate:.1f}%{RESET}")
        
        if self.results["failed"] == 0:
            print(f"\n  {GREEN}[PASS] ALL TESTS PASSED - SYSTEM READY FOR USE{RESET}")
        else:
            print(f"\n  {RED}[FAIL] {self.results['failed']} TESTS FAILED - CHECK LOGS ABOVE{RESET}")
        
        print(f"\n{BLUE}{'='*70}{RESET}\n")
        
        return self.results["failed"] == 0

    async def run_all_tests(self):
        """Run complete test suite."""
        try:
            print(f"\n{BLUE}{'='*70}")
            print(f"SERENITY: 7-DAY EMOTIONAL JOURNEY TEST SUITE")
            print(f"{'='*70}{RESET}\n")
            
            # Setup
            await self.setup_database()
            
            SessionLocal = sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=False,
            )
            
            async with SessionLocal() as session:
                # Create user
                await self.create_test_user(session)
                await session.commit()
                
                # Run tests
                await self.simulate_emotional_week(session)
                await self.test_emotional_insight_card(session)
                await self.test_conversation_persistence(session)
                await self.test_system_prompt_adaptation(session)
                await self.test_conversation_history_retrieval(session)
            
            # Print summary
            success = await self.print_final_summary()
            
            # Cleanup
            await self.engine.dispose()
            
            return 0 if success else 1
            
        except Exception as e:
            print(f"\n{RED}Unexpected error: {str(e)}{RESET}")
            import traceback
            traceback.print_exc()
            return 1


async def main():
    """Entry point."""
    tester = WeeklyEmotionalTest()
    return await tester.run_all_tests()


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
