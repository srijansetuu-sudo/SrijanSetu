from datetime import datetime

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import APIError, NotFoundError
from app.contact.models import ContactSubmission, ContactStatus
from app.orders.models import Order, OrderStatus
from app.payments.models import Payment, PaymentStatus
from app.quotations.models import Quotation, QuotationStatus
from app.requirements.models import Requirement, RequirementStatus
from app.users.models import RefreshToken, User, UserRole


async def get_stats(db: AsyncSession) -> dict:
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    year_start = datetime(now.year, 1, 1)

    async def count(statement) -> int:
        return int((await db.scalar(statement)) or 0)

    async def amount(statement) -> float:
        return float((await db.scalar(statement)) or 0)

    non_admin_user_filter = User.role != UserRole.ADMIN
    active_session_filter = (
        RefreshToken.revoked_at.is_(None),
        RefreshToken.expires_at > now,
        User.role != UserRole.ADMIN,
    )
    successful_payment_filter = Payment.payment_status == PaymentStatus.SUCCESS

    total_users = await count(select(func.count()).select_from(User).where(non_admin_user_filter))
    active_users = await count(select(func.count()).select_from(User).where(non_admin_user_filter, User.is_active.is_(True)))
    total_customers = await count(select(func.count()).select_from(User).where(User.role == UserRole.CUSTOMER))
    total_creators = await count(select(func.count()).select_from(User).where(User.role == UserRole.CREATOR))
    total_admins = await count(select(func.count()).select_from(User).where(User.role == UserRole.ADMIN))
    new_users_this_month = await count(select(func.count()).select_from(User).where(non_admin_user_filter, User.created_at >= month_start))
    new_users_this_year = await count(select(func.count()).select_from(User).where(non_admin_user_filter, User.created_at >= year_start))
    online_sessions = await count(
        select(func.count())
        .select_from(RefreshToken)
        .join(User, User.id == RefreshToken.user_id)
        .where(*active_session_filter)
    )
    online_users = await count(
        select(func.count(distinct(User.id)))
        .select_from(RefreshToken)
        .join(User, User.id == RefreshToken.user_id)
        .where(*active_session_filter)
    )
    open_contact_submissions = await count(select(func.count()).select_from(ContactSubmission).where(ContactSubmission.status == ContactStatus.OPEN))

    total_requirements = await count(select(func.count()).select_from(Requirement))
    open_requirements = await count(select(func.count()).select_from(Requirement).where(Requirement.status == RequirementStatus.OPEN))
    completed_requirements = await count(select(func.count()).select_from(Requirement).where(Requirement.status == RequirementStatus.COMPLETED))
    cancelled_requirements = await count(select(func.count()).select_from(Requirement).where(Requirement.status == RequirementStatus.CANCELLED))

    total_quotations = await count(select(func.count()).select_from(Quotation))
    pending_quotations = await count(select(func.count()).select_from(Quotation).where(Quotation.status == QuotationStatus.PENDING))
    accepted_quotations = await count(select(func.count()).select_from(Quotation).where(Quotation.status == QuotationStatus.ACCEPTED))
    rejected_quotations = await count(select(func.count()).select_from(Quotation).where(Quotation.status == QuotationStatus.REJECTED))

    total_orders = await count(select(func.count()).select_from(Order))
    pending_orders = await count(select(func.count()).select_from(Order).where(Order.status == OrderStatus.PENDING))
    active_orders = await count(select(func.count()).select_from(Order).where(Order.status == OrderStatus.ACTIVE))
    delivered_orders = await count(select(func.count()).select_from(Order).where(Order.status == OrderStatus.DELIVERED))
    completed_orders = await count(select(func.count()).select_from(Order).where(Order.status == OrderStatus.COMPLETED))
    cancelled_orders = await count(select(func.count()).select_from(Order).where(Order.status == OrderStatus.CANCELLED))
    disputed_orders = await count(select(func.count()).select_from(Order).where(Order.status == OrderStatus.DISPUTED))

    total_revenue = await amount(select(func.coalesce(func.sum(Payment.amount), 0)).where(successful_payment_filter))
    revenue_this_month = await amount(select(func.coalesce(func.sum(Payment.amount), 0)).where(successful_payment_filter, Payment.created_at >= month_start))
    revenue_this_year = await amount(select(func.coalesce(func.sum(Payment.amount), 0)).where(successful_payment_filter, Payment.created_at >= year_start))
    platform_commission_total = await amount(select(func.coalesce(func.sum(Order.platform_commission), 0)).where(Order.status == OrderStatus.COMPLETED))
    platform_commission_this_month = await amount(
        select(func.coalesce(func.sum(Order.platform_commission), 0)).where(Order.status == OrderStatus.COMPLETED, Order.completed_at >= month_start)
    )
    platform_commission_this_year = await amount(
        select(func.coalesce(func.sum(Order.platform_commission), 0)).where(Order.status == OrderStatus.COMPLETED, Order.completed_at >= year_start)
    )
    average_order_value = await amount(select(func.coalesce(func.avg(Order.total_amount), 0)).select_from(Order))

    quotation_acceptance_rate = round((accepted_quotations / total_quotations) * 100, 1) if total_quotations else 0
    requirement_to_order_rate = round((total_orders / total_requirements) * 100, 1) if total_requirements else 0
    order_completion_rate = round((completed_orders / total_orders) * 100, 1) if total_orders else 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_customers": total_customers,
        "total_creators": total_creators,
        "total_admins": total_admins,
        "new_users_this_month": new_users_this_month,
        "new_users_this_year": new_users_this_year,
        "online_users": online_users,
        "online_sessions": online_sessions,
        "open_contact_submissions": open_contact_submissions,
        "total_requirements": total_requirements,
        "open_requirements": open_requirements,
        "completed_requirements": completed_requirements,
        "cancelled_requirements": cancelled_requirements,
        "total_quotations": total_quotations,
        "pending_quotations": pending_quotations,
        "accepted_quotations": accepted_quotations,
        "rejected_quotations": rejected_quotations,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "active_orders": active_orders,
        "delivered_orders": delivered_orders,
        "completed_orders": completed_orders,
        "cancelled_orders": cancelled_orders,
        "disputed_orders": disputed_orders,
        "total_revenue": total_revenue,
        "revenue_this_month": revenue_this_month,
        "revenue_this_year": revenue_this_year,
        "platform_commission_total": platform_commission_total,
        "platform_commission_this_month": platform_commission_this_month,
        "platform_commission_this_year": platform_commission_this_year,
        "average_order_value": average_order_value,
        "quotation_acceptance_rate": quotation_acceptance_rate,
        "requirement_to_order_rate": requirement_to_order_rate,
        "order_completion_rate": order_completion_rate,
    }


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.scalars(select(User).order_by(User.created_at.desc()))
    return list(result)


async def delete_user(db: AsyncSession, user_id: str, admin_id: str) -> None:
    user = await db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found")
    if str(user.id) == str(admin_id):
        raise APIError("Admin accounts cannot delete themselves")
    await db.delete(user)
    await db.commit()


async def list_requirements(db: AsyncSession) -> list[Requirement]:
    result = await db.scalars(select(Requirement).options(selectinload(Requirement.customer)).order_by(Requirement.created_at.desc()))
    return list(result)


async def delete_requirement(db: AsyncSession, requirement_id: str) -> None:
    requirement = await db.get(Requirement, requirement_id)
    if not requirement:
        raise NotFoundError("Requirement not found")
    await db.delete(requirement)
    await db.commit()


async def list_quotations(db: AsyncSession) -> list[Quotation]:
    result = await db.scalars(
        select(Quotation)
        .options(selectinload(Quotation.requirement), selectinload(Quotation.creator))
        .order_by(Quotation.created_at.desc())
    )
    return list(result)


async def delete_quotation(db: AsyncSession, quotation_id: str) -> None:
    quotation = await db.get(Quotation, quotation_id)
    if not quotation:
        raise NotFoundError("Quotation not found")
    await db.delete(quotation)
    await db.commit()
