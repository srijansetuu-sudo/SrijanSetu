"""add quotation revisions

Revision ID: 20260722_0008
Revises: 20260720_0007
Create Date: 2026-07-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260722_0008"
down_revision = "20260720_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quotations", sa.Column("revisions_allowed", sa.Integer(), nullable=False, server_default="0"))
    op.alter_column("quotations", "revisions_allowed", server_default=None)


def downgrade() -> None:
    op.drop_column("quotations", "revisions_allowed")
