"""Add conversation_id and message_id to journal_entries

Revision ID: add_ids_journal
Revises: add_message_id
Create Date: 2026-02-12 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_ids_journal'
down_revision = 'add_message_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('journal_entries', sa.Column('conversation_id', sa.Integer(), nullable=True))
    op.add_column('journal_entries', sa.Column('message_id', sa.Integer(), nullable=True))
    op.add_column('journal_entries', sa.Column('tags', sa.Text(), nullable=True))
    op.create_foreign_key('fk_journal_entries_conversation_id', 'journal_entries', 'conversations', ['conversation_id'], ['id'])
    op.create_foreign_key('fk_journal_entries_message_id', 'journal_entries', 'messages', ['message_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_journal_entries_message_id', 'journal_entries', type_='foreignkey')
    op.drop_constraint('fk_journal_entries_conversation_id', 'journal_entries', type_='foreignkey')
    op.drop_column('journal_entries', 'tags')
    op.drop_column('journal_entries', 'message_id')
    op.drop_column('journal_entries', 'conversation_id')
