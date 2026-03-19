"""Database session configuration for Supabase."""
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Validate database URL
if not settings.database_url:
    raise ValueError("DATABASE_URL environment variable is required for Supabase")

database_url = settings.database_url

# Ensure async URL format for application usage
async_url = database_url
if "postgresql://" in async_url and "postgresql+asyncpg://" not in async_url:
    async_url = async_url.replace("postgresql://", "postgresql+asyncpg://")

# Create async engine for application
engine = create_async_engine(
    async_url,
    echo=settings.debug,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20,
)

# Create sync engine for migrations
sync_url = database_url
if "postgresql+asyncpg://" in sync_url:
    sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql://")

sync_engine = create_engine(
    sync_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_recycle=300,
)

SessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    """Get database session for dependency injection."""
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def check_database_health() -> bool:
    """Check if database connection is healthy."""
    try:
        async with SessionLocal() as session:
            result = await session.execute("SELECT 1")
            return result.scalar() == 1
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
