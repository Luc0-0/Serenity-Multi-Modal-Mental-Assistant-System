"""Add name column to users table and migrate username data

Revision ID: add_name_column
Revises: add_crisis_events
Create Date: 2026-02-16 13:45:00.000000

This migration:
1. Adds the missing 'name' column to users table
2. Copies username data to name for existing users
3. Makes name required (nullable=False)
4. Adds emotion column to journal_entries
"""
from alembic import op
import sqlalchemy as sa


revision = 'add_name_column'
down_revision = 'add_crisis_events'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: Add name column to users table (nullable at first)
    op.add_column(
        'users',
        sa.Column('name', sa.String(length=255), nullable=True)
    )
    
    # Step 2: Copy existing username data to name column
    op.execute('UPDATE users SET name = username WHERE name IS NULL')
    
    # Step 3: Make name non-nullable
    op.alter_column('users', 'name', nullable=False)
    
    # Step 4: Add emotion column to journal_entries
    op.add_column(
        'journal_entries',
        sa.Column('emotion', sa.String(length=50), nullable=True, server_default='neutral')
    )


def downgrade() -> None:
    # Remove emotion column
    op.drop_column('journal_entries', 'emotion')
    
    # Remove name column
    op.drop_column('users', 'name')
