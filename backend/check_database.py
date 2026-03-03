import asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

async def main():
    print("Starting database check...")
    print(f"Database URL: {settings.database_url}\n")
    
    try:
        engine = create_async_engine(settings.database_url)
        
        # Test connection
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("[OK] Database connected\n")
        
        # Get data
        SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with SessionLocal() as session:
            # Count conversations
            result = await session.execute(text("SELECT COUNT(*) FROM conversations"))
            conv_count = result.scalar()
            print(f"Conversations: {conv_count}")
            
            # Count messages
            result = await session.execute(text("SELECT COUNT(*) FROM messages"))
            msg_count = result.scalar()
            print(f"Messages: {msg_count}")
            
            # Count emotion logs
            result = await session.execute(text("SELECT COUNT(*) FROM emotion_logs"))
            emotion_count = result.scalar()
            print(f"Emotion Logs: {emotion_count}")
            
            # Count journal entries
            result = await session.execute(text("SELECT COUNT(*) FROM journal_entries"))
            journal_count = result.scalar()
            print(f"Journal Entries: {journal_count}")
            
            # Count crisis events
            result = await session.execute(text("SELECT COUNT(*) FROM crisis_events"))
            crisis_count = result.scalar()
            print(f"Crisis Events: {crisis_count}\n")
            
            # Show all
            if conv_count > 0:
                result = await session.execute(text("SELECT id, title FROM conversations"))
                print("CONVERSATIONS:")
                for row in result:
                    print(f"  ID {row[0]}: {row[1]}")
            
            if msg_count > 0:
                result = await session.execute(text("SELECT id, conversation_id, role, content FROM messages LIMIT 10"))
                print("\nMESSAGES:")
                for row in result:
                    content = row[3][:50] if row[3] else ""
                    print(f"  [{row[0]}] Conv{row[1]} | {row[2]}: {content}")
            
            if emotion_count > 0:
                result = await session.execute(text("SELECT id, user_id, conversation_id, message_id, primary_emotion, confidence FROM emotion_logs ORDER BY created_at DESC"))
                print("\nEMOTION LOGS:")
                for row in result:
                    print(f"  [{row[0]}] User{row[1]} Conv{row[2]} Msg{row[3]} | {row[4]} ({row[5]:.2f})")
            else:
                print("EMOTION LOGS: (none yet)")
            
            if journal_count > 0:
                result = await session.execute(text("SELECT id, user_id, conversation_id, message_id, extracted_insights, mood, tags FROM journal_entries ORDER BY created_at DESC LIMIT 10"))
                print("\nJOURNAL ENTRIES:")
                for row in result:
                    print(f"  [{row[0]}] User{row[1]} Conv{row[2]} Msg{row[3]}")
                    print(f"      Insights: {row[4][:60] if row[4] else 'N/A'}")
                    print(f"      Mood: {row[5]}, Tags: {row[6]}")
            else:
                print("\nJOURNAL ENTRIES: (none yet)")
            
            if crisis_count > 0:
                result = await session.execute(text("SELECT id, user_id, conversation_id, message_id, severity, confidence, keywords_detected, pattern_detected FROM crisis_events ORDER BY created_at DESC LIMIT 10"))
                print("\nCRISIS EVENTS:")
                for row in result:
                    print(f"  [{row[0]}] User{row[1]} Conv{row[2]} Msg{row[3]}")
                    print(f"      Severity: {row[4].upper()}, Confidence: {row[5]:.2f}")
                    print(f"      Keywords: {row[6][:60] if row[6] else 'N/A'}")
                    print(f"      Pattern: {row[7] if row[7] else 'N/A'}")
            else:
                print("\nCRISIS EVENTS: (none yet)")
        
        await engine.dispose()
        
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(main())