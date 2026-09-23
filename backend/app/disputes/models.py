from datetime import datetime
from enum import Enum
from uuid import UUID

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class DisputeReason(str, Enum):
    QUALITY_ISSUE = "QUALITY_ISSUE"
    MISSED_DEADLINE = "MISSED_DEADLINE"
    INCOMPLETE_DELIVERY = "INCOMPLETE_DELIVERY"
    PAYMENT_OR_REFUND = "PAYMENT_OR_REFUND"
    COMMUNICATION_ISSUE = "COMMUNICATION_ISSUE"
    OTHER = "OTHER"


class DisputeStatus(str, Enum):
    OPEN = "OPEN"
    IN_REVIEW = "IN_REVIEW"
    RESOLVED = "RESOLVED"


class DisputeResolution(str, Enum):
    RESUME_ORDER = "RESUME_ORDER"
    CANCEL_ORDER = "CANCEL_ORDER"
    OTHER = "OTHER"


class Dispute(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "disputes"

    order_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), index=True, nullable=False)
    raised_by: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    reason: Mapped[DisputeReason] = mapped_column(SqlEnum(DisputeReason), index=True, nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[DisputeStatus] = mapped_column(SqlEnum(DisputeStatus), default=DisputeStatus.OPEN, index=True, nullable=False)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution: Mapped[DisputeResolution | None] = mapped_column(SqlEnum(DisputeResolution), nullable=True)
    resolved_by: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    contact_submission_id: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), ForeignKey("contact_submissions.id", ondelete="SET NULL"), nullable=True)

    order = relationship("Order", back_populates="disputes")
    raised_by_user = relationship("User", foreign_keys=[raised_by])
    resolved_by_user = relationship("User", foreign_keys=[resolved_by])
    contact_submission = relationship("ContactSubmission")
