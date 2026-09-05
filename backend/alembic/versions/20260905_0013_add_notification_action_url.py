"""add notification action url

Revision ID: 20260905_0013
Revises: 20260902_0012
Create Date: 2026-09-05 00:00:00.000000
"""
from alembic import op

revision = "20260905_0013"
down_revision = "20260902_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(255);")


def downgrade() -> None:
    op.execute("ALTER TABLE notifications DROP COLUMN IF EXISTS action_url;")
