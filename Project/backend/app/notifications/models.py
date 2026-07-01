from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class Notification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    action_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
