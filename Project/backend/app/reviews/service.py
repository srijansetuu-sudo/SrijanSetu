from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import APIError, ForbiddenError, NotFoundError
from app.notifications.service import queue_notification
from app.orders.models import Order, OrderStatus
from app.reviews.models import Review
from app.reviews.schemas import ReviewCreate
from app.users.models import User


async def create_review(db: AsyncSession, user: User, payload: ReviewCreate) -> Review:
    order = await db.get(Order, payload.order_id)
    if not order:
        raise NotFoundError("Order not found")
    if order.customer_id != user.id:
        raise ForbiddenError("Only the customer can review this order")
    if order.status != OrderStatus.COMPLETED:
        raise APIError("Only completed orders can be reviewed")
    existing = await db.scalar(select(Review).where(Review.order_id == payload.order_id))
    if existing:
        raise APIError("Order already reviewed")
    review = Review(order_id=order.id, reviewer_id=user.id, creator_id=order.creator_id, rating=payload.rating, comment=payload.comment)
    db.add(review)
    queue_notification(
        db,
        order.creator_id,
        "New review received",
        f"{user.full_name} left you a {payload.rating}-star review.",
        "/dashboard/creator/profile",
    )
    await db.commit()
    await db.refresh(review)
    return review


async def creator_reviews(db: AsyncSession, creator_id: UUID) -> list[Review]:
    result = await db.scalars(select(Review).where(Review.creator_id == creator_id).order_by(Review.created_at.desc()))
    return list(result)
