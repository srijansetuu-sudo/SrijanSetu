from enum import Enum

from sqlalchemy import Boolean, Enum as SqlEnum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class AdSlot(str, Enum):
    homepage = "homepage"
    feed = "feed"


class AdPlacement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ad_placements"

    slot: Mapped[AdSlot] = mapped_column(SqlEnum(AdSlot), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    target_url: Mapped[str] = mapped_column(String(500), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
