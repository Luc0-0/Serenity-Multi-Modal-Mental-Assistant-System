from alembic import op
import sqlalchemy as sa


revision = 'add_ai_extraction_journal'
down_revision = 'add_name_column'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to journal_entries table
    op.add_column('journal_entries', sa.Column('ai_extracted', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('journal_entries', sa.Column('ai_summary', sa.Text(), nullable=True))
    op.add_column('journal_entries', sa.Column('ai_confidence', sa.Float(), nullable=True))
    op.add_column('journal_entries', sa.Column('extraction_method', sa.String(length=50), nullable=False, server_default='ai'))
    
    # Create index for ai_extracted for efficient filtering
    op.create_index(op.f('ix_journal_entries_ai_extracted'), 'journal_entries', ['ai_extracted'], unique=False)
    op.create_index(op.f('ix_journal_entries_extraction_method'), 'journal_entries', ['extraction_method'], unique=False)


def downgrade() -> None:
    # Drop indices
    op.drop_index(op.f('ix_journal_entries_extraction_method'), table_name='journal_entries')
    op.drop_index(op.f('ix_journal_entries_ai_extracted'), table_name='journal_entries')
    
    # Drop columns
    op.drop_column('journal_entries', 'extraction_method')
    op.drop_column('journal_entries', 'ai_confidence')
    op.drop_column('journal_entries', 'ai_summary')
    op.drop_column('journal_entries', 'ai_extracted')
