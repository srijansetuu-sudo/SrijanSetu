from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class UserRole(str, Enum):
    CUSTOMER = "CUSTOMER"
    CREATOR = "CREATOR"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole), nullable=False, index=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator_profile = relationship("CreatorProfile", back_populates="user", uselist=False)
    requirements = relationship("Requirement", back_populates="customer", foreign_keys="Requirement.customer_id")
    quotations = relationship("Quotation", back_populates="creator", foreign_keys="Quotation.creator_id")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_jti: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by_jti: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
