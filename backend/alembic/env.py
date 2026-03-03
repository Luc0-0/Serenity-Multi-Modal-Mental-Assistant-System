from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context
import os

from app.core.config import settings
from app.db.base import Base

# Import models so they're registered with Base
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.emotion_log import EmotionLog
from app.models.journal_entry import JournalEntry

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Get database URL from environment
database_url = settings.database_url
if not database_url:
    raise ValueError("DATABASE_URL environment variable is not set")

# Convert async URLs to sync for migrations
# postgresql+asyncpg:// → postgresql://
if "postgresql+asyncpg://" in database_url:
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")

# sqlite+aiosqlite:// → sqlite://
if "sqlite+aiosqlite://" in database_url:
    database_url = database_url.replace("sqlite+aiosqlite://", "sqlite://")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = create_engine(
        database_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
