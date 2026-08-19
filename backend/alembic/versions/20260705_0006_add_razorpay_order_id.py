"""add razorpay order id to payments

Revision ID: 20260705_0006
Revises: 20260701_0005
Create Date: 2026-07-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260705_0006"
down_revision = "20260701_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("razorpay_order_id", sa.Text(), nullable=True))
    op.create_index("ix_payments_razorpay_order_id", "payments", ["razorpay_order_id"])


def downgrade() -> None:
    op.drop_index("ix_payments_razorpay_order_id", table_name="payments")
    op.drop_column("payments", "razorpay_order_id")
