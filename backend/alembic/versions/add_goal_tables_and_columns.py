"""add_goal_tables_and_columns

Revision ID: add_goal_tables_2024
Revises: rename_ai_extracted_to_auto_extract
Create Date: 2024-03-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_goal_tables_2024'
down_revision = 'memory_layers_v1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### Goal Tables Creation (Idempotent) ###

    # Goals table
    op.execute("""
    CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        theme VARCHAR(50) DEFAULT 'balanced',
        duration_days INTEGER DEFAULT 180,
        start_date DATE NOT NULL,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        freezes_available INTEGER DEFAULT 0,
        total_completed_days INTEGER DEFAULT 0,
        answers_json TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_goals_id ON goals(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_goals_user_id ON goals(user_id)")

    # Goal Phases table
    op.execute("""
    CREATE TABLE IF NOT EXISTS goal_phases (
        id SERIAL PRIMARY KEY,
        goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        phase_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        unlock_streak_required INTEGER DEFAULT 0,
        is_unlocked BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_goal_phases_id ON goal_phases(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_goal_phases_goal_id ON goal_phases(goal_id)")

    # Daily Schedule table
    op.execute("""
    CREATE TABLE IF NOT EXISTS daily_schedules (
        id SERIAL PRIMARY KEY,
        goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        time VARCHAR(10) NOT NULL,
        activity VARCHAR(255) NOT NULL,
        description TEXT,
        tags TEXT,
        sort_order INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_daily_schedules_id ON daily_schedules(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_daily_schedules_goal_id ON daily_schedules(goal_id)")

    # Daily Logs table
    op.execute("""
    CREATE TABLE IF NOT EXISTS daily_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        completed_items TEXT,
        is_frozen BOOLEAN DEFAULT false,
        completion_percentage INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_daily_logs_id ON daily_logs(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_daily_logs_user_id ON daily_logs(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_daily_logs_goal_id ON daily_logs(goal_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_daily_logs_date ON daily_logs(date)")

    # Phase Tasks table
    op.execute("""
    CREATE TABLE IF NOT EXISTS phase_tasks (
        id SERIAL PRIMARY KEY,
        phase_id INTEGER NOT NULL REFERENCES goal_phases(id) ON DELETE CASCADE,
        domain_name VARCHAR(100) NOT NULL,
        task_title VARCHAR(255) NOT NULL,
        subtasks TEXT,
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_phase_tasks_id ON phase_tasks(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_phase_tasks_phase_id ON phase_tasks(phase_id)")

    # Weekly Reviews table
    op.execute("""
    CREATE TABLE IF NOT EXISTS weekly_reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        week_start_date DATE NOT NULL,
        answers TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_weekly_reviews_id ON weekly_reviews(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_weekly_reviews_user_id ON weekly_reviews(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_weekly_reviews_goal_id ON weekly_reviews(goal_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_weekly_reviews_week_start_date ON weekly_reviews(week_start_date)")

    # Streak Freezes table
    op.execute("""
    CREATE TABLE IF NOT EXISTS streak_freezes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        used_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_streak_freezes_id ON streak_freezes(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_streak_freezes_user_id ON streak_freezes(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_streak_freezes_goal_id ON streak_freezes(goal_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_streak_freezes_used_date ON streak_freezes(used_date)")

    # Meditation Sessions table
    op.execute("""
    CREATE TABLE IF NOT EXISTS meditation_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        session_type VARCHAR(50) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        mood_before VARCHAR(50),
        mood_after VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_meditation_sessions_id ON meditation_sessions(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_meditation_sessions_user_id ON meditation_sessions(user_id)")

    # Add missing columns to goals table if they don't exist
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='goals' AND column_name='answers_json') THEN
            ALTER TABLE goals ADD COLUMN answers_json TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='goals' AND column_name='total_completed_days') THEN
            ALTER TABLE goals ADD COLUMN total_completed_days INTEGER DEFAULT 0;
        END IF;
    END $$;
    """)


def downgrade() -> None:
    # ### Drop all Goal-related tables ###
    op.drop_table('streak_freezes')
    op.drop_table('weekly_reviews')
    op.drop_table('phase_tasks')
    op.drop_table('daily_logs')
    op.drop_table('daily_schedules')
    op.drop_table('goal_phases')
    op.drop_table('goals')
    op.drop_table('meditation_sessions')