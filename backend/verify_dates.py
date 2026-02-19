import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://serenity_user:serenity_password@localhost:5432/serenity_db')
    dates = await conn.fetch(
        "SELECT DATE(created_at) as date, COUNT(*) as count FROM emotion_logs WHERE user_id = 12 GROUP BY DATE(created_at) ORDER BY date"
    )
    print("Emma's emotion logs by date:")
    for d in dates:
        print(f"  {d['date']}: {d['count']} logs")
    await conn.close()

asyncio.run(main())
