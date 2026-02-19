"""
Clean database and run fresh 7-day test with transformer model.
"""
import asyncio
import asyncpg
from datetime import datetime, timedelta
import httpx

DB_URL = "postgresql://serenity_user:serenity_password@localhost:5432/serenity_db"
BASE_URL = "http://localhost:8000"

NEW_USER = {
    "name": "Alex Morgan",
    "email": "alex.morgan@serenity.app",
    "password": "Wellness2024!",
}

DAILY_MESSAGES = [
    ("Mon", ["I've been really overwhelmed with deadlines", "My boss keeps adding more tasks", "I can barely sleep thinking about it"]),
    ("Tue", ["I feel like I'm failing at everything", "Nobody seems to understand what I'm going through", "I just feel so alone"]),
    ("Wed", ["A friend reached out today and it helped", "Maybe things aren't as bad as I thought", "I went for a short walk and felt slightly better"]),
    ("Thu", ["I actually got something done today and felt proud", "My team acknowledged my hard work", "I feel a bit of hope again"]),
    ("Fri", ["The weekend is coming but I'm still stressed", "I keep going back and forth between ok and not ok", "I don't know what to feel"]),
    ("Sat", ["Taking some time to breathe today", "Looking back this week was a rollercoaster", "I'm trying to be kinder to myself"]),
    ("Sun", ["I'm grateful for the people who care about me", "I think I'm learning to handle things better", "Tomorrow is a new start"]),
]

async def clean_database():
    print("🗑️  Cleaning database...")
    conn = await asyncpg.connect(DB_URL)
    
    await conn.execute("DELETE FROM crisis_events")
    await conn.execute("DELETE FROM emotion_logs")
    await conn.execute("DELETE FROM journal_entries")
    await conn.execute("DELETE FROM messages")
    await conn.execute("DELETE FROM conversations")
    await conn.execute("DELETE FROM users")
    
    await conn.close()
    print("✓ Database cleaned\n")

async def create_user(client):
    print(f"👤 Creating user: {NEW_USER['email']}")
    resp = await client.post(f"{BASE_URL}/api/auth/signup/", json=NEW_USER)
    data = resp.json()
    user_id = data["user"]["id"]
    token = data["access_token"]
    print(f"✓ User created (ID: {user_id})\n")
    return user_id, token

async def send_messages(client, user_id):
    print("💬 Sending 21 messages...")
    message_data = []
    
    for day_idx, (weekday, messages) in enumerate(DAILY_MESSAGES):
        print(f"\n{weekday}:")
        conv_id = None
        
        for msg in messages:
            payload = {"user_id": user_id, "message": msg}
            if conv_id:
                payload["conversation_id"] = conv_id
            
            resp = await client.post(f"{BASE_URL}/api/chat/", json=payload, timeout=120.0)
            
            if resp.status_code == 200:
                data = resp.json()
                conv_id = data.get("conversation_id")
                msg_id = data.get("message_id")
                message_data.append((msg_id, day_idx))
                print(f"  ✓ {msg[:50]}...")
            else:
                print(f"  ✗ Failed: {resp.status_code}")
            
            await asyncio.sleep(2.0)  # Wait for emotion logging to complete
    
    print(f"\n✓ Sent {len(message_data)} messages\n")
    return message_data

async def backdate_messages(user_id, message_data):
    print("📅 Backdating timestamps...")
    conn = await asyncpg.connect(DB_URL)
    
    now = datetime.utcnow()
    
    for msg_id, day_idx in message_data:
        target = now - timedelta(days=6 - day_idx, hours=9)
        
        await conn.execute("UPDATE messages SET created_at = $1 WHERE id = $2", target, msg_id)
        await conn.execute("UPDATE messages SET created_at = $1 WHERE id = $2", target, msg_id + 1)
        await conn.execute("UPDATE emotion_logs SET created_at = $1 WHERE message_id = $2", target, msg_id)
        
        if message_data.index((msg_id, day_idx)) % 3 == 0:
            await conn.execute(
                "UPDATE conversations SET created_at = $1 WHERE id = (SELECT conversation_id FROM messages WHERE id = $2)",
                target, msg_id
            )
    
    await conn.close()
    print(f"✓ Backdated {len(message_data)} messages\n")

async def verify_emotions(user_id):
    print("🎭 Verifying emotion detection...")
    conn = await asyncpg.connect(DB_URL)
    
    emotions = await conn.fetch(
        "SELECT primary_emotion, confidence, DATE(created_at) as date FROM emotion_logs WHERE user_id = $1 ORDER BY created_at",
        user_id
    )
    
    print(f"\nTotal emotion logs: {len(emotions)}")
    print("\nEmotion distribution:")
    
    emotion_counts = {}
    for e in emotions:
        emotion_counts[e['primary_emotion']] = emotion_counts.get(e['primary_emotion'], 0) + 1
    
    for emotion, count in sorted(emotion_counts.items(), key=lambda x: -x[1]):
        pct = (count / len(emotions)) * 100
        print(f"  {emotion:10s}: {count:2d} ({pct:.1f}%)")
    
    print("\nBy date:")
    date_emotions = {}
    for e in emotions:
        date = str(e['date'])
        if date not in date_emotions:
            date_emotions[date] = []
        date_emotions[date].append(e['primary_emotion'])
    
    for date in sorted(date_emotions.keys()):
        emotions_str = ', '.join(date_emotions[date])
        print(f"  {date}: {emotions_str}")
    
    await conn.close()

async def main():
    print("="*60)
    print("  Fresh 7-Day Test with Transformer Model")
    print("="*60)
    print()
    
    await clean_database()
    
    async with httpx.AsyncClient() as client:
        user_id, token = await create_user(client)
        message_data = await send_messages(client, user_id)
        await backdate_messages(user_id, message_data)
    
    await verify_emotions(user_id)
    
    print("\n" + "="*60)
    print("✓ TEST COMPLETE!")
    print("="*60)
    print(f"\nLogin credentials:")
    print(f"  Email: {NEW_USER['email']}")
    print(f"  Password: {NEW_USER['password']}")
    print()

if __name__ == "__main__":
    asyncio.run(main())
