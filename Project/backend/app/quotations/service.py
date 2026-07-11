from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import APIError, ForbiddenError, NotFoundError
from app.notifications.service import queue_notification
from app.orders.models import Order, OrderStatus
from app.quotations.models import Quotation, QuotationStatus
from app.quotations.schemas import QuotationCreate
from app.requirements.models import Requirement, RequirementStatus
from app.users.models import User


def _commission(total: Decimal) -> Decimal:
    return (total * Decimal("0.15")).quantize(Decimal("0.01"))


async def create_quotation(db: AsyncSession, user: User, payload: QuotationCreate) -> Quotation:
    requirement = await db.get(Requirement, payload.requirement_id)
    if not requirement:
        raise NotFoundError("Requirement not found")
    if requirement.customer_id == user.id:
        raise APIError("Customers cannot quote on their own requirements")
    if requirement.status != RequirementStatus.OPEN:
        raise APIError("Creators can only quote on open requirements")
    existing = await db.scalar(
        select(Quotation).where(Quotation.requirement_id == payload.requirement_id, Quotation.creator_id == user.id)
    )
    if existing:
        raise APIError("You have already quoted on this requirement")
    quotation = Quotation(creator_id=user.id, **payload.model_dump())
    db.add(quotation)
    queue_notification(
        db,
        requirement.customer_id,
        "New quotation received",
        f"{user.full_name} sent a quotation for: {requirement.title}",
        f"/dashboard/customer/requirements/{requirement.id}/quotations",
    )
    await db.commit()
    await db.refresh(quotation)
    return quotation


async def list_for_requirement(db: AsyncSession, user: User, requirement_id: UUID) -> list[Quotation]:
    requirement = await db.get(Requirement, requirement_id)
    if not requirement:
        raise NotFoundError("Requirement not found")
    if requirement.customer_id != user.id and user.role.value != "ADMIN":
        raise ForbiddenError("Only the requirement owner can view quotations")
    result = await db.scalars(
        select(Quotation)
        .options(selectinload(Quotation.order))
        .where(Quotation.requirement_id == requirement_id)
    )
    return list(result)


async def list_my_quotations(db: AsyncSession, user: User) -> list[Quotation]:
    result = await db.scalars(select(Quotation).where(Quotation.creator_id == user.id).order_by(Quotation.created_at.desc()))
    return list(result)


async def accept_quotation(db: AsyncSession, user: User, quotation_id: UUID) -> Order:
    quotation = await db.get(Quotation, quotation_id)
    if not quotation:
        raise NotFoundError("Quotation not found")
    requirement = await db.get(Requirement, quotation.requirement_id)
    if not requirement:
        raise NotFoundError("Requirement not found")
    if requirement.customer_id != user.id:
        raise ForbiddenError("Only the requirement owner can accept quotations")
    existing_order = await db.scalar(select(Order).where(Order.requirement_id == requirement.id))
    if quotation.status == QuotationStatus.ACCEPTED and existing_order and existing_order.status == OrderStatus.PENDING:
        return existing_order
    if requirement.status != RequirementStatus.OPEN:
        raise APIError("Only open requirements can accept quotations")
    if quotation.status != QuotationStatus.PENDING:
        raise APIError("Only pending quotations can be accepted")
    if existing_order:
        raise APIError("This requirement already has an order")

    quotation.status = QuotationStatus.ACCEPTED
    requirement.status = RequirementStatus.IN_PROGRESS
    amount = Decimal(str(quotation.proposed_price))
    order = Order(
        requirement_id=requirement.id,
        quotation_id=quotation.id,
        customer_id=user.id,
        creator_id=quotation.creator_id,
        total_amount=amount,
        platform_commission=_commission(amount),
    )
    db.add(order)
    await db.flush()
    queue_notification(
        db,
        quotation.creator_id,
        "Quotation accepted",
        f"Your quotation for '{requirement.title}' was accepted. Open the workspace to chat with the customer.",
        f"/orders/{order.id}",
    )
    await db.commit()
    await db.refresh(order)
    return order


async def reject_quotation(db: AsyncSession, user: User, quotation_id: UUID) -> Quotation:
    quotation = await db.get(Quotation, quotation_id)
    if not quotation:
        raise NotFoundError("Quotation not found")
    requirement = await db.get(Requirement, quotation.requirement_id)
    if not requirement:
        raise NotFoundError("Requirement not found")
    if requirement.customer_id != user.id:
        raise ForbiddenError("Only the requirement owner can reject quotations")
    if quotation.status != QuotationStatus.PENDING:
        raise APIError("Only pending quotations can be rejected")
    quotation.status = QuotationStatus.REJECTED
    queue_notification(
        db,
        quotation.creator_id,
        "Quotation rejected",
        f"Your quotation for '{requirement.title}' was rejected.",
        f"/dashboard/creator/quotations",
    )
    await db.commit()
    await db.refresh(quotation)
    return quotation


async def delete_quotation(db: AsyncSession, user: User, quotation_id: UUID) -> None:
    quotation = await db.get(Quotation, quotation_id)
    if not quotation:
        raise NotFoundError("Quotation not found")
    if quotation.creator_id != user.id:
        raise ForbiddenError("Creators can only delete their own quotations")
    if quotation.status == QuotationStatus.ACCEPTED:
        raise APIError("Accepted quotations cannot be deleted")

    requirement = await db.get(Requirement, quotation.requirement_id)
    if requirement:
        queue_notification(
            db,
            requirement.customer_id,
            "Quotation deleted",
            f"{user.full_name} deleted their quotation for: {requirement.title}",
            f"/dashboard/customer/requirements/{requirement.id}/quotations",
        )
    await db.delete(quotation)
    await db.commit()
