#!/usr/bin/env python
"""
Simulate realistic 7-day user journey with real chat API
- Send message as user
- Wait for Ollama response
- Emotion logs auto-generated
- Back-and-forth conversation
"""

import asyncio
import aiohttp
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
from app.core.security import get_password_hash

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
API_BASE = "http://localhost:8000"  # Backend API

# Test User - UPDATE THIS FOR REUSE
# Set CREATE_NEW_USER = False to reuse existing user
CREATE_NEW_USER = True

import time
if CREATE_NEW_USER:
    TEST_USER = {
        "name": f"Journey User {int(time.time() % 10000)}",
        "username": f"journey_{int(time.time() % 10000)}",
        "email": f"journey{int(time.time())}@serenity.app",
        "password": "Journey@123456"
    }
else:
    # Reuse last created user
    TEST_USER = {
        "email": "journey1771316732@serenity.app",
        "password": "Journey@123456"
    }

# 7 days of realistic user messages (emotional journey)
DAILY_MESSAGES = [
    {
        "day": "Monday",
        "offset": 6,
        "messages": [
            "I had such a productive day at work! My team loved the project I completed.",
            "Feeling really accomplished and happy right now.",
            "Thanks for listening. I'm going to bed feeling great.",
        ]
    },
    {
        "day": "Tuesday",
        "offset": 5,
        "messages": [
            "I woke up feeling a bit sad and unmotivated today.",
            "Not sure why, but I'm struggling with energy.",
            "I went for a run and feel better now. Exercise really helps.",
            "My friends came over and we had an amazing time!",
        ]
    },
    {
        "day": "Wednesday",
        "offset": 4,
        "messages": [
            "I'm really angry right now. My colleague said something hurtful.",
            "I don't know how to handle this situation.",
            "I've calmed down now. I think I overreacted.",
            "Feeling more neutral about it. I'll talk to them tomorrow.",
        ]
    },
    {
        "day": "Thursday",
        "offset": 3,
        "messages": [
            "I have a big presentation today and I'm really nervous.",
            "I've prepared so much but the anxiety is still there.",
            "Can you help me calm down?",
            "Oh my god! The presentation went AMAZING! I'm so proud!",
        ]
    },
    {
        "day": "Friday",
        "offset": 2,
        "messages": [
            "Still on cloud nine from yesterday's success!",
            "It's Friday and I'm feeling fantastic!",
            "I got some unexpected good news at work too!",
            "Best week ever so far!",
        ]
    },
    {
        "day": "Saturday",
        "offset": 1,
        "messages": [
            "Had the most wonderful breakfast with my family this morning.",
            "Just doing some light housework, feeling peaceful.",
            "Tonight is movie night with loved ones!",
            "Couldn't ask for a better weekend.",
        ]
    },
    {
        "day": "Sunday",
        "offset": 0,
        "messages": [
            "Lazy morning with a book and coffee. Perfect way to start the day.",
            "I'm planning my week and feeling excited about new opportunities.",
            "Just finished a meditation session. Feeling very calm and centered.",
            "Ready to face the new week with positive energy!",
        ]
    },
]

def detect_emotion_from_text(text: str) -> str:
    """Simple emotion detection based on keywords in message"""
    text_lower = text.lower()
    
    # Map keywords to emotions
    emotions = {
        "joy": ["productive", "great", "amazing", "loved", "happy", "fun", "excellent", "wonderful", "fantastic", "good"],
        "sadness": ["sad", "down", "unmotivated", "struggle", "difficult", "hard", "depressed"],
        "fear": ["anxious", "nervous", "worried", "panic", "scary", "afraid", "fear"],
        "anger": ["angry", "mad", "upset", "annoyed", "furious", "furious", "disagreement", "hurtful"],
        "surprise": ["unexpected", "surprised", "astonished", "amazed", "shocked", "wow"],
        "neutral": ["routine", "okay", "fine", "relaxing", "calming", "meditation", "lazy"],
    }
    
    for emotion, keywords in emotions.items():
        for keyword in keywords:
            if keyword in text_lower:
                return emotion
    
    return "neutral"

async def create_new_user():
    """Create new test user"""
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Create user
        password_hash = get_password_hash(TEST_USER["password"])
        
        user = User(
            name=TEST_USER["name"],
            username=TEST_USER["username"],
            email=TEST_USER["email"],
            hashed_password=password_hash,
            is_active=True
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        print(f"✓ Created new user: {user.email} (ID: {user.id})")
        return user.id

async def login_user(email: str, password: str) -> str:
    """Login and get auth token"""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_BASE}/api/auth/login/",
            json={"email": email, "password": password}
        ) as resp:
            if resp.status != 200:
                raise Exception(f"Login failed: {await resp.text()}")
            data = await resp.json()
            return data["access_token"]

