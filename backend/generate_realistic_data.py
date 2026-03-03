#!/usr/bin/env python
"""Generate 7 days of realistic emotion data through actual chat conversations"""

import asyncio
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.emotion_log import EmotionLog
import hashlib
import secrets
import json

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Test user
TEST_USER = {
    "name": "Demo User",
    "username": "demo_user",
    "email": "demo@serenity.app",
    "password": "Demo@123456"
}

# 7 days of conversation scenarios
DAILY_CONVERSATIONS = [
    {
        "day": "Monday",
        "offset": 6,
        "messages": [
            ("user", "I had a really productive day at work today! Feel amazing.", "joy"),
            ("ai", "That's wonderful! Tell me more about what made today productive?"),
            ("user", "Got a big project done and my team appreciated it.", "joy"),
            ("ai", "That's excellent! How are you feeling right now?"),
            ("user", "Just relaxing now, feeling neutral and content", "neutral"),
        ]
    },
    {
        "day": "Tuesday",
        "offset": 5,
        "messages": [
            ("user", "Started my day feeling a bit sad, hard to get out of bed", "sadness"),
            ("ai", "I hear you. What's on your mind?"),
            ("user", "Just some personal stuff. But I went for a run and feel better now", "neutral"),
            ("ai", "Exercise is great for mood. That was really proactive!"),
            ("user", "My friends came over tonight and we had so much fun!", "joy"),
        ]
    },
    {
        "day": "Wednesday",
        "offset": 4,
        "messages": [
            ("user", "I'm really angry right now. Had a huge argument with my colleague.", "anger"),
            ("ai", "That sounds frustrating. What happened?"),
            ("user", "We had a disagreement about a project. But I calmed down now after lunch.", "neutral"),
            ("ai", "Good that you took time to cool off."),
            ("user", "Feeling focused on work again. Going to do better tomorrow.", "neutral"),
        ]
    },
    {
        "day": "Thursday",
        "offset": 3,
        "messages": [
            ("user", "I'm anxious. Have a big presentation today!", "fear"),
            ("ai", "That's natural! How are you preparing?"),
            ("user", "I've prepared really thoroughly. Just nervous about speaking.", "fear"),
            ("ai", "You've got this! Remember to take deep breaths."),
            ("user", "Presentation went AMAZING! I'm so happy right now!", "joy"),
        ]
    },
    {
        "day": "Friday",
        "offset": 2,
        "messages": [
            ("user", "Still high from yesterday's success! Feeling great!", "joy"),
            ("ai", "That's fantastic! You must be proud of yourself."),
            ("user", "Very much! And it's Friday - weekend is here!", "joy"),
            ("ai", "What are your plans for the weekend?"),
            ("user", "Got some unexpected good news too! Can't believe today!", "surprise"),
        ]
    },
    {
        "day": "Saturday",
        "offset": 1,
        "messages": [
            ("user", "Had a nice breakfast with family this morning. Feeling great!", "joy"),
            ("ai", "Family time is special. How was it?"),
            ("user", "Really good. Now doing some chores, feeling neutral.", "neutral"),
            ("ai", "Still good to stay productive on weekends."),
            ("user", "Movie night tonight with family. Feeling happy!", "joy"),
        ]
    },
    {
        "day": "Sunday",
        "offset": 0,
        "messages": [
            ("user", "Lazy morning, just reading and relaxing. Feeling calm.", "neutral"),
            ("ai", "Relaxation is important for your mental health."),
            ("user", "Planning my week ahead. Excited about new goals!", "joy"),
            ("ai", "That's a positive way to start the week!"),
            ("user", "Just finished a meditation session. Feeling very calm now.", "calm"),
        ]
    },
]

