import asyncio
import sys
import os
from sqlalchemy import select

# Add parent dir so app imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.models.emotion_log import EmotionLog
from app.utils.emotion_constants import normalize_emotion

async def main():
    print("Starting emotion label DB migration...")
    async with SessionLocal() as db:
        stmt = select(EmotionLog)
        result = await db.execute(stmt)
        logs = result.scalars().all()
        
        updated_count = 0
        for log in logs:
            if not log.primary_emotion:
                continue
                
            normalized = normalize_emotion(log.primary_emotion)
            if log.primary_emotion != normalized:
                print(f"Normalizing '{log.primary_emotion}' -> '{normalized}' for log ID {log.id}")
                log.primary_emotion = normalized
                updated_count += 1
                
        if updated_count > 0:
            await db.commit()
            print(f"Migration complete! Successfully normalized {updated_count} rows.")
        else:
            print("Migration complete! No rows needed normalization.")

if __name__ == "__main__":
    asyncio.run(main())
