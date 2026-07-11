from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.notifications.service import queue_for_creators
from app.requirements.models import Requirement, RequirementReference, RequirementStatus
from app.requirements.schemas import RequirementCreate, RequirementReferenceCreate, RequirementUpdate
from app.users.models import User


async def create_requirement(db: AsyncSession, user: User, payload: RequirementCreate) -> Requirement:
    requirement = Requirement(customer_id=user.id, **payload.model_dump())
    db.add(requirement)
    await db.flush()
    action_url = f"/requirements/{requirement.id}"
    await queue_for_creators(
        db,
        "New requirement posted",
        f"{user.full_name} posted a new requirement: {requirement.title}",
        exclude_user_id=user.id,
        action_url=action_url,
    )
    await db.commit()
    await db.refresh(requirement)
    return requirement


async def list_requirements(db: AsyncSession, limit: int, offset: int) -> list[Requirement]:
    result = await db.scalars(
        select(Requirement)
        .where(Requirement.status == RequirementStatus.OPEN)
        .order_by(Requirement.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result)


async def list_my_requirements(db: AsyncSession, user: User) -> list[Requirement]:
    result = await db.scalars(
        select(Requirement).where(Requirement.customer_id == user.id).order_by(Requirement.created_at.desc())
    )
    return list(result)


async def get_requirement(db: AsyncSession, requirement_id: UUID) -> Requirement:
    requirement = await db.get(Requirement, requirement_id)
    if not requirement:
        raise NotFoundError("Requirement not found")
    return requirement


async def update_requirement(db: AsyncSession, user: User, requirement_id: UUID, payload: RequirementUpdate) -> Requirement:
    requirement = await get_requirement(db, requirement_id)
    if requirement.customer_id != user.id:
        raise ForbiddenError("Only the requirement owner can update this requirement")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(requirement, key, value)
    await queue_for_creators(
        db,
        "Requirement updated",
        f"{user.full_name} updated requirement: {requirement.title}",
        exclude_user_id=user.id,
        action_url=f"/requirements/{requirement.id}",
    )
    await db.commit()
    await db.refresh(requirement)
    return requirement


async def delete_requirement(db: AsyncSession, user: User, requirement_id: UUID) -> None:
    requirement = await get_requirement(db, requirement_id)
    if requirement.customer_id != user.id:
        raise ForbiddenError("Only the requirement owner can delete this requirement")
    await queue_for_creators(
        db,
        "Requirement removed",
        f"{user.full_name} removed requirement: {requirement.title}",
        exclude_user_id=user.id,
        action_url="/dashboard/creator/requirements",
    )
    await db.delete(requirement)
    await db.commit()


async def add_reference(db: AsyncSession, user: User, requirement_id: UUID, payload: RequirementReferenceCreate) -> RequirementReference:
    requirement = await get_requirement(db, requirement_id)
    if requirement.customer_id != user.id:
        raise ForbiddenError("Only the requirement owner can add references")
    reference = RequirementReference(requirement_id=requirement_id, image_url=payload.image_url)
    db.add(reference)
    await queue_for_creators(
        db,
        "Requirement reference added",
        f"{user.full_name} added a reference for: {requirement.title}",
        exclude_user_id=user.id,
        action_url=f"/requirements/{requirement.id}",
    )
    await db.commit()
    await db.refresh(reference)
    return reference
