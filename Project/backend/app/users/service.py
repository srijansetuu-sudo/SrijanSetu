from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.models import User
from app.users.schemas import UserProfileUpdate


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == email))


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    return await db.get(User, user_id)


async def update_profile(db: AsyncSession, user: User, payload: UserProfileUpdate) -> User:
    user.full_name = payload.full_name
    user.avatar_url = payload.avatar_url
    user.phone_number = payload.phone_number
    user.address_line = payload.address_line
    user.city = payload.city
    user.state = payload.state
    user.postal_code = payload.postal_code
    await db.commit()
    await db.refresh(user)
    return user
