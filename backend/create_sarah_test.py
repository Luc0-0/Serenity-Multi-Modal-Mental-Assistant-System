"""
Fresh 7-Day Test with Direct Database Backdating
Creates a new user and spreads data across 7 days properly
"""
import asyncio
import sqlite3
import httpx
from datetime import datetime, timedelta
from pathlib import Path

BASE_URL = "http://localhost:8000"
DB_PATH = Path(__file__).resolve().parent / "serenity.db"

NEW_USER = {
    "name": "Sarah Chen",
    "email": "sarah.chen@serenity.app",
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

async def create_user(client):
    resp = await client.post(f"{BASE_URL}/api/auth/signup/", json=NEW_USER)
    if resp.status_code == 201:
        data = resp.json()
        print(f"✓ Created user: {NEW_USER['email']}")
        return data["user"]["id"], data["access_token"]
    resp = await client.post(f"{BASE_URL}/api/auth/login/", json={"email": NEW_USER["email"], "password": NEW_USER["password"]})
    data = resp.json()
    print(f"✓ Logged in: {NEW_USER['email']}")
    return data["user"]["id"], data["access_token"]

async def send_all_messages(client, user_id):
    message_ids = []
    for day_idx, (weekday, messages) in enumerate(DAILY_MESSAGES):
        print(f"\n{weekday} - Sending {len(messages)} messages...")
        conv_id = None
        for msg in messages:
            payload = {"user_id": user_id, "message": msg}
            if conv_id:
                payload["conversation_id"] = conv_id
            resp = await client.post(f"{BASE_URL}/api/chat/", json=payload, timeout=120.0)
            if resp.status_code == 200:
                data = resp.json()
                conv_id = data.get("conversation_id")
                message_ids.append((data.get("message_id"), day_idx))
                print(f"  ✓ Sent")
            await asyncio.sleep(0.5)
    return message_ids

def backdate_in_db(user_id, message_ids):
    print("\n📅 Backdating timestamps...")
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    
    now = datetime.utcnow()
    
    for msg_id, day_idx in message_ids:
        target_date = now - timedelta(days=6 - day_idx)
        ts = target_date.strftime("%Y-%m-%d %H:%M:%S")
        
        # Update message
        cur.execute("UPDATE messages SET created_at = ? WHERE id = ?", (ts, msg_id))
        # Update assistant reply
        cur.execute("UPDATE messages SET created_at = ? WHERE id = ?", (ts, msg_id + 1))
        # Update emotion log
        cur.execute("UPDATE emotion_logs SET created_at = ? WHERE message_id = ?", (ts, msg_id))
        # Update conversation (first message of day)
        if message_ids.index((msg_id, day_idx)) % 3 == 0:
            cur.execute("UPDATE conversations SET created_at = ? WHERE id = (SELECT conversation_id FROM messages WHERE id = ?)", (ts, msg_id))
    
    conn.commit()
    conn.close()
    print(f"✓ Backdated {len(message_ids)} messages across 7 days")

async def main():
    print("=" * 60)
    print("  Fresh 7-Day Test - Sarah Chen")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        user_id, token = await create_user(client)
        message_ids = await send_all_messages(client, user_id)
        backdate_in_db(user_id, message_ids)
    
    print("\n" + "=" * 60)
    print("✓ COMPLETE!")
    print("=" * 60)
    print(f"\nLogin credentials:")
    print(f"  Email: {NEW_USER['email']}")
    print(f"  Password: {NEW_USER['password']}")
    print()

if __name__ == "__main__":
    asyncio.run(main())