async def setup_with_conversations():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if user exists
        stmt = select(User).where(User.email == TEST_USER["email"])
        result = await session.execute(stmt)
        existing_user = result.scalars().first()
        
        if existing_user:
            print(f"⚠️  User {TEST_USER['email']} already exists (ID: {existing_user.id})")
            user = existing_user
        else:
            # Create user with password hash
            pwd = TEST_USER["password"].encode()
            salt = secrets.token_hex(16)
            hashed = hashlib.pbkdf2_hmac('sha256', pwd, salt.encode(), 100000).hex()
            password_hash = f"{salt}${hashed}"
            
            user = User(
                name=TEST_USER["name"],
                username=TEST_USER["username"],
                email=TEST_USER["email"],
                hashed_password=password_hash,
                is_active=True
            )
            session.add(user)
            await session.flush()
            print(f"✓ Created new user: {TEST_USER['email']} (ID: {user.id})")
        
        print()
        print("=" * 70)
        print("SIMULATING 7 DAYS OF CONVERSATIONS")
        print("=" * 70)
        print()
        
        total_logs = 0
        
        for day_data in DAILY_CONVERSATIONS:
            day_name = day_data["day"]
            day_offset = day_data["offset"]
            messages = day_data["messages"]
            
            # Calculate date
            base_date = datetime.utcnow() - timedelta(days=day_offset)
            
            print(f"📅 {day_name} ({base_date.date()})")
            
            # Create conversation for this day
            conversation = Conversation(
                user_id=user.id,
                title=f"Daily Check-in - {day_name}",
                created_at=base_date
            )
            session.add(conversation)
            await session.flush()
            
            # Send messages throughout the day
            hours_per_message = 24 // len(messages)
            
            for idx, (sender, text, emotion) in enumerate(messages):
                msg_time = base_date + timedelta(hours=idx * hours_per_message + (idx % 2))
                
                # Create message
                message = Message(
                    conversation_id=conversation.id,
                    user_id=user.id if sender == "user" else None,
                    content=text,
                    role="user" if sender == "user" else "assistant",
                    created_at=msg_time
                )
                session.add(message)
                await session.flush()
                
                # Create emotion log for user messages
                if sender == "user":
                    emotion_log = EmotionLog(
                        user_id=user.id,
                        conversation_id=conversation.id,
                        message_id=message.id,
                        primary_emotion=emotion,
                        confidence=round(0.65 + (idx * 0.05), 2),  # Vary confidence
                        created_at=msg_time
                    )
                    session.add(emotion_log)
                    total_logs += 1
                    
                    print(f"  {sender:6} | {emotion:10} | \"{text[:50]}...\"" if len(text) > 50 else f"  {sender:6} | {emotion:10} | \"{text}\"")
                else:
                    print(f"  {sender:6} |  (ai)      | \"{text[:50]}...\"" if len(text) > 50 else f"  {sender:6} |  (ai)      | \"{text}\"")
            
            print()
            await asyncio.sleep(0.1)  # Small delay between days
        
        # Commit everything
        await session.commit()
        
        print("=" * 70)
        print(f"✓ Created {total_logs} emotion logs through {len(DAILY_CONVERSATIONS)} days of conversations")
        print("=" * 70)
        print()
        
        # Get summary
        stmt = select(EmotionLog).where(EmotionLog.user_id == user.id)
        result = await session.execute(stmt)
        logs = result.scalars().all()
        
        from collections import Counter
        emotions = [log.primary_emotion for log in logs]
        counts = Counter(emotions)
        
        print("📊 EMOTION SUMMARY:")
        print("-" * 70)
        for emotion, count in sorted(counts.items(), key=lambda x: -x[1]):
            pct = (count / len(logs)) * 100
            print(f"  {emotion:12} {count:2} logs ({pct:5.1f}%)")
        print("-" * 70)
        print()
        print("✅ Setup complete!")
        print()
        print("📋 TEST USER CREDENTIALS:")
        print("-" * 70)
        print(f"  Email:    {TEST_USER['email']}")
        print(f"  Password: {TEST_USER['password']}")
        print(f"  User ID:  {user.id}")
        print("-" * 70)
        print()
        print("Next steps:")
        print("  1. Refresh frontend (F5)")
        print("  2. Login with the credentials above")
        print("  3. Go to /insights")
        print("  4. See dashboard with real 7-day conversation data!")

if __name__ == "__main__":
    asyncio.run(setup_with_conversations())
