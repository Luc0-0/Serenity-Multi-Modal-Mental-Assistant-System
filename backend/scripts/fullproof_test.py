#!/usr/bin/env python3
"""
Full-proof persona-based integration test.
Creates a realistic user with 2-week backdated conversations.
Tests complete memory architecture with LLM responses.
"""

import argparse
import asyncio
import sys
from datetime import datetime, timedelta
from typing import List, Dict

import httpx
from argon2 import PasswordHasher
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.append(str((__file__).rsplit("\\scripts", 1)[0]))

from app.core.config import settings
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.models.emotion_log import EmotionLog
from app.models.journal_entry import JournalEntry
from app.models.memory import (
    SemanticMemory,
    EmotionalProfile,
    MetaReflection,
    ConversationContextCache,
)


# ===== REALISTIC PERSONA: Engineering Student with Placement Anxiety =====
PERSONA = {
    "name": "Aditya Sharma",
    "email": "aditya.sharma@techmail.com",
    "password": "AdiTest@2024",  # Use this to login
    "background": "Final year engineering student, B.Tech CS, tier-3 college",
    "anxiety": "Placement pressure, rejection anxiety, comparison with peers",
}

# 2-week conversation script (backdated)
CONVERSATION_SCRIPT = {
    "Day 1": {
        "title": "First panic about placements",
        "turns": [
            {
                "user": "I got rejected by Google yesterday without even a coding round. Being from a tier-3 college, I feel like I'm already doomed before I even start. Everyone from tier-1 colleges gets picked first.",
                "emotion": "sadness",
                "wait": 2,  # Wait 2 seconds for LLM response
            },
            {
                "user": "Yeah, I have been wondering if my college name is the main barrier. My projects are good but the rejection letter felt so impersonal.",
                "emotion": "sadness",
                "wait": 2,
            },
            {
                "user": "I've been thinking about it all night and couldn't sleep. What if I don't get any offer? The education loan starts repaying soon.",
                "emotion": "fear",
                "wait": 2,
            },
        ],
    },
    "Day 2": {
        "title": "Anxiety about upcoming interviews",
        "turns": [
            {
                "user": "I have 3 interviews lined up next week. My friend Arjun from IIT got 5 offers already. How is that even fair?",
                "emotion": "anxiety",
                "wait": 2,
            },
            {
                "user": "I did some mock interviews with my friend but I keep freezing on basic questions. My mind just blanks out.",
                "emotion": "fear",
                "wait": 2,
            },
            {
                "user": "I'm trying to revise DSA but everything feels so hard right now. I don't know if hard work even matters anymore.",
                "emotion": "hopeless",
                "wait": 2,
            },
        ],
    },
    "Day 3": {
        "title": "Small win - got through first round",
        "turns": [
            {
                "user": "I cleared the first round of one company! I'm shocked because I thought I bombed the coding question.",
                "emotion": "joy",
                "wait": 2,
            },
            {
                "user": "Maybe my college name isn't the only thing that matters. I did answer the behavioral questions better this time.",
                "emotion": "neutral",
                "wait": 2,
            },
            {
                "user": "Now I have to prepare for the second round. But I'm feeling a bit better about my chances.",
                "emotion": "cautious_hope",
                "wait": 2,
            },
        ],
    },
    "Day 4": {
        "title": "Family pressure kicks in",
        "turns": [
            {
                "user": "My dad asked again today why I don't have an offer yet. He reminds me every day. I know he cares but it feels like pressure.",
                "emotion": "anger",
                "wait": 2,
            },
            {
                "user": "Mom is okay but dad keeps comparing me with my cousin who got placed at Microsoft. That comparison destroys me.",
                "emotion": "sadness",
                "wait": 2,
            },
            {
                "user": "I told my parents I'm trying everything but they don't understand how competitive it is now. Everyone says tier-3 students are doomed.",
                "emotion": "anxious",
                "wait": 2,
            },
        ],
    },
    "Day 5": {
        "title": "Rejection again, but handling better",
        "turns": [
            {
                "user": "Got rejected by another company but this time it didn't destroy me like before. I actually expected it.",
                "emotion": "neutral",
                "wait": 2,
            },
            {
                "user": "I think I'm learning to separate my self-worth from these rejections. They're about fit, not about me being worthless.",
                "emotion": "thoughtful",
                "wait": 2,
            },
            {
                "user": "I have 2 more interviews next week. Let me focus on those instead of worrying about past rejections.",
                "emotion": "determined",
                "wait": 2,
            },
        ],
    },
    "Day 6": {
        "title": "Late night study session revelation",
        "turns": [
            {
                "user": "I've been studying until 2 AM every night for 5 days now. I'm exhausted but I feel prepared for my remaining interviews.",
                "emotion": "tired_but_hopeful",
                "wait": 2,
            },
            {
                "user": "Arjun texted saying he failed his Amazon round. Even IIT kids are struggling. That made me feel less alone somehow.",
                "emotion": "empathetic",
                "wait": 2,
            },
            {
                "user": "I realized I've been comparing my chapter 1 to everyone else's chapter 10. That's not fair to myself.",
                "emotion": "clarity",
                "wait": 2,
            },
        ],
    },
    "Day 7": {
        "title": "Mid-week check-in",
        "turns": [
            {
                "user": "Got through second round of one company! I'm 2 rounds away from an offer now.",
                "emotion": "joy",
                "wait": 2,
            },
            {
                "user": "I'm noticing I'm more confident when I remember my past wins instead of focusing on rejections.",
                "emotion": "proud",
                "wait": 2,
            },
            {
                "user": "Still anxious about the final round but at least I have a real chance now. This feels different from the beginning.",
                "emotion": "hopeful",
                "wait": 2,
            },
        ],
    },
    "Day 8": {
        "title": "Setback but perspective gained",
        "turns": [
            {
                "user": "Failed another round. This time I know exactly where I went wrong - I wasn't clear about my approach.",
                "emotion": "learning",
                "wait": 2,
            },
            {
                "user": "Instead of spiraling, I'm already thinking how to fix it for the next interview. I think I'm getting better at this.",
                "emotion": "resilient",
                "wait": 2,
            },
            {
                "user": "I told my dad I failed and he was supportive this time. Maybe I needed to fail to show him I'm trying.",
                "emotion": "grateful",
                "wait": 2,
            },
        ],
    },
    "Day 9": {
        "title": "Second offer incoming",
        "turns": [
            {
                "user": "I got an offer! After 2 weeks of rejections, I finally have an actual job offer from a decent company.",
                "emotion": "joy",
                "wait": 2,
            },
            {
                "user": "I want to keep interviewing because my dream company hasn't called yet. But I'm not desperate anymore.",
                "emotion": "confident",
                "wait": 2,
            },
            {
                "user": "This validates that my college name doesn't define my capability. I earned this offer through practice and resilience.",
                "emotion": "empowered",
                "wait": 2,
            },
        ],
    },
    "Day 10": {
        "title": "Reflection and strategy shift",
        "turns": [
            {
                "user": "I'm taking a break from constant revision. Instead, I'm doing things that energize me - gym, spending time with friends.",
                "emotion": "balanced",
                "wait": 2,
            },
            {
                "user": "My mental health matters more than getting into a super-tier-1 company. I already have an offer.",
                "emotion": "wise",
                "wait": 2,
            },
            {
                "user": "Arjun and I are studying together now instead of competing. That's way better for my anxiety.",
                "emotion": "connected",
                "wait": 2,
            },
        ],
    },
    "Day 11": {
        "title": "Interview with dream company",
        "turns": [
            {
                "user": "Dream company called! I have the final round next week. I'm nervous but not terrified like before.",
                "emotion": "excited_nervous",
                "wait": 2,
            },
            {
                "user": "I feel like even if I don't get this, I already have an offer. That takes so much pressure off.",
                "emotion": "liberated",
                "wait": 2,
            },
            {
                "user": "I'm going to prepare but also keep my sanity this time. No all-nighters, no spiraling.",
                "emotion": "determined_balanced",
                "wait": 2,
            },
        ],
    },
    "Day 12": {
        "title": "Deeper work on anxiety patterns",
        "turns": [
            {
                "user": "I realized my anxiety peaks when I'm alone at night. During the day with friends, I feel fine.",
                "emotion": "self_aware",
                "wait": 2,
            },
            {
                "user": "I've been doing some breathing exercises before sleep and it's actually helping. I'm sleeping better.",
                "emotion": "hopeful",
                "wait": 2,
            },
            {
                "user": "My mom suggested I talk to someone professional. I'm thinking about it. Maybe therapy could help more.",
                "emotion": "open",
                "wait": 2,
            },
        ],
    },
    "Day 13": {
        "title": "Preparing for final round",
        "turns": [
            {
                "user": "One week until dream company final round. I'm preparing but also managing my stress better.",
                "emotion": "focused",
                "wait": 2,
            },
            {
                "user": "I made a list of my achievements - past projects, wins, times I overcame challenges. It boosts my confidence.",
                "emotion": "confident",
                "wait": 2,
            },
            {
                "user": "Even if I don't get this company, I know I'm capable. That's a huge shift from two weeks ago.",
                "emotion": "grounded",
                "wait": 2,
            },
        ],
    },
    "Day 14": {
        "title": "Final reflection before big interview",
        "turns": [
            {
                "user": "Interview is in 2 days. I'm ready. I've done everything I can do - the rest is up to them.",
                "emotion": "peaceful",
                "wait": 2,
            },
            {
                "user": "Looking back at these two weeks - I went from hopeless to having an offer and interview with my dream company.",
                "emotion": "grateful",
                "wait": 2,
            },
            {
                "user": "Whether I get this offer or not, I've grown so much. My anxiety is still there but I know how to handle it now.",
                "emotion": "wise_hopeful",
                "wait": 2,
            },
        ],
    },
}


