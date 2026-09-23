from datetime import UTC, datetime
from decimal import Decimal
from email.message import EmailMessage
import smtplib
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.contact.models import ContactCategory, ContactSubmission, ContactStatus
from app.core.config import settings
from app.core.exceptions import APIError, ForbiddenError, NotFoundError
from app.disputes.models import Dispute, DisputeResolution, DisputeStatus
from app.disputes.schemas import DisputeCreate, DisputeUpdate
from app.notifications.service import queue_notification
from app.orders.models import Order, OrderStatus
from app.requirements.models import RequirementStatus
from app.users.models import User, UserRole


def _money(value: Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _creator_receivable(order: Order) -> Decimal:
    return _money(order.total_amount) - _money(order.platform_commission)


def _participant_name(user: User | None, fallback: str) -> str:
    return user.full_name if user and user.full_name else fallback


def _participant_email(user: User | None) -> str:
    return user.email if user and user.email else "Not available"


def _order_title(order: Order) -> str:
    return order.requirement.title if order.requirement and order.requirement.title else str(order.id)


def dispute_payload(dispute: Dispute) -> dict:
    item = {
        "id": str(dispute.id),
        "order_id": str(dispute.order_id),
        "raised_by": str(dispute.raised_by) if dispute.raised_by else None,
        "reason": dispute.reason.value,
        "details": dispute.details,
        "evidence_url": dispute.evidence_url,
        "evidence_name": dispute.evidence_name,
        "status": dispute.status.value,
        "admin_note": dispute.admin_note,
        "resolution": dispute.resolution.value if dispute.resolution else None,
        "resolved_by": str(dispute.resolved_by) if dispute.resolved_by else None,
        "resolved_at": dispute.resolved_at.isoformat() if dispute.resolved_at else None,
        "contact_submission_id": str(dispute.contact_submission_id) if dispute.contact_submission_id else None,
        "created_at": dispute.created_at.isoformat() if dispute.created_at else None,
        "updated_at": dispute.updated_at.isoformat() if dispute.updated_at else None,
        "raised_by_name": _participant_name(dispute.raised_by_user, "User") if dispute.raised_by_user else None,
        "raised_by_email": _participant_email(dispute.raised_by_user) if dispute.raised_by_user else None,
        "resolved_by_name": _participant_name(dispute.resolved_by_user, "Admin") if dispute.resolved_by_user else None,
    }
    return item


async def _get_order_for_dispute(db: AsyncSession, user: User, order_id: UUID) -> Order:
    order = await db.scalar(
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.creator),
            selectinload(Order.requirement),
        )
        .where(Order.id == order_id)
    )
    if not order:
        raise NotFoundError("Order not found")
    if user.role != UserRole.ADMIN and user.id not in {order.customer_id, order.creator_id}:
        raise ForbiddenError("You cannot access this order")
    return order


def _send_dispute_email(order: Order, dispute: Dispute, raised_by: User) -> bool:
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        return False

    message = EmailMessage()
    message["Subject"] = f"SrijanSetu dispute raised for order {str(order.id)[:8]}"
    message["From"] = settings.smtp_from_email or settings.smtp_username
    message["To"] = settings.contact_recipient_email
    message["Reply-To"] = raised_by.email
    lines = [
        "A SrijanSetu order dispute has been raised.",
        "",
        f"Order ID: {order.id}",
        f"Requirement: {_order_title(order)}",
        f"Reason: {dispute.reason.value}",
        f"Raised by: {_participant_name(raised_by, 'User')} ({_participant_email(raised_by)})",
        f"Customer: {_participant_name(order.customer, 'Customer')} ({_participant_email(order.customer)})",
        f"Creator: {_participant_name(order.creator, 'Creator')} ({_participant_email(order.creator)})",
        f"Total amount: INR {_money(order.total_amount)}",
        f"Creator payout after commission: INR {_creator_receivable(order)}",
        "",
        "Details:",
        dispute.details,
    ]
    if dispute.evidence_url:
        lines.extend(["", f"Evidence: {dispute.evidence_name or dispute.evidence_url}", dispute.evidence_url])
    lines.extend(["", "Review the linked dispute/contact item in the admin dashboard."])
    message.set_content("\n".join(lines))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
    return True


