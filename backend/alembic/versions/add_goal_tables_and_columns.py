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
down_revision = 'rename_ai_to_auto'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### Goal Tables Creation ###

    # Goals table
    op.create_table('goals',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False, index=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('theme', sa.String(length=50), nullable=True),
    sa.Column('duration_days', sa.Integer(), nullable=True),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('current_streak', sa.Integer(), nullable=True),
    sa.Column('longest_streak', sa.Integer(), nullable=True),
    sa.Column('freezes_available', sa.Integer(), nullable=True),
    sa.Column('total_completed_days', sa.Integer(), nullable=True),
    sa.Column('answers_json', sa.Text(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_goals_id'), 'goals', ['id'], unique=False)
    op.create_index(op.f('ix_goals_user_id'), 'goals', ['user_id'], unique=False)

    # Goal Phases table
    op.create_table('goal_phases',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('goal_id', sa.Integer(), nullable=False, index=True),
    sa.Column('phase_number', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('unlock_streak_required', sa.Integer(), nullable=True),
    sa.Column('is_unlocked', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_goal_phases_id'), 'goal_phases', ['id'], unique=False)
    op.create_index(op.f('ix_goal_phases_goal_id'), 'goal_phases', ['goal_id'], unique=False)

    # Daily Schedule table
    op.create_table('daily_schedules',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('goal_id', sa.Integer(), nullable=False, index=True),
    sa.Column('time', sa.String(length=10), nullable=False),
    sa.Column('activity', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('tags', sa.Text(), nullable=True),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_daily_schedules_id'), 'daily_schedules', ['id'], unique=False)
    op.create_index(op.f('ix_daily_schedules_goal_id'), 'daily_schedules', ['goal_id'], unique=False)

    # Daily Logs table
    op.create_table('daily_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False, index=True),
    sa.Column('goal_id', sa.Integer(), nullable=False, index=True),
    sa.Column('date', sa.Date(), nullable=False, index=True),
    sa.Column('completed_items', sa.Text(), nullable=True),
    sa.Column('is_frozen', sa.Boolean(), nullable=True),
    sa.Column('completion_percentage', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_daily_logs_id'), 'daily_logs', ['id'], unique=False)
    op.create_index(op.f('ix_daily_logs_user_id'), 'daily_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_daily_logs_goal_id'), 'daily_logs', ['goal_id'], unique=False)
    op.create_index(op.f('ix_daily_logs_date'), 'daily_logs', ['date'], unique=False)

    # Phase Tasks table
    op.create_table('phase_tasks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('phase_id', sa.Integer(), nullable=False, index=True),
    sa.Column('domain_name', sa.String(length=100), nullable=False),
    sa.Column('task_title', sa.String(length=255), nullable=False),
    sa.Column('subtasks', sa.Text(), nullable=True),
    sa.Column('is_completed', sa.Boolean(), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['phase_id'], ['goal_phases.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_phase_tasks_id'), 'phase_tasks', ['id'], unique=False)
    op.create_index(op.f('ix_phase_tasks_phase_id'), 'phase_tasks', ['phase_id'], unique=False)

    # Weekly Reviews table
    op.create_table('weekly_reviews',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False, index=True),
    sa.Column('goal_id', sa.Integer(), nullable=False, index=True),
    sa.Column('week_start_date', sa.Date(), nullable=False, index=True),
    sa.Column('answers', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_weekly_reviews_id'), 'weekly_reviews', ['id'], unique=False)
    op.create_index(op.f('ix_weekly_reviews_user_id'), 'weekly_reviews', ['user_id'], unique=False)
    op.create_index(op.f('ix_weekly_reviews_goal_id'), 'weekly_reviews', ['goal_id'], unique=False)
    op.create_index(op.f('ix_weekly_reviews_week_start_date'), 'weekly_reviews', ['week_start_date'], unique=False)

    # Streak Freezes table
    op.create_table('streak_freezes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False, index=True),
    sa.Column('goal_id', sa.Integer(), nullable=False, index=True),
    sa.Column('used_date', sa.Date(), nullable=False, index=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_streak_freezes_id'), 'streak_freezes', ['id'], unique=False)
    op.create_index(op.f('ix_streak_freezes_user_id'), 'streak_freezes', ['user_id'], unique=False)
    op.create_index(op.f('ix_streak_freezes_goal_id'), 'streak_freezes', ['goal_id'], unique=False)
    op.create_index(op.f('ix_streak_freezes_used_date'), 'streak_freezes', ['used_date'], unique=False)

    # Meditation Sessions table
    op.create_table('meditation_sessions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False, index=True),
    sa.Column('session_type', sa.String(length=50), nullable=False),
    sa.Column('duration_minutes', sa.Integer(), nullable=False),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('mood_before', sa.String(length=50), nullable=True),
    sa.Column('mood_after', sa.String(length=50), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_meditation_sessions_id'), 'meditation_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_meditation_sessions_user_id'), 'meditation_sessions', ['user_id'], unique=False)

    # Set default values
    op.execute("ALTER TABLE goals ALTER COLUMN theme SET DEFAULT 'balanced'")
    op.execute("ALTER TABLE goals ALTER COLUMN duration_days SET DEFAULT 180")
    op.execute("ALTER TABLE goals ALTER COLUMN current_streak SET DEFAULT 0")
    op.execute("ALTER TABLE goals ALTER COLUMN longest_streak SET DEFAULT 0")
    op.execute("ALTER TABLE goals ALTER COLUMN freezes_available SET DEFAULT 0")
    op.execute("ALTER TABLE goals ALTER COLUMN total_completed_days SET DEFAULT 0")
    op.execute("ALTER TABLE goals ALTER COLUMN is_active SET DEFAULT true")

    op.execute("ALTER TABLE goal_phases ALTER COLUMN unlock_streak_required SET DEFAULT 0")
    op.execute("ALTER TABLE goal_phases ALTER COLUMN is_unlocked SET DEFAULT false")

    op.execute("ALTER TABLE daily_logs ALTER COLUMN is_frozen SET DEFAULT false")
    op.execute("ALTER TABLE daily_logs ALTER COLUMN completion_percentage SET DEFAULT 0")

    op.execute("ALTER TABLE phase_tasks ALTER COLUMN is_completed SET DEFAULT false")


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