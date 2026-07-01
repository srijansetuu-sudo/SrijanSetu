from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import APIError, ForbiddenError, NotFoundError
from app.notifications.service import queue_notification
from app.orders.models import Order, OrderFile, OrderStatus
from app.orders.schemas import OrderFileCreate, OrderStatusUpdate
from app.users.models import User


async def _get_authorized_order(db: AsyncSession, user: User, order_id: UUID) -> Order:
    order = await db.scalar(
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.creator).selectinload(User.creator_profile),
            selectinload(Order.requirement),
        )
        .where(Order.id == order_id)
    )
    if not order:
        raise NotFoundError("Order not found")
    if user.role.value != "ADMIN" and user.id not in {order.customer_id, order.creator_id}:
        raise ForbiddenError("You cannot access this order")
    return order


async def list_orders(db: AsyncSession, user: User) -> list[Order]:
    statement = (
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.creator).selectinload(User.creator_profile),
            selectinload(Order.requirement),
        )
        .order_by(Order.updated_at.desc())
    )
    if user.role.value != "ADMIN":
        statement = statement.where(or_(Order.customer_id == user.id, Order.creator_id == user.id))
    result = await db.scalars(statement)
    return list(result)


async def get_order(db: AsyncSession, user: User, order_id: UUID) -> Order:
    return await _get_authorized_order(db, user, order_id)


async def update_status(db: AsyncSession, user: User, order_id: UUID, payload: OrderStatusUpdate) -> Order:
    order = await _get_authorized_order(db, user, order_id)
    if user.id != order.creator_id:
        raise ForbiddenError("Only the assigned creator can update order status")
    allowed_transitions = {
        OrderStatus.PENDING: {OrderStatus.ACTIVE, OrderStatus.CANCELLED},
        OrderStatus.ACTIVE: {OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.DISPUTED},
        OrderStatus.DELIVERED: {OrderStatus.COMPLETED, OrderStatus.DISPUTED},
        OrderStatus.DISPUTED: {OrderStatus.ACTIVE, OrderStatus.CANCELLED},
        OrderStatus.COMPLETED: set(),
        OrderStatus.CANCELLED: set(),
    }
    if payload.status == order.status:
        return order
    if payload.status not in allowed_transitions[order.status]:
        raise APIError(f"Cannot change order status from {order.status.value} to {payload.status.value}")
    order.status = payload.status
    if payload.status == OrderStatus.ACTIVE and not order.started_at:
        order.started_at = datetime.now(UTC)
    if payload.status == OrderStatus.COMPLETED:
        order.completed_at = datetime.now(UTC)
    queue_notification(
        db,
        order.customer_id,
        "Order status updated",
        f"{user.full_name} changed your order status to {payload.status.value}.",
        f"/orders/{order.id}",
    )
    await db.commit()
    return await _get_authorized_order(db, user, order_id)


async def add_file(db: AsyncSession, user: User, order_id: UUID, payload: OrderFileCreate) -> OrderFile:
    order = await _get_authorized_order(db, user, order_id)
    if user.id != order.creator_id:
        raise ForbiddenError("Only the assigned creator can upload order files")
    order_file = OrderFile(order_id=order.id, uploaded_by=user.id, **payload.model_dump())
    db.add(order_file)
    queue_notification(
        db,
        order.customer_id,
        "New order file uploaded",
        f"{user.full_name} uploaded a {payload.file_type} file for your order.",
        f"/orders/{order.id}",
    )
    await db.commit()
    await db.refresh(order_file)
    return order_file


async def list_files(db: AsyncSession, user: User, order_id: UUID) -> list[OrderFile]:
    await _get_authorized_order(db, user, order_id)
    result = await db.scalars(select(OrderFile).where(OrderFile.order_id == order_id).order_by(OrderFile.created_at.desc()))
    return list(result)
