from enum import Enum
from datetime import datetime
from uuid import UUID
from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Numeric, String, Text, CheckConstraint, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class PayoutStatus(str, Enum):
    PENDING = "PENDING"
    REPORTED = "REPORTED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Payout(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "payouts"

    order_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    status: Mapped[PayoutStatus] = mapped_column(SqlEnum(PayoutStatus), default=PayoutStatus.PENDING, nullable=False, index=True)
    transaction_id: Mapped[str] = mapped_column(Text, nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(80), nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    commission_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    creator_receivable: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    payout_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    order = relationship("Order", viewonly=True)

    __table_args__ = (
        UniqueConstraint("order_id", name="uq_payouts_order_id"),
        UniqueConstraint("transaction_id", name="uq_payouts_transaction_id"),
        CheckConstraint("amount >= 0", name="ck_payouts_amount_non_negative"),
        CheckConstraint("commission_amount >= 0", name="ck_payouts_commission_non_negative"),
        CheckConstraint("creator_receivable >= 0", name="ck_payouts_receivable_non_negative"),
        Index("ix_payouts_transaction_id", "transaction_id"),
    )


class PayoutAuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "payout_audit_logs"

    payout_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("payouts.id"), nullable=False, index=True)
    order_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    event_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        Index("ix_payout_audit_payout_id", "payout_id"),
    )
