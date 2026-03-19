"""fix_partial_goal_tables

Revision ID: fix_partial_goal_2024
Revises: add_goal_tables_2024
Create Date: 2024-03-19 11:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'fix_partial_goal_2024'
down_revision = 'add_goal_tables_2024'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check what exists and only create missing tables

    # Create tables only if they don't exist (PostgreSQL syntax)
    try:
        # Goal Phases table (likely missing)
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

        op.execute("CREATE INDEX IF NOT EXISTS idx_goal_phases_goal_id ON goal_phases(goal_id)")

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

        op.execute("CREATE INDEX IF NOT EXISTS idx_daily_schedules_goal_id ON daily_schedules(goal_id)")

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

        op.execute("CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs(user_id)")
        op.execute("CREATE INDEX IF NOT EXISTS idx_daily_logs_goal_id ON daily_logs(goal_id)")
        op.execute("CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date)")

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

        op.execute("CREATE INDEX IF NOT EXISTS idx_phase_tasks_phase_id ON phase_tasks(phase_id)")

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

        op.execute("CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_id ON weekly_reviews(user_id)")
        op.execute("CREATE INDEX IF NOT EXISTS idx_weekly_reviews_goal_id ON weekly_reviews(goal_id)")
        op.execute("CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week_start ON weekly_reviews(week_start_date)")

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

        op.execute("CREATE INDEX IF NOT EXISTS idx_streak_freezes_user_id ON streak_freezes(user_id)")
        op.execute("CREATE INDEX IF NOT EXISTS idx_streak_freezes_goal_id ON streak_freezes(goal_id)")
        op.execute("CREATE INDEX IF NOT EXISTS idx_streak_freezes_date ON streak_freezes(used_date)")

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

        op.execute("CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_id ON meditation_sessions(user_id)")

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

    except Exception as e:
        # If any error, continue anyway since tables might already exist
        pass


def downgrade() -> None:
    # Only drop tables that this migration might have created
    op.execute("DROP TABLE IF EXISTS streak_freezes CASCADE")
    op.execute("DROP TABLE IF EXISTS weekly_reviews CASCADE")
    op.execute("DROP TABLE IF EXISTS phase_tasks CASCADE")
    op.execute("DROP TABLE IF EXISTS daily_logs CASCADE")
    op.execute("DROP TABLE IF EXISTS daily_schedules CASCADE")
    op.execute("DROP TABLE IF EXISTS goal_phases CASCADE")
    op.execute("DROP TABLE IF EXISTS meditation_sessions CASCADE")

    # Remove columns we might have added
    op.execute("ALTER TABLE goals DROP COLUMN IF EXISTS answers_json")
    op.execute("ALTER TABLE goals DROP COLUMN IF EXISTS total_completed_days")