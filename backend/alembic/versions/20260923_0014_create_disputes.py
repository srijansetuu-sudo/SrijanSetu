"""create disputes

Revision ID: 20260923_0014
Revises: 20260905_0013
Create Date: 2026-09-23 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260923_0014"
down_revision = "20260905_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    reason_enum = postgresql.ENUM(
        "QUALITY_ISSUE",
        "MISSED_DEADLINE",
        "INCOMPLETE_DELIVERY",
        "PAYMENT_OR_REFUND",
        "COMMUNICATION_ISSUE",
        "OTHER",
        name="disputereason",
    )
    status_enum = postgresql.ENUM("OPEN", "IN_REVIEW", "RESOLVED", name="disputestatus")
    resolution_enum = postgresql.ENUM(
        "RESUME_ORDER",
        "CANCEL_ORDER",
        "HOLD_PAYOUT",
        "RELEASE_PAYOUT",
        "REFUND_REVIEW",
        "OTHER",
        name="disputeresolution",
    )
    reason_enum.create(bind, checkfirst=True)
    status_enum.create(bind, checkfirst=True)
    resolution_enum.create(bind, checkfirst=True)

    existing_reason_enum = postgresql.ENUM(name="disputereason", create_type=False)
    existing_status_enum = postgresql.ENUM(name="disputestatus", create_type=False)
    existing_resolution_enum = postgresql.ENUM(name="disputeresolution", create_type=False)

    op.create_table(
        "disputes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("raised_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason", existing_reason_enum, nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("evidence_url", sa.Text(), nullable=True),
        sa.Column("evidence_name", sa.String(length=255), nullable=True),
        sa.Column("status", existing_status_enum, nullable=False, server_default="OPEN"),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("resolution", existing_resolution_enum, nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("contact_submission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contact_submissions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_disputes_order_id", "disputes", ["order_id"])
    op.create_index("ix_disputes_raised_by", "disputes", ["raised_by"])
    op.create_index("ix_disputes_reason", "disputes", ["reason"])
    op.create_index("ix_disputes_status", "disputes", ["status"])


def downgrade() -> None:
    op.drop_index("ix_disputes_status", table_name="disputes")
    op.drop_index("ix_disputes_reason", table_name="disputes")
    op.drop_index("ix_disputes_raised_by", table_name="disputes")
    op.drop_index("ix_disputes_order_id", table_name="disputes")
    op.drop_table("disputes")
    op.execute("DROP TYPE IF EXISTS disputeresolution")
    op.execute("DROP TYPE IF EXISTS disputestatus")
    op.execute("DROP TYPE IF EXISTS disputereason")
