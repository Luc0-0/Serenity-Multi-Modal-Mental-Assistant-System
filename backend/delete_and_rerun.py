import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://serenity_user:serenity_password@localhost:5432/serenity_db')
    
    user = await conn.fetchrow("SELECT id FROM users WHERE email = 'emma.wilson@serenity.app'")
    if user:
        user_id = user['id']
        await conn.execute("DELETE FROM crisis_events WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM emotion_logs WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM journal_entries WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = $1)", user_id)
        await conn.execute("DELETE FROM conversations WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM users WHERE id = $1", user_id)
        print(f"Deleted Emma Wilson (ID: {user_id})")
    else:
        print("Emma not found")
    
    await conn.close()

asyncio.run(main())
