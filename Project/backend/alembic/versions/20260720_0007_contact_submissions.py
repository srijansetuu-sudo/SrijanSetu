"""add contact submissions

Revision ID: 20260720_0007
Revises: 20260705_0006
Create Date: 2026-07-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260720_0007"
down_revision = "20260705_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    contact_category = postgresql.ENUM("FEEDBACK", "ORDER_COMPLAINT", "QUERY", name="contactcategory", create_type=False)
    contact_status = postgresql.ENUM("OPEN", "IN_REVIEW", "RESOLVED", name="contactstatus", create_type=False)
    contact_category.create(op.get_bind(), checkfirst=True)
    contact_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "contact_submissions",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", contact_category, nullable=False),
        sa.Column("status", contact_status, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=180), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contact_submissions_category", "contact_submissions", ["category"])
    op.create_index("ix_contact_submissions_email", "contact_submissions", ["email"])
    op.create_index("ix_contact_submissions_order_id", "contact_submissions", ["order_id"])
    op.create_index("ix_contact_submissions_status", "contact_submissions", ["status"])
    op.create_index("ix_contact_submissions_user_id", "contact_submissions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_contact_submissions_user_id", table_name="contact_submissions")
    op.drop_index("ix_contact_submissions_status", table_name="contact_submissions")
    op.drop_index("ix_contact_submissions_order_id", table_name="contact_submissions")
    op.drop_index("ix_contact_submissions_email", table_name="contact_submissions")
    op.drop_index("ix_contact_submissions_category", table_name="contact_submissions")
    op.drop_table("contact_submissions")
    postgresql.ENUM(name="contactstatus").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="contactcategory").drop(op.get_bind(), checkfirst=True)
