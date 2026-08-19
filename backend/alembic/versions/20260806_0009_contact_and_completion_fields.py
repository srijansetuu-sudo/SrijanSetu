"""add contact and completion fields

Revision ID: 20260806_0009
Revises: 20260722_0008
Create Date: 2026-08-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260806_0009"
down_revision = "20260722_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone_number", sa.String(length=30), nullable=True))
    op.add_column("users", sa.Column("address_line", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("state", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("postal_code", sa.String(length=20), nullable=True))
    op.add_column("orders", sa.Column("customer_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("creator_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("payout_ready_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "payout_ready_at")
    op.drop_column("orders", "creator_completed_at")
    op.drop_column("orders", "customer_completed_at")
    op.drop_column("users", "postal_code")
    op.drop_column("users", "state")
    op.drop_column("users", "city")
    op.drop_column("users", "address_line")
    op.drop_column("users", "phone_number")
