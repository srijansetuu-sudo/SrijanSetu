from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import APIError, NotFoundError
from app.orders.models import Order, OrderStatus
from app.payments.models import Payment, PaymentStatus
from app.payouts.models import Payout, PayoutAuditLog, PayoutStatus
from app.payouts import schemas
from app.users.models import User
from app.core.config import settings


def _money(value: Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


async def create_payout(db: AsyncSession, admin_user: User, order_id: UUID, payload: schemas.PayoutCreate) -> Payout:
    order = await db.get(Order, order_id)
    if not order:
        raise NotFoundError("Order not found")

    # Verify order eligibility: must be completed and have successful full payment
    if getattr(order, "payout_ready_at", None) is None and order.status != OrderStatus.COMPLETED:
        raise APIError("Order is not ready for payout")

    # Ensure a successful payment exists for the full order amount
    payment = await db.scalar(
        select(Payment).where(
            Payment.order_id == order.id,
            Payment.amount == order.total_amount,
            Payment.payment_status == PaymentStatus.SUCCESS,
        )
    )
    if not payment:
        raise APIError("Order does not have a successful payment for the full amount")

    # Compute snapshots
    amount = _money(order.total_amount)
    commission_amount = _money(order.platform_commission)
    creator_receivable = _money(amount - commission_amount)
    if creator_receivable < Decimal("0.00"):
        raise APIError("Invalid creator receivable amount")

    # Create payout within a transaction and handle unique constraint collisions
    payout = Payout(
        order_id=order.id,
        status=PayoutStatus.PENDING,
        transaction_id=payload.transaction_id,
        payment_method=payload.payment_method,
        remarks=payload.remarks,
        amount=amount,
        commission_amount=commission_amount,
        creator_receivable=creator_receivable,
        payout_date=datetime.now(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        created_by=admin_user.id,
        updated_by=admin_user.id,
    )
    db.add(payout)
    try:
        await db.flush()
    except IntegrityError as exc:
        # map unique violations to conflict
        raise APIError("Payout conflict or duplicate transaction", status_code=409) from exc

    # record audit log
    audit = PayoutAuditLog(
        payout_id=payout.id,
        order_id=order.id,
        event_type="CREATED",
        event_data=str({
            "transaction_id": payload.transaction_id,
            "payment_method": payload.payment_method,
            "remarks": payload.remarks,
            "amount": str(amount),
            "commission_amount": str(commission_amount),
            "creator_receivable": str(creator_receivable),
        }),
        performed_by=admin_user.id,
    )
    # ensure timestamp fields exist for audit (migration didn't set server defaults)
    audit.created_at = datetime.utcnow()
    audit.updated_at = datetime.utcnow()
    db.add(audit)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError("Payout conflict or duplicate transaction", status_code=409) from exc
    await db.refresh(payout)
    return payout


async def get_payout_by_order(db: AsyncSession, order_id: UUID) -> Payout | None:
    return await db.scalar(select(Payout).where(Payout.order_id == order_id))


async def get_payout(db: AsyncSession, payout_id: UUID) -> Payout | None:
    return await db.get(Payout, payout_id)


async def list_payouts(db: AsyncSession, *, status: str | None = None, order_id: UUID | None = None):
    stmt = select(Payout).order_by(Payout.created_at.desc())
    if status:
        stmt = stmt.where(Payout.status == status)
    if order_id:
        stmt = stmt.where(Payout.order_id == order_id)
    result = await db.scalars(stmt)
    return list(result)


async def update_payout(db: AsyncSession, admin_user: User, payout_id: UUID, payload: schemas.PayoutUpdate) -> Payout:
    payout = await db.get(Payout, payout_id)
    if not payout:
        raise NotFoundError("Payout not found")
    changed = {}
    if payload.remarks is not None and payload.remarks != payout.remarks:
        payout.remarks = payload.remarks
        changed["remarks"] = payload.remarks
    if payload.status is not None and payload.status != payout.status:
        payout.status = payload.status
        changed["status"] = payload.status
    payout.updated_by = admin_user.id
    db.add(payout)
    audit = PayoutAuditLog(
        payout_id=payout.id,
        order_id=payout.order_id,
        event_type="UPDATED",
        event_data=str(changed) if changed else None,
        performed_by=admin_user.id,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(payout)
    return payout