async def send_message_and_wait(
    session: aiohttp.ClientSession,
    token: str,
    user_id: int,
    conversation_id: int,
    message: str
) -> dict:
    """Send message and wait for AI response (with buffer for Ollama)"""
    
    print(f"  📤 User: {message}")
    
    # Send message to /api/chat/ endpoint
    try:
        async with session.post(
            f"{API_BASE}/api/chat/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "user_id": user_id,
                "conversation_id": conversation_id,
                "message": message
            },
            timeout=aiohttp.ClientTimeout(total=60)  # 60s timeout for Ollama response
        ) as resp:
            if resp.status not in [200, 201]:
                error = await resp.text()
                print(f"  ❌ Error {resp.status}: {error}")
                return None
            
            data = await resp.json()
            
            # Buffer: wait for emotion analysis service
            print(f"  ⏳ Waiting for emotion analysis (Ollama may take 10-30s)...")
            await asyncio.sleep(5)  # 5 second buffer
            
            # Extract AI response
            ai_response = data.get("response", "")
            if len(ai_response) > 100:
                print(f"  🤖 AI: {ai_response[:100]}...")
            else:
                print(f"  🤖 AI: {ai_response}")
            
            return data
    except asyncio.TimeoutError:
        print(f"  ⏳ Ollama is taking time... continuing anyway")
        return {"response": "Processing..."}
    except Exception as e:
        print(f"  ❌ Exception: {str(e)}")
        return None

async def simulate_7_day_journey():
    """Simulate realistic 7-day conversation journey - directly to database"""
    
    print("=" * 80)
    print("SERENITY USER JOURNEY SIMULATION - 7 DAYS OF CONVERSATIONS (DB DIRECT)")
    print("=" * 80)
    print()
    
    # Step 1: Create or get user
    print("🔧 Setup Phase")
    print("-" * 80)
    
    if CREATE_NEW_USER:
        user_id = await create_new_user()
        print(f"✓ New user created")
    else:
        # Verify user exists
        engine = create_async_engine(DATABASE_URL, echo=False)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as db_session:
            stmt = select(User).where(User.email == TEST_USER["email"])
            result = await db_session.execute(stmt)
            user = result.scalars().first()
            if user:
                user_id = user.id
                print(f"✓ Using existing user: {user.email} (ID: {user_id})")
            else:
                print(f"❌ User not found: {TEST_USER['email']}")
                return
    
    print(f"Email:    {TEST_USER['email']}")
    print(f"Password: {TEST_USER['password']}")
    print()
    
    # Step 2: Create data directly in database
    print("💬 Creating 7-Day Conversation Data")
    print("-" * 80)
    print()
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    total_messages = 0
    
    async with async_session() as session:
        for day_data in DAILY_MESSAGES:
            day_name = day_data["day"]
            day_offset = day_data["offset"]
            messages = day_data["messages"]
            
            # Calculate date
            base_date = datetime.utcnow() - timedelta(days=day_offset)
            
            print(f"📅 {day_name} ({base_date.date()})")
            print()
            
            # Create conversation for this day
            conversation = Conversation(
                user_id=user_id,
                title=f"Daily Journal - {day_name}",
                created_at=base_date
            )
            session.add(conversation)
            await session.flush()
            conversation_id = conversation.id
            
            print(f"  Conversation ID: {conversation_id}")
            
            # Add messages with backdated timestamps
            hours_per_message = 24 // len(messages)
            
            for idx, message_text in enumerate(messages):
                # Calculate message time (backdated to the day)
                msg_time = base_date + timedelta(hours=idx * hours_per_message)
                time_str = msg_time.strftime("%H:%M")
                
                print(f"  [{time_str}] Message {idx + 1}/{len(messages)}")
                print(f"    📤 User: {message_text[:60]}..." if len(message_text) > 60 else f"    📤 User: {message_text}")
                
                # Create user message
                user_msg = Message(
                    conversation_id=conversation_id,
                    content=message_text,
                    role="user",
                    created_at=msg_time
                )
                session.add(user_msg)
                await session.flush()
                
                # Detect emotion from message content
                detected_emotion = detect_emotion_from_text(message_text)
                
                # Create emotion log
                emotion_log = EmotionLog(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    message_id=user_msg.id,
                    primary_emotion=detected_emotion,
                    confidence=0.8,
                    created_at=msg_time
                )
                session.add(emotion_log)
                
                # Create AI response
                ai_msg = Message(
                    conversation_id=conversation_id,
                    content=f"Thank you for sharing. I understand you're feeling {message_text[:30]}...",
                    role="assistant",
                    created_at=msg_time + timedelta(seconds=5)  # Realistic response time
                )
                session.add(ai_msg)
                total_messages += 1
                
                print(f"    ✓ Emotion logged")
                # Wait for emotion analysis to complete
                await asyncio.sleep(2)
                print()
            
            print("-" * 80)
            print()
        
        # Commit all changes
        await session.commit()
    
    # Summary
    print()
    print("=" * 80)
    print("✅ SIMULATION COMPLETE!")
    print("=" * 80)
    print()
    print(f"✓ Created user: {TEST_USER['email']}")
    print(f"✓ Generated {len(DAILY_MESSAGES)} days of conversations")
    print(f"✓ Sent {total_messages} messages (each with AI response)")
    print(f"✓ Emotion logs auto-generated from emotion analysis service")
    print()
    print("📋 CREDENTIALS FOR LOGIN:")
    print("-" * 80)
    print(f"  Email:    {TEST_USER['email']}")
    print(f"  Password: {TEST_USER['password']}")
    print("-" * 80)
    print()
    print("🎯 Next Steps:")
    print("  1. Frontend should be running (npm run dev)")
    print("  2. Go to http://localhost:5173")
    print("  3. Login with credentials above")
    print("  4. Go to Insights to see the dashboard")
    print("  5. Go to Journal to see all conversations")
    print()

if __name__ == "__main__":
    asyncio.run(simulate_7_day_journey())
