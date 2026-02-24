"""Add memory architecture tables."""

from alembic import op
import sqlalchemy as sa


revision = "memory_layers_v1"
down_revision = "rename_ai_to_auto"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conversation_context_cache",
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("last_message_id", sa.Integer(), nullable=True),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["last_message_id"], ["messages.id"]),
        sa.PrimaryKeyConstraint("conversation_id"),
    )
    op.create_index(
        op.f("ix_conversation_context_cache_conversation_id"),
        "conversation_context_cache",
        ["conversation_id"],
        unique=True,
    )

    op.create_table(
        "semantic_memories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("message_id", sa.Integer(), nullable=True),
        sa.Column("conversation_id", sa.Integer(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", sa.JSON(), nullable=False),
        sa.Column("emotion_label", sa.String(length=32), nullable=True),
        sa.Column("importance_score", sa.Float(), nullable=True, server_default="0"),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="chat"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_semantic_memories_user_id"),
        "semantic_memories",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_semantic_memories_message_id"),
        "semantic_memories",
        ["message_id"],
        unique=False,
    )

    op.create_table(
        "emotional_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("period_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("dominant_emotion", sa.String(length=32), nullable=True),
        sa.Column("dominance_pct", sa.Float(), nullable=True, server_default="0"),
        sa.Column("anxiety_score", sa.Float(), nullable=True, server_default="0"),
        sa.Column("sadness_score", sa.Float(), nullable=True, server_default="0"),
        sa.Column("resilience_score", sa.Float(), nullable=True, server_default="0"),
        sa.Column("volatility_index", sa.Float(), nullable=True, server_default="0"),
        sa.Column("log_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("emotion_distribution", sa.JSON(), nullable=True),
        sa.Column("trend", sa.String(length=32), nullable=True),
        sa.Column(
            "computed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_emotional_profiles_user_id"),
        "emotional_profiles",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "meta_reflections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("reflection_summary", sa.Text(), nullable=False),
        sa.Column("detected_patterns", sa.JSON(), nullable=True),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_meta_reflections_user_id"),
        "meta_reflections",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_meta_reflections_user_id"), table_name="meta_reflections")
    op.drop_table("meta_reflections")
    op.drop_index(
        op.f("ix_emotional_profiles_user_id"), table_name="emotional_profiles"
    )
    op.drop_table("emotional_profiles")
    op.drop_index(op.f("ix_semantic_memories_message_id"), table_name="semantic_memories")
    op.drop_index(op.f("ix_semantic_memories_user_id"), table_name="semantic_memories")
    op.drop_table("semantic_memories")
    op.drop_index(
        op.f("ix_conversation_context_cache_conversation_id"),
        table_name="conversation_context_cache",
    )
    op.drop_table("conversation_context_cache")
