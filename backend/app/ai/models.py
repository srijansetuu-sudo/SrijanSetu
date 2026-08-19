from uuid import UUID

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class AiGeneration(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ai_generations"

    user_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    generated_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
