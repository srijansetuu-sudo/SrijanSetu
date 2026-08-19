from enum import Enum
from uuid import UUID

from sqlalchemy import Enum as SqlEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class ContactCategory(str, Enum):
    FEEDBACK = "FEEDBACK"
    ORDER_COMPLAINT = "ORDER_COMPLAINT"
    QUERY = "QUERY"


class ContactStatus(str, Enum):
    OPEN = "OPEN"
    IN_REVIEW = "IN_REVIEW"
    RESOLVED = "RESOLVED"


class ContactSubmission(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "contact_submissions"

    user_id: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    order_id: Mapped[UUID | None] = mapped_column(PgUUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), index=True, nullable=True)
    category: Mapped[ContactCategory] = mapped_column(SqlEnum(ContactCategory), index=True, nullable=False)
    status: Mapped[ContactStatus] = mapped_column(SqlEnum(ContactStatus), default=ContactStatus.OPEN, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User")
    order = relationship("Order")
