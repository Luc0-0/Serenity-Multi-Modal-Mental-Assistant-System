#!/usr/bin/env python3
"""
Quick script to create a test user with proper password hashing
"""

import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

sys.path.insert(0, str(__file__).rsplit('\\', 1)[0])

from app.models.user import User
from app.db.base import Base
from app.core.security import get_password_hash
from app.core.config import settings

async def create_user():
    """Create a new test user"""
    
    print("Creating test user...\n")
    
    # Get database URL
    db_url = settings.database_url
    if not db_url:
        print("[ERROR] DATABASE_URL not set in .env")
        return
    
    print(f"[OK] Using database: {db_url}\n")
    
    # Connect to database
    engine = create_async_engine(db_url, echo=False, future=True)
    
    SessionLocal = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False
    )
    
    async with SessionLocal() as session:
        # Create new user
        email = "test_user@example.com"
        password = "TestPassword123!"
        
        # Check if user exists
        result = await session.execute(
            select(User).where(User.email == email)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"[INFO] User {email} already exists (ID: {existing.id})")
            print(f"[INFO] You can login with:")
            print(f"  Email: {email}")
            print(f"  Password: {password}")
            await engine.dispose()
            return
        
        # Create with proper Argon2 hash
        hashed_password = get_password_hash(password)
        
        new_user = User(
            username="test_user",
            email=email,
            hashed_password=hashed_password,
            name="Test User"
        )
        
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        print(f"[OK] User created successfully!\n")
        print(f"[CREDENTIALS]")
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
        print(f"  User ID:  {new_user.id}\n")
        print(f"[LOGIN URL] http://localhost:5173\n")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_user())
