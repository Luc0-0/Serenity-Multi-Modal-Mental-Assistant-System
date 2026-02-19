"""
Setup test user in the database (for API testing).
Uses the configured DATABASE_URL (PostgreSQL or SQLite).
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models.user import User
from app.db.base import Base
from app.core.config import settings


async def setup_test_user():
    """Create test user if it doesn't exist."""
    
    # Use the configured database URL
    database_url = settings.database_url or "sqlite+aiosqlite:///./serenity.db"
    
    print(f"Using database: {database_url}")
    
    engine = create_async_engine(database_url, echo=False, future=True)
    
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Database tables created/verified")
    
    # Create session
    SessionLocal = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    
    async with SessionLocal() as session:
        # Check if test user exists
        result = await session.execute(
            select(User).where(User.username == "testuser")
        )
        user = result.scalar_one_or_none()
        
        if user:
            print(f"[OK] Test user already exists (ID: {user.id})")
            print(f"     Username: {user.username}")
            print(f"     Email: {user.email}")
        else:
            # Create test user
            test_user = User(
                username="testuser",
                email="test@serenity.local",
                hashed_password="hashed_test_password_123"
            )
            session.add(test_user)
            await session.commit()
            print(f"[OK] Created test user (ID: {test_user.id})")
            print(f"     Username: {test_user.username}")
            print(f"     Email: {test_user.email}")
    
    await engine.dispose()
    print("\n[OK] Database setup complete!")
    print("     You can now use: user_id=1 in API requests")


if __name__ == "__main__":
    asyncio.run(setup_test_user())
