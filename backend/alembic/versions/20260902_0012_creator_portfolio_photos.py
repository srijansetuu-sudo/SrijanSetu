"""add creator portfolio photos

Revision ID: 20260902_0012
Revises: 20260814_0011
Create Date: 2026-09-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260902_0012"
down_revision = "20260814_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "creator_portfolio_photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("creator_profiles.id"), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_creator_portfolio_photos_creator_id", "creator_portfolio_photos", ["creator_id"])


def downgrade() -> None:
    op.drop_index("ix_creator_portfolio_photos_creator_id", table_name="creator_portfolio_photos")
    op.drop_table("creator_portfolio_photos")
