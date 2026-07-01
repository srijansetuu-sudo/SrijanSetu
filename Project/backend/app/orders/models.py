from datetime import datetime
from enum import Enum
from uuid import UUID

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"


class Order(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "orders"

    requirement_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("requirements.id"), unique=True, index=True, nullable=False)
    quotation_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("quotations.id"), unique=True, index=True, nullable=False)
    customer_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    creator_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    platform_commission: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[OrderStatus] = mapped_column(SqlEnum(OrderStatus), default=OrderStatus.PENDING, index=True, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    requirement = relationship("Requirement", back_populates="order")
    quotation = relationship("Quotation", back_populates="order")
    customer = relationship("User", foreign_keys=[customer_id])
    creator = relationship("User", foreign_keys=[creator_id])
    files = relationship("OrderFile", back_populates="order", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    review = relationship("Review", back_populates="order", uselist=False)


class OrderFile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "order_files"

    order_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("orders.id"), index=True, nullable=False)
    uploaded_by: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(80), nullable=False)

    order = relationship("Order", back_populates="files")
