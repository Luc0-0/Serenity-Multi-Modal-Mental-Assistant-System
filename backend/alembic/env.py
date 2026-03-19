from logging.config import fileConfig
from sqlalchemy import pool
from alembic import context
import os

from app.core.config import settings
from app.db.base import Base
from app.db.session import sync_engine

# Import models so they're registered with Base
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.emotion_log import EmotionLog
from app.models.journal_entry import JournalEntry
from app.models.crisis_event import CrisisEvent
from app.models.goal import (
    Goal,
    GoalPhase,
    DailySchedule,
    DailyLog,
    PhaseTask,
    WeeklyReview,
    StreakFreeze
)
from app.models.meditation_session import MeditationSession
from app.models.memory import (
    ConversationContextCache,
    SemanticMemory,
    EmotionalProfile,
    MetaReflection,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    # Get database URL from settings
    database_url = settings.database_url
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    # Convert async URLs to sync for migrations
    if "postgresql+asyncpg://" in database_url:
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    if "sqlite+aiosqlite://" in database_url:
        database_url = database_url.replace("sqlite+aiosqlite://", "sqlite://")

    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode using sync engine."""
    with sync_engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
