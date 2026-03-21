"""Add weekly rollup table for journal delta extraction."""

from alembic import op
import sqlalchemy as sa


revision = "add_journal_weekly_rollups"
down_revision = "fix_partial_goal_2024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "journal_weekly_rollups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("week_start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("compact_summary", sa.Text(), nullable=True),
        sa.Column("top_changes", sa.JSON(), nullable=True),
        sa.Column("signal_fingerprints", sa.JSON(), nullable=True),
        sa.Column("merged_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_journal_weekly_rollups_id"),
        "journal_weekly_rollups",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_journal_weekly_rollups_user_id"),
        "journal_weekly_rollups",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_journal_weekly_rollups_week_start_date"),
        "journal_weekly_rollups",
        ["week_start_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_journal_weekly_rollups_week_start_date"),
        table_name="journal_weekly_rollups",
    )
    op.drop_index(
        op.f("ix_journal_weekly_rollups_user_id"),
        table_name="journal_weekly_rollups",
    )
    op.drop_index(
        op.f("ix_journal_weekly_rollups_id"),
        table_name="journal_weekly_rollups",
    )
    op.drop_table("journal_weekly_rollups")
