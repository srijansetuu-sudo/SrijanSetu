from enum import Enum
from uuid import UUID

from sqlalchemy import Enum as SqlEnum, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class QuotationStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class Quotation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "quotations"

    requirement_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("requirements.id"), index=True, nullable=False)
    creator_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    proposed_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    estimated_days: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[QuotationStatus] = mapped_column(SqlEnum(QuotationStatus), default=QuotationStatus.PENDING, index=True, nullable=False)

    requirement = relationship("Requirement", back_populates="quotations")
    creator = relationship("User", back_populates="quotations", foreign_keys=[creator_id])
    order = relationship("Order", back_populates="quotation", uselist=False)
