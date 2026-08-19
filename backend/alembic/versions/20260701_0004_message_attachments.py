"""add message attachments

Revision ID: 20260701_0004
Revises: 20260625_0004
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = "20260701_0004"
down_revision = "20260625_0004"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT")
    op.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20)")


def downgrade():
    op.drop_column("messages", "attachment_type")
    op.drop_column("messages", "attachment_url")
