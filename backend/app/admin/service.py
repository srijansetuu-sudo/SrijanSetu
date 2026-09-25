from datetime import datetime

from sqlalchemy import delete, distinct, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import APIError, NotFoundError
from app.contact.models import ContactSubmission, ContactStatus
from app.creators.models import CreatorCategory, CreatorPortfolioPhoto, CreatorProfile, SavedCreator
from app.ai.models import AiGeneration
from app.disputes.models import Dispute
from app.messages.models import Message
from app.notifications.models import Notification
from app.orders.models import Order, OrderFile, OrderStatus
from app.payments.models import Payment, PaymentStatus
from app.payouts.models import Payout, PayoutAuditLog
from app.quotations.models import Quotation, QuotationStatus
from app.requirements.models import Requirement, RequirementReference, RequirementStatus
from app.reviews.models import Review
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
    result = await db.scalars(
        select(User)
        .options(
            selectinload(User.creator_profile).selectinload(CreatorProfile.categories),
            selectinload(User.creator_profile).selectinload(CreatorProfile.portfolio_photos),
        )
        .order_by(User.created_at.desc())
    )
    return list(result)


async def delete_user(db: AsyncSession, user_id: str, admin_id: str) -> None:
    user = await db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found")
    if str(user.id) == str(admin_id):
        raise APIError("Admin accounts cannot delete themselves")

    # Account removal is intentionally a hard delete.  The database schema has
    # historical foreign keys without cascading rules, so remove dependent
    # marketplace data in child-to-parent order in one transaction.
    order_ids = list(
        await db.scalars(
            select(Order.id).where(or_(Order.customer_id == user.id, Order.creator_id == user.id))
        )
    )
    requirement_ids = select(Requirement.id).where(Requirement.customer_id == user.id)
    quotation_filter = or_(Quotation.creator_id == user.id, Quotation.requirement_id.in_(requirement_ids))

    if order_ids:
        await db.execute(delete(PayoutAuditLog).where(PayoutAuditLog.order_id.in_(order_ids)))
        await db.execute(delete(Payout).where(Payout.order_id.in_(order_ids)))
        await db.execute(delete(ContactSubmission).where(ContactSubmission.order_id.in_(order_ids)))
        await db.execute(delete(Dispute).where(Dispute.order_id.in_(order_ids)))
        await db.execute(delete(Review).where(Review.order_id.in_(order_ids)))
        await db.execute(delete(Message).where(Message.order_id.in_(order_ids)))
        await db.execute(delete(OrderFile).where(OrderFile.order_id.in_(order_ids)))
        await db.execute(delete(Payment).where(Payment.order_id.in_(order_ids)))
        await db.execute(delete(Order).where(Order.id.in_(order_ids)))

    # These records can also exist without an order (for example a saved
    # creator, a draft quotation, or a notification).
    await db.execute(delete(PayoutAuditLog).where(PayoutAuditLog.performed_by == user.id))
    await db.execute(update(Payout).where(Payout.created_by == user.id).values(created_by=None))
    await db.execute(update(Payout).where(Payout.updated_by == user.id).values(updated_by=None))
    await db.execute(update(Dispute).where(Dispute.raised_by == user.id).values(raised_by=None))
    await db.execute(update(Dispute).where(Dispute.resolved_by == user.id).values(resolved_by=None))
    await db.execute(delete(ContactSubmission).where(ContactSubmission.user_id == user.id))
    await db.execute(delete(Review).where(or_(Review.reviewer_id == user.id, Review.creator_id == user.id)))
    await db.execute(delete(SavedCreator).where(or_(SavedCreator.customer_id == user.id, SavedCreator.creator_id == user.id)))
    await db.execute(delete(Quotation).where(quotation_filter))
    await db.execute(delete(RequirementReference).where(RequirementReference.requirement_id.in_(requirement_ids)))
    await db.execute(delete(Requirement).where(Requirement.customer_id == user.id))

    profile_ids = select(CreatorProfile.id).where(CreatorProfile.user_id == user.id)
    await db.execute(delete(CreatorCategory).where(CreatorCategory.creator_id.in_(profile_ids)))
    await db.execute(delete(CreatorPortfolioPhoto).where(CreatorPortfolioPhoto.creator_id.in_(profile_ids)))
    await db.execute(delete(CreatorProfile).where(CreatorProfile.user_id == user.id))
    await db.execute(delete(AiGeneration).where(AiGeneration.user_id == user.id))
    await db.execute(delete(Notification).where(Notification.user_id == user.id))
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))
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
