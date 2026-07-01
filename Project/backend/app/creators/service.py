from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import APIError, NotFoundError
from app.creators.models import CreatorCategory, CreatorProfile, SavedCreator
from app.creators.schemas import CreatorProfileUpsert
from app.users.models import User


async def upsert_profile(db: AsyncSession, user: User, payload: CreatorProfileUpsert) -> CreatorProfile:
    profile = await db.scalar(select(CreatorProfile).where(CreatorProfile.user_id == user.id))
    data = payload.model_dump(exclude={"categories"})
    if profile:
        for key, value in data.items():
            setattr(profile, key, value)
        await db.execute(delete(CreatorCategory).where(CreatorCategory.creator_id == profile.id))
    else:
        profile = CreatorProfile(user_id=user.id, **data)
        db.add(profile)
        await db.flush()

    for category in payload.categories:
        clean = category.strip()
        if clean:
            db.add(CreatorCategory(creator_id=profile.id, category_name=clean))

    await db.commit()
    return await get_profile(db, profile.id)


async def list_profiles(db: AsyncSession, limit: int, offset: int, search: str | None = None, category: str | None = None) -> list[CreatorProfile]:
    statement = (
        select(CreatorProfile)
        .join(CreatorProfile.user)
        .options(selectinload(CreatorProfile.categories))
        .order_by(CreatorProfile.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    search_term = search.strip() if search else None
    if search_term:
        pattern = f"%{search_term}%"
        statement = statement.where(
            or_(
                CreatorProfile.brand_name.ilike(pattern),
                User.full_name.ilike(pattern),
            )
        )

    category_term = category.strip() if category else None
    if category_term:
        statement = statement.where(CreatorProfile.categories.any(CreatorCategory.category_name.ilike(f"%{category_term}%")))

    result = await db.scalars(
        statement
    )
    return list(result)


async def get_profile(db: AsyncSession, creator_id: UUID) -> CreatorProfile:
    profile = await db.scalar(
        select(CreatorProfile).options(selectinload(CreatorProfile.categories)).where(CreatorProfile.id == creator_id)
    )
    if not profile:
        raise NotFoundError("Creator profile not found")
    return profile


async def get_profile_by_user(db: AsyncSession, user: User) -> CreatorProfile:
    profile = await db.scalar(
        select(CreatorProfile)
        .options(selectinload(CreatorProfile.categories))
        .where(CreatorProfile.user_id == user.id)
    )
    if not profile:
        raise NotFoundError("Creator profile not found")
    return profile


async def save_creator(db: AsyncSession, user: User, creator_id: UUID) -> SavedCreator:
    profile = await get_profile(db, creator_id)
    if profile.user_id == user.id:
        raise APIError("Creators cannot save their own profile")
    existing = await db.scalar(
        select(SavedCreator).where(SavedCreator.customer_id == user.id, SavedCreator.creator_id == profile.user_id)
    )
    if existing:
        return existing
    saved = SavedCreator(customer_id=user.id, creator_id=profile.user_id)
    db.add(saved)
    await db.commit()
    await db.refresh(saved)
    return saved


async def remove_saved_creator(db: AsyncSession, user: User, creator_user_id: UUID) -> None:
    saved = await db.scalar(
        select(SavedCreator).where(SavedCreator.customer_id == user.id, SavedCreator.creator_id == creator_user_id)
    )
    if saved:
        await db.delete(saved)
        await db.commit()


async def list_saved_creators(db: AsyncSession, user: User) -> list[SavedCreator]:
    result = await db.scalars(
        select(SavedCreator)
        .options(selectinload(SavedCreator.creator_profile).selectinload(CreatorProfile.categories))
        .where(SavedCreator.customer_id == user.id)
    )
    return list(result)
