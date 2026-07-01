from enum import Enum
from uuid import UUID

from sqlalchemy import Enum as SqlEnum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class Payment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "payments"

    order_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("orders.id"), index=True, nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_status: Mapped[PaymentStatus] = mapped_column(SqlEnum(PaymentStatus), default=PaymentStatus.PENDING, index=True, nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(80), nullable=True)

    order = relationship("Order", back_populates="payments")
