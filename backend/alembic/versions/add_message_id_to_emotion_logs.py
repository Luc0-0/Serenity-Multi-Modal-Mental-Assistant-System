"""Add message_id to emotion_logs table

Revision ID: add_message_id
Revises: 7c73f7b1dd49
Create Date: 2026-02-12 10:00:00.000000

Links emotion logs to specific messages for granular emotion tracking.
"""
from alembic import op
import sqlalchemy as sa


revision = 'add_message_id'
down_revision = '7c73f7b1dd49'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add message_id column to emotion_logs
    op.add_column('emotion_logs',
        sa.Column('message_id', sa.Integer(), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_emotion_logs_message_id',
        'emotion_logs', 'messages',
        ['message_id'], ['id']
    )
    
    # Create index on message_id
    op.create_index(
        op.f('ix_emotion_logs_message_id'),
        'emotion_logs', ['message_id'],
        unique=False
    )
    
    # Make conversation_id NOT NULL (was nullable)
    op.alter_column('emotion_logs', 'conversation_id',
        existing_type=sa.Integer(),
        nullable=False
    )


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_emotion_logs_message_id'), table_name='emotion_logs')
    
    # Drop foreign key
    op.drop_constraint('fk_emotion_logs_message_id', 'emotion_logs', type_='foreignkey')
    
    # Drop column
    op.drop_column('emotion_logs', 'message_id')
    
    # Revert conversation_id to nullable
    op.alter_column('emotion_logs', 'conversation_id',
        existing_type=sa.Integer(),
        nullable=True
    )