async def register_user() -> Dict:
    """Register new user in database"""
    print("\n📝 REGISTERING USER")
    print("="*70)
    
    database_url = settings.database_url or "sqlite+aiosqlite:///./serenity.db"
    engine = create_async_engine(database_url, echo=False, future=True)
    SessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
    )
    
    async with SessionLocal() as session:
        # Check if user exists
        result = await session.execute(
            select(User).where(User.email == PERSONA["email"])
        )
        user = result.scalar_one_or_none()
        
        if user:
            print(f"✅ User already exists!")
            print(f"   Name: {user.name}")
            print(f"   Email: {user.email}")
            print(f"   User ID: {user.id}")
            await session.close()
            await engine.dispose()
            return {"id": user.id, **PERSONA}
        
        # Create new user
        hashed = PasswordHasher().hash(PERSONA["password"])
        user = User(
            name=PERSONA["name"],
            username=PERSONA["email"].split("@")[0],
            email=PERSONA["email"],
            hashed_password=hashed,
            is_active=True,
        )
        session.add(user)
        await session.flush()
        
        print(f"✅ User created successfully!")
        print(f"   Name: {PERSONA['name']}")
        print(f"   Email: {PERSONA['email']}")
        print(f"   Password: {PERSONA['password']}")
        print(f"   User ID: {user.id}")
        
        user_id = user.id
        await session.commit()
    
    await engine.dispose()
    return {"id": user_id, **PERSONA}


