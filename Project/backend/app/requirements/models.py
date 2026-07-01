from datetime import date
from enum import Enum
from uuid import UUID

from sqlalchemy import Date, Enum as SqlEnum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class RequirementStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Requirement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "requirements"

    customer_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    budget_min: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    budget_max: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[RequirementStatus] = mapped_column(
        SqlEnum(RequirementStatus),
        default=RequirementStatus.OPEN,
        index=True,
        nullable=False,
    )
    ai_generated_reference: Mapped[str | None] = mapped_column(Text, nullable=True)

    customer = relationship("User", back_populates="requirements", foreign_keys=[customer_id])
    references = relationship("RequirementReference", back_populates="requirement", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="requirement")
    order = relationship("Order", back_populates="requirement", uselist=False)


class RequirementReference(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "requirement_references"

    requirement_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("requirements.id"), index=True, nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)

    requirement = relationship("Requirement", back_populates="references")
