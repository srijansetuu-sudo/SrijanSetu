"""initial schema

Revision ID: 20260526_0001
Revises:
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260526_0001"
down_revision = None
branch_labels = None
depends_on = None


def uuid_pk():
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def timestamps():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade():
    bind = op.get_bind()
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    user_role = postgresql.ENUM("CUSTOMER", "CREATOR", "ADMIN", name="userrole", create_type=False)
    requirement_status = postgresql.ENUM("OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED", name="requirementstatus", create_type=False)
    quotation_status = postgresql.ENUM("PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN", name="quotationstatus", create_type=False)
    order_status = postgresql.ENUM("PENDING", "ACTIVE", "DELIVERED", "COMPLETED", "CANCELLED", "DISPUTED", name="orderstatus", create_type=False)
    payment_status = postgresql.ENUM("PENDING", "SUCCESS", "FAILED", "REFUNDED", name="paymentstatus", create_type=False)
    ad_slot = postgresql.ENUM("homepage", "feed", name="adslot", create_type=False)

    for enum_type in [user_role, requirement_status, quotation_status, order_status, payment_status, ad_slot]:
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "users",
        uuid_pk(),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *timestamps(),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_is_verified", "users", ["is_verified"])
    op.create_index("ix_users_is_active", "users", ["is_active"])

    op.create_table(
        "creator_profiles",
        uuid_pk(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("brand_name", sa.String(length=160), nullable=True),
        sa.Column("headline", sa.String(length=180), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("years_of_experience", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("portfolio_cover_url", sa.Text(), nullable=True),
        sa.Column("average_rating", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_reviews", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_orders_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("response_time_hours", sa.Integer(), nullable=True),
        sa.Column("instagram_url", sa.Text(), nullable=True),
        sa.Column("website_url", sa.Text(), nullable=True),
        sa.Column("youtube_url", sa.Text(), nullable=True),
        sa.Column("is_verified_creator", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        *timestamps(),
    )
    op.create_index("ix_creator_profiles_user_id", "creator_profiles", ["user_id"])
    op.create_index("ix_creator_profiles_is_verified_creator", "creator_profiles", ["is_verified_creator"])

    op.create_table(
        "creator_categories",
        uuid_pk(),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("creator_profiles.id"), nullable=False),
        sa.Column("category_name", sa.String(length=120), nullable=False),
        *timestamps(),
    )
    op.create_index("ix_creator_categories_creator_id", "creator_categories", ["creator_id"])
    op.create_index("ix_creator_categories_category_name", "creator_categories", ["category_name"])

    op.create_table(
        "requirements",
        uuid_pk(),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("budget_min", sa.Numeric(12, 2), nullable=False),
        sa.Column("budget_max", sa.Numeric(12, 2), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("status", requirement_status, nullable=False, server_default="OPEN"),
        sa.Column("ai_generated_reference", sa.Text(), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_requirements_customer_id", "requirements", ["customer_id"])
    op.create_index("ix_requirements_status", "requirements", ["status"])

    op.create_table(
        "requirement_references",
        uuid_pk(),
        sa.Column("requirement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("requirements.id"), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        *timestamps(),
    )
    op.create_index("ix_requirement_references_requirement_id", "requirement_references", ["requirement_id"])

    op.create_table(
        "quotations",
        uuid_pk(),
        sa.Column("requirement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("requirements.id"), nullable=False),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("proposed_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("estimated_days", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", quotation_status, nullable=False, server_default="PENDING"),
        *timestamps(),
    )
    op.create_index("ix_quotations_requirement_id", "quotations", ["requirement_id"])
    op.create_index("ix_quotations_creator_id", "quotations", ["creator_id"])
    op.create_index("ix_quotations_status", "quotations", ["status"])

    op.create_table(
        "orders",
        uuid_pk(),
        sa.Column("requirement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("requirements.id"), nullable=False, unique=True),
        sa.Column("quotation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("quotations.id"), nullable=False, unique=True),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("platform_commission", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", order_status, nullable=False, server_default="PENDING"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_orders_requirement_id", "orders", ["requirement_id"])
    op.create_index("ix_orders_quotation_id", "orders", ["quotation_id"])
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_creator_id", "orders", ["creator_id"])
    op.create_index("ix_orders_status", "orders", ["status"])

    op.create_table(
        "order_files",
        uuid_pk(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=False),
        sa.Column("file_type", sa.String(length=80), nullable=False),
        *timestamps(),
    )
    op.create_index("ix_order_files_order_id", "order_files", ["order_id"])
    op.create_index("ix_order_files_uploaded_by", "order_files", ["uploaded_by"])

    op.create_table(
        "messages",
        uuid_pk(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        *timestamps(),
    )
    op.create_index("ix_messages_order_id", "messages", ["order_id"])
    op.create_index("ix_messages_sender_id", "messages", ["sender_id"])

    op.create_table(
        "payments",
        uuid_pk(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("razorpay_payment_id", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_status", payment_status, nullable=False, server_default="PENDING"),
        sa.Column("payment_method", sa.String(length=80), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_payments_order_id", "payments", ["order_id"])
    op.create_index("ix_payments_razorpay_payment_id", "payments", ["razorpay_payment_id"])
    op.create_index("ix_payments_payment_status", "payments", ["payment_status"])

    op.create_table(
        "reviews",
        uuid_pk(),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False, unique=True),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_reviews_order_id", "reviews", ["order_id"])
    op.create_index("ix_reviews_reviewer_id", "reviews", ["reviewer_id"])
    op.create_index("ix_reviews_creator_id", "reviews", ["creator_id"])

    op.create_table(
        "notifications",
        uuid_pk(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        *timestamps(),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])

    op.create_table(
        "saved_creators",
        uuid_pk(),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("customer_id", "creator_id", name="uq_saved_creator_customer_creator"),
    )
    op.create_index("ix_saved_creators_customer_id", "saved_creators", ["customer_id"])
    op.create_index("ix_saved_creators_creator_id", "saved_creators", ["creator_id"])

    op.create_table(
        "ai_generations",
        uuid_pk(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("generated_image_url", sa.Text(), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_ai_generations_user_id", "ai_generations", ["user_id"])

    op.create_table(
        "ad_placements",
        uuid_pk(),
        sa.Column("slot", ad_slot, nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("target_url", sa.String(length=500), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *timestamps(),
    )
    op.create_index("ix_ad_placements_slot", "ad_placements", ["slot"])
    op.create_index("ix_ad_placements_is_active", "ad_placements", ["is_active"])


def downgrade():
    for table in [
        "ad_placements",
        "ai_generations",
        "saved_creators",
        "notifications",
        "reviews",
        "payments",
        "messages",
        "order_files",
        "orders",
        "quotations",
        "requirement_references",
        "requirements",
        "creator_categories",
        "creator_profiles",
        "users",
    ]:
        op.drop_table(table)

    for enum_name in ["adslot", "paymentstatus", "orderstatus", "quotationstatus", "requirementstatus", "userrole"]:
        postgresql.ENUM(name=enum_name).drop(op.get_bind(), checkfirst=True)