async def send_chat_message(user_id: int, conversation_id: int, message: str) -> Dict:
    """Send message via chat API"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/api/chat/",
                json={
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "message": message,
                },
                timeout=30.0,  # Long timeout for LLM response
            )
            
            if response.status_code == 200:
                data = response.json()
                # Handle both possible response formats
                if isinstance(data, dict):
                    return data
                return {"content": str(data), "error": False}
            else:
                print(f"     ⚠️ API error: {response.status_code}")
                print(f"     Response: {response.text[:100]}")
                return {"content": "[API Error]", "error": True}
        except Exception as e:
            print(f"     ⚠️ Connection error: {e}")
            return {"content": "[Connection Error]", "error": True}


async def create_backdated_conversations(user_id: int) -> Dict[int, datetime]:
     """Create conversations backdated 2 weeks, return mapping of conv_id -> timestamp"""
     print("\n📅 CREATING BACKDATED CONVERSATIONS")
     print("="*70)
     
     database_url = settings.database_url or "sqlite+aiosqlite:///./serenity.db"
     engine = create_async_engine(database_url, echo=False, future=True)
     SessionLocal = sessionmaker(
         engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
     )
     
     conversation_map = {}
     day_offset = 14
     
     async with SessionLocal() as session:
         for day_num, (day_label, day_data) in enumerate(CONVERSATION_SCRIPT.items(), 1):
             timestamp = datetime.utcnow() - timedelta(days=day_offset)
             day_offset -= 1
             
             conv = Conversation(
                 user_id=user_id,
                 title=day_data["title"],
                 created_at=timestamp,
                 updated_at=timestamp,
             )
             session.add(conv)
             await session.flush()
             conversation_map[conv.id] = timestamp
             
             print(f"[Day {day_num}] Conversation ID: {conv.id} - {day_data['title']}")
         
         await session.commit()
     
     await engine.dispose()
     return conversation_map


async def create_backdated_journals(user_id: int, conversation_map: Dict[int, datetime]):
     """Create journal entries for each conversation with backdated timestamps"""
     print("\n📔 CREATING BACKDATED JOURNAL ENTRIES")
     print("="*70)
     
     database_url = settings.database_url or "sqlite+aiosqlite:///./serenity.db"
     engine = create_async_engine(database_url, echo=False, future=True)
     SessionLocal = sessionmaker(
         engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
     )
     
     # Map emotions to moods
     emotion_to_mood = {
         "sadness": "sad",
         "joy": "happy",
         "anger": "angry",
         "fear": "anxious",
         "anxiety": "anxious",
         "hopeless": "sad",
         "neutral": "neutral",
         "cautious_hope": "hopeful",
         "thoughtful": "thoughtful",
         "determined": "determined",
         "tired_but_hopeful": "tired",
         "empathetic": "empathetic",
         "clarity": "clear",
         "learning": "learning",
         "resilient": "resilient",
         "grateful": "grateful",
         "confident": "confident",
         "empowered": "empowered",
         "balanced": "balanced",
         "wise": "wise",
         "connected": "connected",
     }
     
     async with SessionLocal() as session:
         for day_num, (day_label, day_data) in enumerate(CONVERSATION_SCRIPT.items(), 1):
             # Get conversation ID and timestamp
             conv_list = list(conversation_map.items())
             if day_num - 1 < len(conv_list):
                 conv_id, conv_timestamp = conv_list[day_num - 1]
                 
                 # Get dominant emotion from day's turns
                 emotions = [turn.get("emotion", "neutral") for turn in day_data.get("turns", [])]
                 dominant_emotion = emotions[0] if emotions else "neutral"
                 mood = emotion_to_mood.get(dominant_emotion, "neutral")
                 
                 # Extract content from turns
                 content = "\n\n".join([
                     f"• {turn.get('user', '')}" 
                     for turn in day_data.get("turns", [])
                 ])
                 
                 # Format conversation date for the summary
                 conv_date_str = conv_timestamp.strftime("%B %d, %Y")
                 
                 journal = JournalEntry(
                     user_id=user_id,
                     conversation_id=conv_id,
                     title=day_data["title"],
                     content=content,
                     emotion=dominant_emotion,
                     mood=mood,
                     tags=["personal", "reflection"],
                     auto_extract=True,
                     ai_summary=f"Journal Entry – {conv_date_str}\n\nReflection on {day_label}'s experiences and emotions.",
                     extraction_method="ai",
                     ai_confidence=0.85,
                     created_at=conv_timestamp,
                     updated_at=conv_timestamp,
                 )
                 session.add(journal)
                 print(f"[Day {day_num}] Journal for {day_label} created with timestamp {conv_timestamp.date()}")
         
         await session.commit()
     
     await engine.dispose()


async def run_full_conversation_test():
    """Run complete 2-week conversation with LLM responses"""
    print("\n" + "="*70)
    print("🚀 FULL-PROOF PERSONA INTEGRATION TEST")
    print("="*70)
    print(f"\nPersona: {PERSONA['name']}")
    print(f"Background: {PERSONA['background']}")
    print(f"Duration: 14 days with 3 conversations per day")
    print(f"Total messages: {14 * 3 * 2} (42 user + 42 assistant)")
    
    # Step 1: Register user
    user = await register_user()
    user_id = user["id"]
    
    # Step 2: Create backdated conversations
    conversation_map = await create_backdated_conversations(user_id)
    conversation_ids = list(conversation_map.keys())
    
    # Step 2.5: Create backdated journal entries
    await create_backdated_journals(user_id, conversation_map)
    
    # Step 3: Run conversations
    print("\n💬 RUNNING CONVERSATIONS")
    print("="*70)
    
    conversation_idx = 0
    total_messages = 0
    successful_responses = 0
    failed_responses = 0
    
    for day_num, (day_label, day_data) in enumerate(CONVERSATION_SCRIPT.items(), 1):
        print(f"\n[Day {day_num}] {day_label}: {day_data['title']}")
        print("-" * 70)
        
        conversation_id = conversation_ids[conversation_idx]
        conversation_idx += 1
        
        for turn_idx, turn in enumerate(day_data["turns"], 1):
            print(f"\n  Turn {turn_idx}:")
            print(f"  💭 Emotion: {turn['emotion']}")
            print(f"  👤 User: {turn['user'][:70]}...")
            
            # Send message
            response = await send_chat_message(user_id, conversation_id, turn["user"])
            total_messages += 1
            
            # Check response
            if response.get("error"):
                print(f"  ❌ Failed to get response: {response.get('content')}")
                failed_responses += 1
            else:
                successful_responses += 1
                # Try multiple possible response field names
                llm_response = response.get("content") or response.get("message") or response.get("response") or str(response)
                if llm_response and llm_response != "[No response]":
                    print(f"  🤖 Assistant: {llm_response[:70]}...")
                else:
                    print(f"  ⚠️ No content in response: {response.keys() if isinstance(response, dict) else type(response)}")
                    failed_responses += 1
                    successful_responses -= 1
            
            # Wait for LLM
            wait_time = turn.get("wait", 2)
            if wait_time > 0:
                await asyncio.sleep(wait_time)
    
    # Step 4: Verify memory storage
    print("\n\n📊 VERIFYING MEMORY ARCHITECTURE")
    print("="*70)
    
    database_url = settings.database_url or "sqlite+aiosqlite:///./serenity.db"
    engine = create_async_engine(database_url, echo=False, future=True)
    SessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
    )
    
    async with SessionLocal() as session:
        # Count semantic memories
        result = await session.execute(
            select(func.count(SemanticMemory.id)).where(SemanticMemory.user_id == user_id)
        )
        memory_count = result.scalar() or 0
        print(f"✅ Semantic Memories Stored: {memory_count}")
        
        # Check emotional profile
        result = await session.execute(
            select(EmotionalProfile).where(EmotionalProfile.user_id == user_id)
            .order_by(EmotionalProfile.computed_at.desc())
        )
        profile = result.scalar_one_or_none()
        if profile:
            print(f"✅ Emotional Profile Generated:")
            print(f"   - Dominant emotion: {profile.dominant_emotion}")
            print(f"   - Dominance: {(profile.dominance_pct or 0):.0%}")
            print(f"   - Resilience: {(profile.resilience_score or 0):.0%}")
            print(f"   - Volatility: {profile.volatility_index:.2f}")
        
        # Check meta-reflection
        result = await session.execute(
            select(MetaReflection).where(MetaReflection.user_id == user_id)
            .order_by(MetaReflection.generated_at.desc())
        )
        reflection = result.scalar_one_or_none()
        if reflection:
            print(f"✅ Meta-Reflection Generated:")
            print(f"   - {reflection.reflection_summary[:100]}...")
        
        # Check cache
        cache_count = await session.execute(
            select(func.count(ConversationContextCache.conversation_id))
            .where(ConversationContextCache.conversation_id.in_(conversation_ids))
        )
        print(f"✅ Conversation Caches: {cache_count.scalar() or 0}")
    
    await engine.dispose()
    
    # Final summary
    print("\n\n" + "="*70)
    print("✅ TEST COMPLETE")
    print("="*70)
    print(f"\nResults:")
    print(f"  Total messages sent: {total_messages}")
    print(f"  Successful LLM responses: {successful_responses}")
    print(f"  Failed responses: {failed_responses}")
    print(f"  Success rate: {(successful_responses/total_messages*100):.1f}%")
    print(f"\nLogin credentials for frontend:")
    print(f"  Email: {PERSONA['email']}")
    print(f"  Password: {PERSONA['password']}")
    print(f"\nYou can now login to frontend and see:")
    print(f"  - 14 conversations over 2 weeks")
    print(f"  - 42 user messages with emotions")
    print(f"  - 42 AI responses with memory context")
    print(f"  - Emotional profile showing patterns")
    print(f"  - Semantic memories from key moments")
    print(f"\n" + "="*70)


if __name__ == "__main__":
    asyncio.run(run_full_conversation_test())
