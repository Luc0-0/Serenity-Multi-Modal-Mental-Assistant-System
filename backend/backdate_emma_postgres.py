import asyncio
import asyncpg
from datetime import datetime, timedelta

async def main():
    conn = await asyncpg.connect('postgresql://serenity_user:serenity_password@localhost:5432/serenity_db')
    
    # Get Emma's user ID
    user = await conn.fetchrow("SELECT id, email FROM users WHERE email = 'emma.wilson@serenity.app'")
    if not user:
        print("Emma Wilson not found")
        await conn.close()
        return
    
    user_id = user['id']
    print(f"Found Emma Wilson (ID: {user_id})")
    
    # Check current date distribution
    dates = await conn.fetch(
        "SELECT DATE(created_at) as date, COUNT(*) as count FROM emotion_logs WHERE user_id = $1 GROUP BY DATE(created_at) ORDER BY date",
        user_id
    )
    print("\nCurrent emotion log dates:")
    for d in dates:
        print(f"  {d['date']}: {d['count']} logs")
    
    # Get all emotion logs for this user
    logs = await conn.fetch(
        "SELECT id, message_id, conversation_id FROM emotion_logs WHERE user_id = $1 ORDER BY id ASC",
        user_id
    )
    
    print(f"\nBackdating {len(logs)} emotion logs across 7 days...")
    
    now = datetime.utcnow()
    
    for idx, log in enumerate(logs):
        day_offset = idx // 3  # 3 messages per day
        msg_in_day = idx % 3
        
        target = now - timedelta(days=6 - day_offset, hours=9 + msg_in_day * 3)
        
        # Update emotion log
        await conn.execute("UPDATE emotion_logs SET created_at = $1 WHERE id = $2", target, log['id'])
        
        # Update message
        if log['message_id']:
            await conn.execute("UPDATE messages SET created_at = $1 WHERE id = $2", target, log['message_id'])
            # Update assistant reply (next message)
            await conn.execute("UPDATE messages SET created_at = $1 WHERE id = $2", target, log['message_id'] + 1)
        
        # Update conversation (first message of day)
        if msg_in_day == 0 and log['conversation_id']:
            await conn.execute("UPDATE conversations SET created_at = $1 WHERE id = $2", target, log['conversation_id'])
    
    # Verify
    dates_after = await conn.fetch(
        "SELECT DATE(created_at) as date, COUNT(*) as count FROM emotion_logs WHERE user_id = $1 GROUP BY DATE(created_at) ORDER BY date",
        user_id
    )
    print("\n✓ Backdating complete! New distribution:")
    for d in dates_after:
        print(f"  {d['date']}: {d['count']} logs")
    
    await conn.close()

asyncio.run(main())
