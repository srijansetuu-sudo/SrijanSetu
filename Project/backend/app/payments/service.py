from datetime import UTC, datetime
from decimal import Decimal
import hmac
import hashlib
from uuid import UUID

from fastapi import status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import APIError, ForbiddenError, NotFoundError
from app.notifications.service import queue_notification
from app.orders.models import Order, OrderStatus
from app.payments.models import Payment, PaymentStatus
from app.payments.schemas import PaymentCreate, PaymentVerify
from app.users.models import User

WORKSPACE_ACTIVATION_DEPOSIT = Decimal("75.00")


def _money(value: Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _activation_deposit_for(order: Order) -> Decimal:
    total = _money(order.total_amount)
    return min(total, WORKSPACE_ACTIVATION_DEPOSIT)


def _remaining_creator_payment_for(order: Order) -> Decimal:
    return max(Decimal("0.00"), _money(order.total_amount) - _activation_deposit_for(order))


def _razorpay_configured() -> bool:
    return bool(settings.razorpay_key_id and settings.razorpay_key_secret)


def _should_bypass_gateway() -> bool:
    return settings.environment in {"local", "test"}


def _razorpay_client():
    if not _razorpay_configured():
        raise APIError("Razorpay keys are not configured")
    import razorpay

    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def _amount_to_paise(amount: Decimal) -> int:
    return int((amount * Decimal("100")).quantize(Decimal("1")))


def _verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> None:
    expected = hmac.new(
        settings.razorpay_key_secret.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise APIError("Invalid Razorpay payment signature")


def _create_gateway_order(order: Order, payload: PaymentCreate) -> str:
    if _should_bypass_gateway() or not _razorpay_configured():
        return f"order_local_{str(order.id).replace('-', '')[:20]}"
    try:
        razorpay_order = _razorpay_client().order.create({
            "amount": _amount_to_paise(payload.amount),
            "currency": "INR",
            "receipt": f"order_{str(order.id)[:32]}",
            "notes": {
                "app_order_id": str(order.id),
                "app_customer_id": str(order.customer_id),
                "payment_method": payload.payment_method or "",
            },
        })
    except Exception as exc:
        status_code = getattr(exc, "status_code", None)
        detail = getattr(exc, "message", None) or str(exc)
        if status_code == status.HTTP_401_UNAUTHORIZED:
            raise APIError(f"Razorpay authentication failed: {detail}", status_code=status.HTTP_401_UNAUTHORIZED) from exc
        raise APIError(f"Could not create Razorpay order: {detail}", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR) from exc
    return razorpay_order["id"]


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
    if _amount_to_paise(payload.amount) < 100:
        raise APIError("Minimum payment amount is 100 paise")
    payment_amount = _money(payload.amount)
    allowed_amounts = {
        _money(order.total_amount),
        _activation_deposit_for(order),
        _remaining_creator_payment_for(order),
    }
    if payment_amount not in allowed_amounts:
        raise APIError("Payment amount must match the order total, advance deposit, or remaining project amount")
    existing_success = await db.scalar(
        select(Payment).where(
            Payment.order_id == order.id,
            Payment.amount == payment_amount,
            Payment.payment_method == payload.payment_method,
            Payment.payment_status == PaymentStatus.SUCCESS,
        )
    )
    if existing_success:
        raise APIError("This payment has already been completed")

    payment = Payment(**payload.model_dump(), razorpay_order_id=_create_gateway_order(order, payload))
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
    if payload.status == PaymentStatus.SUCCESS:
        if not payload.razorpay_payment_id:
            raise APIError("Razorpay payment id is required")
        if not payment.razorpay_order_id:
            raise APIError("Payment does not have a Razorpay order")
        if payload.razorpay_order_id and payload.razorpay_order_id != payment.razorpay_order_id:
            raise APIError("Razorpay order mismatch")
        if not _should_bypass_gateway() and _razorpay_configured():
            if not payload.razorpay_signature:
                raise APIError("Razorpay payment signature is required")
            _verify_razorpay_signature(payment.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature)
    payment.razorpay_payment_id = payload.razorpay_payment_id
    payment.payment_status = payload.status
    if payload.status == PaymentStatus.SUCCESS and Decimal(str(payment.amount)) == WORKSPACE_ACTIVATION_DEPOSIT and order.status == OrderStatus.PENDING:
        order.status = OrderStatus.ACTIVE
        order.started_at = datetime.now(UTC)
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
