"""add message attachments

Revision ID: 20260701_0004
Revises: 20260527_0003
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = "20260701_0004"
down_revision = "20260527_0003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("messages", sa.Column("attachment_url", sa.Text(), nullable=True))
    op.add_column("messages", sa.Column("attachment_type", sa.String(length=20), nullable=True))


def downgrade():
    op.drop_column("messages", "attachment_type")
    op.drop_column("messages", "attachment_url")
