#!/usr/bin/env python3
"""Initialize database with all tables from models."""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

from app.db.base import Base


async def init_db():
    """Create all tables defined in models."""
    
    DATABASE_URL = "sqlite+aiosqlite:///./serenity.db"
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    print("\n" + "="*60)
    print("INITIALIZING DATABASE")
    print("="*60 + "\n")
    
    async with engine.begin() as conn:
        print("[INFO] Creating all tables from models...\n")
        await conn.run_sync(Base.metadata.create_all)
    
    await engine.dispose()
    
    print("\n" + "="*60)
    print("[PASS] DATABASE INITIALIZED")
    print("="*60)
    print("\nTables created:")
    print("  - users")
    print("  - conversations")
    print("  - messages")
    print("  - emotion_logs")
    print("  - journal_entries")
    print("  - crisis_events")
    print("\nDatabase ready for use.\n")


if __name__ == "__main__":
    asyncio.run(init_db())