async def _queue_admin_dispute_notifications(db: AsyncSession, order: Order, dispute: Dispute, raised_by: User, email_sent: bool) -> None:
    admin_ids = await db.scalars(select(User.id).where(User.role == UserRole.ADMIN, User.is_active.is_(True)))
    email_text = f"Email sent to {settings.contact_recipient_email}." if email_sent else "Email was not sent because SMTP is not configured or failed."
    for admin_id in admin_ids:
        queue_notification(
            db,
            admin_id,
            "Order dispute raised",
            f"{_participant_name(raised_by, 'A user')} raised a dispute for order {order.id}. {email_text}",
            f"/orders/{order.id}",
        )


def _add_contact_submission(db: AsyncSession, order: Order, dispute: Dispute, raised_by: User) -> ContactSubmission:
    evidence_text = f"\n\nEvidence: {dispute.evidence_name or dispute.evidence_url}\n{dispute.evidence_url}" if dispute.evidence_url else ""
    submission = ContactSubmission(
        user_id=raised_by.id,
        order_id=order.id,
        category=ContactCategory.ORDER_COMPLAINT,
        name=_participant_name(raised_by, "User"),
        email=_participant_email(raised_by),
        subject=f"Dispute raised for order {str(order.id)[:8]}",
        message="\n".join(
            [
                f"{_participant_name(raised_by, 'A user')} raised a dispute for this order.",
                "",
                f"Reason: {dispute.reason.value}",
                f"Order ID: {order.id}",
                f"Requirement: {_order_title(order)}",
                f"Customer: {_participant_name(order.customer, 'Customer')} ({_participant_email(order.customer)})",
                f"Creator: {_participant_name(order.creator, 'Creator')} ({_participant_email(order.creator)})",
                f"Total amount: INR {_money(order.total_amount)}",
                "",
                "Details:",
                dispute.details,
                evidence_text,
                "",
                "Please review the order workspace, messages, attachments, payment status, and delivery state before deciding the next action.",
            ]
        ).strip(),
    )
    db.add(submission)
    return submission


async def create_dispute(db: AsyncSession, user: User, order_id: UUID, payload: DisputeCreate) -> Dispute:
    order = await _get_order_for_dispute(db, user, order_id)
    if user.role not in {UserRole.CUSTOMER, UserRole.CREATOR}:
        raise ForbiddenError("Only the customer or creator can raise a dispute")
    if order.status not in {OrderStatus.ACTIVE, OrderStatus.DELIVERED}:
        raise APIError("Disputes can be raised only while the order is active or delivered")

    dispute = Dispute(
        order_id=order.id,
        raised_by=user.id,
        reason=payload.reason,
        details=payload.details.strip(),
        evidence_url=payload.evidence_url.strip() if payload.evidence_url else None,
        evidence_name=payload.evidence_name.strip() if payload.evidence_name else None,
    )
    db.add(dispute)
    await db.flush()

    submission = _add_contact_submission(db, order, dispute, user)
    await db.flush()
    dispute.contact_submission_id = submission.id

    order.status = OrderStatus.DISPUTED
    if order.requirement:
        order.requirement.status = RequirementStatus.IN_PROGRESS

    other_party_id = order.creator_id if user.id == order.customer_id else order.customer_id
    queue_notification(
        db,
        other_party_id,
        "Order dispute raised",
        f"{_participant_name(user, 'The other party')} raised a dispute. Admin has been notified; please keep communication in the workspace chat.",
        f"/orders/{order.id}",
    )
    queue_notification(
        db,
        user.id,
        "Dispute sent to admin",
        "Your dispute has been sent to the admin inbox. Please keep communication and evidence in the workspace.",
        f"/orders/{order.id}",
    )
    try:
        email_sent = _send_dispute_email(order, dispute, user)
    except Exception:
        email_sent = False
    await _queue_admin_dispute_notifications(db, order, dispute, user, email_sent)

    await db.commit()
    return await get_dispute(db, user, dispute.id)


