from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contact.models import ContactSubmission, ContactStatus
from app.contact.schemas import ContactSubmissionCreate, ContactSubmissionUpdate
from app.core.exceptions import ForbiddenError, NotFoundError
from app.orders.models import Order
from app.users.models import User


async def create_submission(db: AsyncSession, payload: ContactSubmissionCreate, user: User | None = None) -> ContactSubmission:
    order = None
    if payload.order_id:
        if not user:
            raise ForbiddenError("Login is required to raise an order complaint")
        order = await db.get(Order, payload.order_id)
        if not order:
            raise NotFoundError("Order not found")
        if user.id not in {order.customer_id, order.creator_id}:
            raise ForbiddenError("You cannot raise a complaint for this order")

    submission = ContactSubmission(
        user_id=user.id if user else None,
        order_id=order.id if order else None,
        category=payload.category,
        name=payload.name.strip(),
        email=str(payload.email).strip().lower(),
        subject=payload.subject.strip(),
        message=payload.message.strip(),
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


async def list_submissions(db: AsyncSession, status: ContactStatus | None = None) -> list[ContactSubmission]:
    statement = select(ContactSubmission).order_by(ContactSubmission.created_at.desc())
    if status:
        statement = statement.where(ContactSubmission.status == status)
    result = await db.scalars(statement)
    return list(result)


async def update_submission(db: AsyncSession, submission_id: UUID, payload: ContactSubmissionUpdate) -> ContactSubmission:
    submission = await db.get(ContactSubmission, submission_id)
    if not submission:
        raise NotFoundError("Contact submission not found")
    values = payload.model_dump(exclude_unset=True)
    for key, value in values.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(submission, key, value)
    await db.commit()
    await db.refresh(submission)
    return submission
