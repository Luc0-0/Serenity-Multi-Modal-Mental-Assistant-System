from alembic import op
import sqlalchemy as sa


revision = 'rename_ai_to_auto'
down_revision = 'add_ai_extraction_journal'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename ai_extracted to auto_extract
    op.alter_column('journal_entries', 'ai_extracted', new_column_name='auto_extract')
    
    # Update the index name
    op.drop_index('ix_journal_entries_ai_extracted', table_name='journal_entries')
    op.create_index(op.f('ix_journal_entries_auto_extract'), 'journal_entries', ['auto_extract'], unique=False)


def downgrade() -> None:
    # Rename auto_extract back to ai_extracted
    op.drop_index('ix_journal_entries_auto_extract', table_name='journal_entries')
    op.create_index('ix_journal_entries_ai_extracted', 'journal_entries', ['ai_extracted'], unique=False)
    op.alter_column('journal_entries', 'auto_extract', new_column_name='ai_extracted')
