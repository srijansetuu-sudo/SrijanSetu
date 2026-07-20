from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import app.database.base  # noqa: F401
from app.auth.constants import REFRESH_TOKEN_TYPE
from app.auth.utils import sha256_hash, validate_email, validate_password_strength
from app.core.exceptions import APIError, UnauthorizedError
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.core.config import settings
from app.users.models import RefreshToken, User
from app.users.models import UserRole

DEFAULT_ADMIN_EMAIL = "admin@srijansetu.com"
DEFAULT_ADMIN_PASSWORD = "Admin@2026Secure"


def _token_expiry_datetime(days: int) -> datetime:
    return datetime.now(UTC) + timedelta(days=days)


def _store_refresh_token(db: AsyncSession, user_id: str, token_jti: str, refresh_token: str, expires_at: datetime) -> RefreshToken:
    token_row = RefreshToken(
        user_id=user_id,
        token_jti=token_jti,
        token_hash=sha256_hash(refresh_token),
        expires_at=expires_at,
    )
    db.add(token_row)
    return token_row


async def signup(db: AsyncSession, full_name: str, email: str, password: str, role: UserRole) -> tuple[str, str, User]:
    if role == UserRole.ADMIN:
        raise APIError("Admin registration is not allowed through public signup")

    normalized_email = validate_email(email)
    validate_password_strength(password)

    existing = await db.scalar(select(User).where(User.email == normalized_email))
    if existing:
        raise APIError("Email already registered")

    user = User(
        full_name=full_name.strip(),
        email=normalized_email,
        password_hash=hash_password(password),
        role=role,
        is_verified=False,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token(str(user.id), user.email, user.role.value)
    refresh_token, jti = create_refresh_token(str(user.id), user.email, user.role.value)
    _store_refresh_token(db, str(user.id), jti, refresh_token, _token_expiry_datetime(settings.refresh_token_expire_days))

    await db.commit()
    await db.refresh(user)
    return access_token, refresh_token, user


async def ensure_default_admin_user(db: AsyncSession) -> User | None:
    existing_admin = await db.scalar(select(User).where(User.role == UserRole.ADMIN))
    if existing_admin:
        return existing_admin

    admin_user = User(
        full_name="System Administrator",
        email=DEFAULT_ADMIN_EMAIL,
        password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
        role=UserRole.ADMIN,
        is_verified=True,
        is_active=True,
    )
    db.add(admin_user)
    await db.commit()
    await db.refresh(admin_user)
    return admin_user


async def login(db: AsyncSession, email: str, password: str) -> tuple[str, str, User]:
    normalized_email = validate_email(email)
    user = await db.scalar(select(User).where(User.email == normalized_email))
    if not user or not verify_password(password, user.password_hash):
        raise UnauthorizedError("Invalid credentials")
    if not user.is_active:
        raise UnauthorizedError("Inactive user")

    access_token = create_access_token(str(user.id), user.email, user.role.value)
    refresh_token, jti = create_refresh_token(str(user.id), user.email, user.role.value)
    _store_refresh_token(db, str(user.id), jti, refresh_token, _token_expiry_datetime(settings.refresh_token_expire_days))

    user.last_login = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)
    return access_token, refresh_token, user


async def rotate_refresh_token(db: AsyncSession, refresh_token: str) -> tuple[str, str, User]:
    payload = decode_token(refresh_token)
    if payload.get("token_type") != REFRESH_TOKEN_TYPE:
        raise UnauthorizedError("Invalid token type")

    token_jti = payload.get("jti")
    if not token_jti:
        raise UnauthorizedError("Invalid refresh token")

    token_row = await db.scalar(select(RefreshToken).where(RefreshToken.token_jti == token_jti))
    if not token_row or token_row.revoked_at is not None:
        raise UnauthorizedError("Refresh token revoked")
    if token_row.token_hash != sha256_hash(refresh_token):
        raise UnauthorizedError("Refresh token mismatch")
    if token_row.expires_at < datetime.now(UTC):
        raise UnauthorizedError("Refresh token expired")

    user = await db.get(User, payload.get("sub"))
    if not user or not user.is_active:
        raise UnauthorizedError("Inactive user")

    new_access = create_access_token(str(user.id), user.email, user.role.value)
    new_refresh, new_jti = create_refresh_token(str(user.id), user.email, user.role.value)

    token_row.revoked_at = datetime.now(UTC)
    token_row.replaced_by_jti = new_jti
    _store_refresh_token(db, str(user.id), new_jti, new_refresh, _token_expiry_datetime(settings.refresh_token_expire_days))
    await db.commit()

    return new_access, new_refresh, user


async def logout(db: AsyncSession, refresh_token: str, user: User) -> None:
    payload = decode_token(refresh_token)
    if payload.get("token_type") != REFRESH_TOKEN_TYPE:
        raise UnauthorizedError("Invalid token type")
    token_jti = payload.get("jti")
    if not token_jti:
        raise UnauthorizedError("Invalid refresh token")

    token_row = await db.scalar(select(RefreshToken).where(RefreshToken.token_jti == token_jti))
    if not token_row:
        return
    if token_row.user_id != user.id:
        raise UnauthorizedError("Refresh token does not belong to current user")
    token_row.revoked_at = datetime.now(UTC)
    await db.commit()
