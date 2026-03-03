#!/usr/bin/env python
"""Create a new test user and simulate real conversation flow with emotion logs"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.models.emotion_log import EmotionLog
from sqlalchemy import select
import random
import os
from dotenv import load_dotenv
import hashlib
import secrets

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost/serenity")

# Test user credentials
TEST_USER = {
    "username": "demo_user",
    "email": "demo@serenity.app",
    "password": "Demo@123456"  # User can change this
}

async def setup_test_user_with_data():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if user already exists
        stmt = select(User).where(User.email == TEST_USER["email"])
        result = await session.execute(stmt)
        existing_user = result.scalars().first()
        
        if existing_user:
            print(f"⚠️  User {TEST_USER['email']} already exists (ID: {existing_user.id})")
            user = existing_user
        else:
            # Create new user - use simple hash for testing
            pwd = TEST_USER["password"].encode()
            salt = secrets.token_hex(16)
            hashed = hashlib.pbkdf2_hmac('sha256', pwd, salt.encode(), 100000).hex()
            password_hash = f"{salt}${hashed}"
            
            user = User(
                name=TEST_USER["username"],
                username=TEST_USER["username"],
                email=TEST_USER["email"],
                hashed_password=password_hash,
                is_active=True
            )
            session.add(user)
            await session.flush()  # Get the ID without committing yet
            print(f"✓ Created new user: {TEST_USER['email']} (ID: {user.id})")
        
        print()
        print("=" * 60)
        print("SIMULATING 7-DAY CONVERSATION FLOW")
        print("=" * 60)
        print()
        
        # Conversation scenarios for 7 days
        scenarios = [
            {
                "day_offset": 6,
                "date_label": "Monday",
                "emotions": [
                    ("joy", 0.85, "Had a good day at work, felt productive"),
                    ("neutral", 0.70, "Routine evening, just relaxing"),
                ],
            },
            {
                "day_offset": 5,
                "date_label": "Tuesday",
                "emotions": [
                    ("sadness", 0.72, "Felt a bit down in the morning"),
                    ("neutral", 0.75, "Got better after exercise"),
                    ("joy", 0.80, "Friends came over, had fun"),
                ],
            },
            {
                "day_offset": 4,
                "date_label": "Wednesday",
                "emotions": [
                    ("anger", 0.78, "Had a disagreement with colleague"),
                    ("neutral", 0.70, "Calmed down after lunch"),
                    ("neutral", 0.72, "Focused on work again"),
                ],
            },
            {
                "day_offset": 3,
                "date_label": "Thursday",
                "emotions": [
                    ("fear", 0.68, "Anxious about upcoming presentation"),
                    ("neutral", 0.75, "Prepared thoroughly"),
                    ("joy", 0.87, "Presentation went great!"),
                ],
            },
            {
                "day_offset": 2,
                "date_label": "Friday",
                "emotions": [
                    ("joy", 0.88, "Feeling great after successful presentation"),
                    ("joy", 0.85, "Weekend is here"),
                    ("surprise", 0.75, "Got unexpected good news"),
                ],
            },
            {
                "day_offset": 1,
                "date_label": "Saturday",
                "emotions": [
                    ("joy", 0.83, "Had a nice breakfast with family"),
                    ("neutral", 0.70, "Afternoon chores"),
                    ("joy", 0.80, "Evening movie night"),
                ],
            },
            {
                "day_offset": 0,
                "date_label": "Sunday (Today)",
                "emotions": [
                    ("neutral", 0.72, "Lazy morning, reading"),
                    ("joy", 0.82, "Planned next week's goals"),
                    ("calm", 0.80, "Meditation session in evening"),
                ],
            },
        ]
        
        # Create emotions and conversations
        total_logs = 0
        
        for scenario in scenarios:
            base_date = datetime.utcnow() - timedelta(days=scenario["day_offset"])
            
            # Spread emotions throughout the day
            hours_per_emotion = 24 // len(scenario["emotions"])
            
            print(f"📅 {scenario['date_label']} ({base_date.date()})")
            
            for idx, (emotion, confidence, note) in enumerate(scenario["emotions"]):
                log_time = base_date + timedelta(hours=idx * hours_per_emotion + random.randint(0, 2))
                
                # Create emotion log
                emotion_log = EmotionLog(
                    user_id=user.id,
                    conversation_id=None,  # Can be null for standalone emotion logs
                    primary_emotion=emotion,
                    confidence=confidence,
                    created_at=log_time
                )
                session.add(emotion_log)
                
                print(f"   • {emotion:10} (conf: {confidence:.2f}) - \"{note}\"")
                total_logs += 1
                
                # Add slight delay between logs
                await asyncio.sleep(0.01)
            
            print()
        
        # Commit all emotion logs
        await session.commit()
        
        print("=" * 60)
        print(f"✓ Created {total_logs} emotion logs across 7 days")
        print("=" * 60)
        print()
        
        # Display test user credentials
        print("📋 TEST USER CREDENTIALS:")
        print("-" * 60)
        print(f"Email:    {TEST_USER['email']}")
        print(f"Password: {TEST_USER['password']}")
        print(f"User ID:  {user.id}")
        print("-" * 60)
        print()
        
        # Get summary
        stmt = select(EmotionLog).where(EmotionLog.user_id == user.id)
        result = await session.execute(stmt)
        logs = result.scalars().all()
        
        from collections import Counter
        emotions = [log.primary_emotion for log in logs]
        counts = Counter(emotions)
        
        print("📊 EMOTION SUMMARY:")
        print("-" * 60)
        for emotion, count in sorted(counts.items(), key=lambda x: -x[1]):
            pct = (count / len(logs)) * 100
            print(f"{emotion:12} {count:2} logs ({pct:5.1f}%)")
        print("-" * 60)
        print()
        print("✓ Setup complete! You can now:")
        print(f"  1. Login with: {TEST_USER['email']} / {TEST_USER['password']}")
        print("  2. Go to /insights to see the dashboard")
        print("  3. Go to / (home) to see past emotion logs")

if __name__ == "__main__":
    asyncio.run(setup_test_user_with_data())
