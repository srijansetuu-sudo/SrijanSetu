from uuid import UUID

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class Review(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "reviews"

    order_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("orders.id"), unique=True, index=True, nullable=False)
    reviewer_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    creator_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    order = relationship("Order", back_populates="review")
