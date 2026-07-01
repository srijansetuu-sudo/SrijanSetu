"""add message attachment name

Revision ID: 20260701_0005
Revises: 20260701_0004
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = "20260701_0005"
down_revision = "20260701_0004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("messages", sa.Column("attachment_name", sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column("messages", "attachment_name")
