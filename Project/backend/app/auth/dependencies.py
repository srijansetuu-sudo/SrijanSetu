from fastapi import Depends, Security
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.database.session import get_db
from app.users.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    scheme_name="BearerAuth",
    auto_error=False,
)


async def get_current_user(
    token: str | None = Security(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not token:
        raise UnauthorizedError("Missing Authorization header")

    payload = decode_token(token)
    if payload.get("token_type") != "access":
        raise UnauthorizedError("Access token required")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid token subject")

    user = await db.get(User, user_id)
    if not user:
        raise UnauthorizedError("User not found")
    return user


async def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_active:
        raise UnauthorizedError("Inactive user")
    return user


async def require_creator(user: User = Depends(get_current_active_user)) -> User:
    if user.role != UserRole.CREATOR:
        raise ForbiddenError("Creator role required")
    return user


async def require_customer(user: User = Depends(get_current_active_user)) -> User:
    if user.role != UserRole.CUSTOMER:
        raise ForbiddenError("Customer role required")
    return user


async def require_admin(user: User = Depends(get_current_active_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise ForbiddenError("Admin role required")
    return user