async def get_dispute(db: AsyncSession, user: User, dispute_id: UUID) -> Dispute:
    dispute = await db.scalar(
        select(Dispute)
        .options(
            selectinload(Dispute.order),
            selectinload(Dispute.raised_by_user),
            selectinload(Dispute.resolved_by_user),
        )
        .where(Dispute.id == dispute_id)
    )
    if not dispute:
        raise NotFoundError("Dispute not found")
    order = dispute.order
    if user.role != UserRole.ADMIN and user.id not in {order.customer_id, order.creator_id}:
        raise ForbiddenError("You cannot access this dispute")
    return dispute


async def list_for_order(db: AsyncSession, user: User, order_id: UUID) -> list[Dispute]:
    await _get_order_for_dispute(db, user, order_id)
    result = await db.scalars(
        select(Dispute)
        .options(selectinload(Dispute.raised_by_user), selectinload(Dispute.resolved_by_user))
        .where(Dispute.order_id == order_id)
        .order_by(Dispute.created_at.desc())
    )
    return list(result)


async def update_dispute(db: AsyncSession, admin: User, dispute_id: UUID, payload: DisputeUpdate) -> Dispute:
    dispute = await db.scalar(
        select(Dispute)
        .options(selectinload(Dispute.order).selectinload(Order.requirement), selectinload(Dispute.raised_by_user))
        .where(Dispute.id == dispute_id)
    )
    if not dispute:
        raise NotFoundError("Dispute not found")

    values = payload.model_dump(exclude_unset=True)
    if "admin_note" in values and values["admin_note"] is not None:
        dispute.admin_note = values["admin_note"].strip()
    if "status" in values and values["status"] is not None:
        dispute.status = values["status"]
    if "resolution" in values and values["resolution"] is not None:
        dispute.resolution = values["resolution"]

    if dispute.status == DisputeStatus.RESOLVED:
        if not dispute.resolution:
            raise APIError("A resolution is required before resolving a dispute")
        dispute.resolved_by = admin.id
        dispute.resolved_at = dispute.resolved_at or datetime.now(UTC)

        if dispute.resolution in {DisputeResolution.RESUME_ORDER, DisputeResolution.OTHER}:
            dispute.order.status = OrderStatus.ACTIVE
            if dispute.order.requirement:
                dispute.order.requirement.status = RequirementStatus.IN_PROGRESS
        elif dispute.resolution == DisputeResolution.CANCEL_ORDER:
            dispute.order.status = OrderStatus.CANCELLED
            if dispute.order.requirement:
                dispute.order.requirement.status = RequirementStatus.CANCELLED

    elif dispute.status == DisputeStatus.IN_REVIEW:
        pass

    if dispute.contact_submission_id:
        submission = await db.get(ContactSubmission, dispute.contact_submission_id)
        if submission:
            if dispute.status == DisputeStatus.IN_REVIEW:
                submission.status = ContactStatus.IN_REVIEW
            elif dispute.status == DisputeStatus.RESOLVED:
                submission.status = ContactStatus.RESOLVED
            if dispute.admin_note:
                submission.admin_note = dispute.admin_note

    participant_ids = [dispute.order.customer_id, dispute.order.creator_id]
    for participant_id in participant_ids:
        queue_notification(
            db,
            participant_id,
            "Dispute updated",
            f"Admin updated the dispute status to {dispute.status.value}.",
            f"/orders/{dispute.order_id}",
        )

    await db.commit()
    return await get_dispute(db, admin, dispute.id)
