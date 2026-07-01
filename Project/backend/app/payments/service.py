from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import APIError, ForbiddenError, NotFoundError
from app.notifications.service import queue_notification
from app.orders.models import Order
from app.payments.models import Payment, PaymentStatus
from app.payments.schemas import PaymentCreate, PaymentVerify
from app.users.models import User


async def _get_order_for_payment(db: AsyncSession, user: User, order_id: UUID) -> Order:
    order = await db.get(Order, order_id)
    if not order:
        raise NotFoundError("Order not found")
    if user.role.value != "ADMIN" and user.id not in {order.customer_id, order.creator_id}:
        raise ForbiddenError("You cannot access payments for this order")
    return order


async def create_payment(db: AsyncSession, user: User, payload: PaymentCreate) -> Payment:
    order = await _get_order_for_payment(db, user, payload.order_id)
    if user.id != order.customer_id:
        raise ForbiddenError("Only the order customer can create payments")
    if payload.amount != order.total_amount:
        raise APIError("Payment amount must match order total")
    existing_success = await db.scalar(
        select(Payment).where(Payment.order_id == order.id, Payment.payment_status == PaymentStatus.SUCCESS)
    )
    if existing_success:
        raise APIError("Order is already paid")
    payment = Payment(**payload.model_dump())
    db.add(payment)
    queue_notification(
        db,
        order.creator_id,
        "Payment created",
        f"{user.full_name} created a payment for order {order.id}.",
        f"/orders/{order.id}",
    )
    await db.commit()
    await db.refresh(payment)
    return payment


async def verify_payment(db: AsyncSession, user: User, payment_id: UUID, payload: PaymentVerify) -> Payment:
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise NotFoundError("Payment not found")
    order = await _get_order_for_payment(db, user, payment.order_id)
    if user.role.value != "ADMIN" and user.id != order.customer_id:
        raise ForbiddenError("Only the order customer can verify payments")
    allowed_transitions = {
        PaymentStatus.PENDING: {PaymentStatus.SUCCESS, PaymentStatus.FAILED},
        PaymentStatus.FAILED: {PaymentStatus.SUCCESS},
        PaymentStatus.SUCCESS: {PaymentStatus.REFUNDED},
        PaymentStatus.REFUNDED: set(),
    }
    if payload.status == payment.payment_status:
        return payment
    if payload.status not in allowed_transitions[payment.payment_status]:
        raise APIError(f"Cannot change payment status from {payment.payment_status.value} to {payload.status.value}")
    old_status = payment.payment_status
    payment.razorpay_payment_id = payload.razorpay_payment_id
    payment.payment_status = payload.status
    queue_notification(
        db,
        order.creator_id,
        "Payment status updated",
        f"Payment for order {order.id} changed from {old_status.value} to {payload.status.value}.",
        f"/orders/{order.id}",
    )
    await db.commit()
    await db.refresh(payment)
    return payment


async def history(db: AsyncSession, user: User) -> list[Payment]:
    statement = select(Payment).join(Order).order_by(Payment.created_at.desc())
    if user.role.value != "ADMIN":
        statement = statement.where(or_(Order.customer_id == user.id, Order.creator_id == user.id))
    result = await db.scalars(statement)
    return list(result)
