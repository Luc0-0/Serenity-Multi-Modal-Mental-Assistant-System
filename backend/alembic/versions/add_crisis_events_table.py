"""Add crisis_events table for tracking crisis detections

Revision ID: add_crisis_events
Revises: add_ids_journal
Create Date: 2026-02-12 14:00:00.000000

Tracks crisis assessments for trend analysis and monitoring.
Non-critical: failures to log don't affect chat flow.
"""
from alembic import op
import sqlalchemy as sa


revision = 'add_crisis_events'
down_revision = 'add_ids_journal'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('crisis_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('conversation_id', sa.Integer(), nullable=True),
    sa.Column('message_id', sa.Integer(), nullable=True),
    sa.Column('severity', sa.String(length=20), nullable=False),
    sa.Column('confidence', sa.Float(), nullable=True),
    sa.Column('keywords_detected', sa.Text(), nullable=True),
    sa.Column('response_sent', sa.Text(), nullable=True),
    sa.Column('pattern_detected', sa.String(length=255), nullable=True),
    sa.Column('user_acknowledged', sa.Boolean(), default=False),
    sa.Column('escalated_to_professional', sa.Boolean(), default=False),
    sa.Column('followup_provided', sa.Boolean(), default=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
    sa.ForeignKeyConstraint(['message_id'], ['messages.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_crisis_events_id'), 'crisis_events', ['id'], unique=False)
    op.create_index(op.f('ix_crisis_events_user_id'), 'crisis_events', ['user_id'], unique=False)
    op.create_index(op.f('ix_crisis_events_conversation_id'), 'crisis_events', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_crisis_events_message_id'), 'crisis_events', ['message_id'], unique=False)
    op.create_index(op.f('ix_crisis_events_severity'), 'crisis_events', ['severity'], unique=False)
    op.create_index(op.f('ix_crisis_events_created_at'), 'crisis_events', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_crisis_events_created_at'), table_name='crisis_events')
    op.drop_index(op.f('ix_crisis_events_severity'), table_name='crisis_events')
    op.drop_index(op.f('ix_crisis_events_message_id'), table_name='crisis_events')
    op.drop_index(op.f('ix_crisis_events_conversation_id'), table_name='crisis_events')
    op.drop_index(op.f('ix_crisis_events_user_id'), table_name='crisis_events')
    op.drop_index(op.f('ix_crisis_events_id'), table_name='crisis_events')
    op.drop_table('crisis_events')
