from uuid import UUID

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.database.session import Base


class CreatorProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "creator_profiles"

    user_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), unique=True, index=True, nullable=False)
    brand_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    headline: Mapped[str | None] = mapped_column(String(180), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    years_of_experience: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    portfolio_cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    average_rating: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_orders_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    response_time_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified_creator: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    user = relationship("User", back_populates="creator_profile")
    categories = relationship("CreatorCategory", back_populates="creator", cascade="all, delete-orphan")


class CreatorCategory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "creator_categories"

    creator_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("creator_profiles.id"), index=True, nullable=False)
    category_name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)

    creator = relationship("CreatorProfile", back_populates="categories")


class SavedCreator(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "saved_creators"
    __table_args__ = (UniqueConstraint("customer_id", "creator_id", name="uq_saved_creator_customer_creator"),)

    customer_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    creator_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)

    creator_profile = relationship(
        "CreatorProfile",
        primaryjoin="SavedCreator.creator_id == CreatorProfile.user_id",
        foreign_keys=[creator_id],
        uselist=False,
        viewonly=True,
    )
