#!/usr/bin/env python3
"""
SERENITY WEEK TEST - PostgreSQL VERSION
Tests using PostgreSQL database (viewable in pgAdmin)

IMPORTANT: Requires PostgreSQL running and DATABASE_URL configured

To use this test:

1. Make sure PostgreSQL is running (docker-compose up postgres pgadmin)

2. Update .env with:
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/serenity

3. Run this test:
   python test_postgresql_week.py

4. View data in pgAdmin at:
   http://localhost:5050
   Login: admin@admin.com / admin

5. In pgAdmin:
   - Right-click Servers → Register → Server
   - Name: LocalPostgres
   - Hostname: localhost
   - Port: 5432
   - Username: postgres
   - Password: postgres
   - Save
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
from app.core.config import settings

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

class PostgreSQLWeekTest:
    def __init__(self):
        self.passes = 0
        self.failures = 0
        self.user_id = None
        self.test_user_email = "serenity_test_user@example.com"
        self.test_user_password = "TestPassword123!"  # SAVE THIS

    def log(self, msg, level="INFO"):
        prefix = {
            "INFO": "[INFO]",
            "PASS": "[PASS]",
            "FAIL": "[FAIL]",
            "TEST": "[TEST]",
        }.get(level, "[LOG]")
        print(f"  {prefix} {msg}")

    def assert_true(self, condition, test_name):
        if condition:
            self.log(f"{test_name}: OK", "PASS")
            self.passes += 1
            return True
        else:
            self.log(f"{test_name}: FAILED", "FAIL")
            self.failures += 1
            return False

    async def run(self):
        print("\n" + "="*70)
        print("SERENITY: POSTGRESQL WEEK-LONG EMOTIONAL JOURNEY TEST")
        print("="*70 + "\n")

        # Check DATABASE_URL
        db_url = settings.database_url
        if not db_url:
            print("[ERROR] DATABASE_URL not set in .env")
            print("\nTo use PostgreSQL, set in .env:")
            print("  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/serenity")
            return 1
        
        if "sqlite" in db_url.lower():
            print("[WARNING] Using SQLite instead of PostgreSQL")
            print("To use PostgreSQL, update .env with:")
            print("  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/serenity")
        else:
            print(f"[OK] Using PostgreSQL: {db_url.split('@')[1] if '@' in db_url else 'localhost'}")

        print("\n[SETUP] Initializing database...\n")
        
        try:
            engine = create_async_engine(
                db_url,
                echo=False,
                future=True
            )
        except Exception as e:
            print(f"[ERROR] Failed to connect to database: {e}")
            print("\nMake sure PostgreSQL is running:")
            print("  docker-compose up postgres pgadmin")
            return 1

        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("[OK] Database tables ready\n")
        except Exception as e:
            print(f"[ERROR] Failed to create tables: {e}")
            return 1

        SessionLocal = sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False
        )

        try:
            async with SessionLocal() as session:
                # Create test user with password
                await self._create_test_user(session)
                await session.commit()
                
                # Run tests
                await self._test_week_simulation(SessionLocal)
                
        finally:
            await engine.dispose()

        # Print results
        print("\n" + "="*70)
        print(f"RESULTS: {self.passes} PASSED, {self.failures} FAILED")
        print("="*70 + "\n")

        print("[IMPORTANT] TEST USER CREDENTIALS:")
        print("="*70)
        print(f"  Email:    {self.test_user_email}")
        print(f"  Password: {self.test_user_password}")
        print("="*70 + "\n")

        print("[IMPORTANT] PGADMIN CREDENTIALS:")
        print("="*70)
        print(f"  URL:      http://localhost:5050")
        print(f"  Email:    admin@admin.com")
        print(f"  Password: admin")
        print("="*70 + "\n")

        print("[NEXT STEPS]:")
        print("  1. Open http://localhost:5050 in browser")
        print("  2. Login with admin@admin.com / admin")
        print("  3. Register PostgreSQL server:")
        print("     - Name: LocalPostgres")
        print("     - Host: localhost")
        print("     - Port: 5432")
        print("     - Username: postgres")
        print("     - Password: postgres")
        print("  4. Browse to: serenity database → public → tables")
        print("  5. View users, conversations, messages, emotion_logs tables")
        print("\n")

        return 0 if self.failures == 0 else 1

    async def _create_test_user(self, session):
        """Create test user with proper password hashing."""
        print("[TEST 1] Creating test user...\n")
        
        # Always create a new user with timestamp to avoid conflicts
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        username = f"serenity_user_{timestamp}"
        
        # Create new user with proper password hashing (Argon2)
        from app.core.security import get_password_hash
        hashed_password = get_password_hash(self.test_user_password)
        
        new_user = User(
            username=username,
            email=self.test_user_email,
            hashed_password=hashed_password,
            name="Serenity Test User"
        )
        session.add(new_user)
        await session.flush()
        self.user_id = new_user.id
        
        self.log(f"Created new user (ID: {new_user.id}, Email: {self.test_user_email})", "PASS")
        self.log(f"Can login with: {self.test_user_email} / {self.test_user_password}", "INFO")

    async def _test_week_simulation(self, SessionLocal):
        """Simulate week of messages."""
        print("\n[TEST 2] Simulating 7-day emotional journey (21 messages)...\n")
        
        conv_service = ConversationService()
        emotion_service = EmotionService()
        
        base_date = datetime.now() - timedelta(days=7)
        total_messages = 0
        total_emotions = 0
        
        async with SessionLocal() as session:
            for day_idx, (day_name, messages) in enumerate(WEEK_DATA):
                current_date = base_date + timedelta(days=day_idx)
                
                conv_id = await conv_service.create_conversation(
                    session, self.user_id, title=f"{day_name} Check-in"
                )
                await session.flush()
                
                print(f"  {day_name:10} - Creating conversation (ID: {conv_id})")
                
                for msg_idx, msg_text in enumerate(messages):
                    msg_id = await conv_service.save_message(
                        session, conv_id, "user", msg_text
                    )
                    await session.flush()
                    total_messages += 1
                    
                    emotion_result = await emotion_service.detect_emotion(msg_text)
                    emotion_label = emotion_result.get("label", "unknown")
                    confidence = emotion_result.get("confidence", 0.5)
                    
                    emotion_log = EmotionLog(
                        user_id=self.user_id,
                        conversation_id=conv_id,
                        message_id=msg_id,
                        primary_emotion=emotion_label,
                        confidence=confidence,
                        intensity=confidence
                    )
                    session.add(emotion_log)
                    total_emotions += 1
                    await session.flush()
                    
                    print(f"    [{msg_idx+1}] {emotion_label:10} ({confidence:.0%})")
            
            await session.commit()
        
        self.assert_true(total_messages == 21, f"All 21 messages saved")
        self.assert_true(total_emotions == 21, f"All 21 emotions logged")

async def main():
    tester = PostgreSQLWeekTest()
    return await tester.run()

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
