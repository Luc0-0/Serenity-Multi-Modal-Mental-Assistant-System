"""Database session configuration."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

if not settings.database_url:
    database_url = "sqlite+aiosqlite:///./serenity.db"
else:
    database_url = settings.database_url

engine = create_async_engine(
    database_url,
    echo=settings.debug,
    future=True,
)

SessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
