from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenError, NotFoundError
from app.messages.models import Message
from app.messages.schemas import MessageCreate
from app.notifications.service import queue_notification
from app.orders.models import Order
from app.users.models import User


async def _authorize_order(db: AsyncSession, user: User, order_id: UUID) -> Order:
    order = await db.get(Order, order_id)
    if not order:
        raise NotFoundError("Order not found")
    if user.role.value != "ADMIN" and user.id not in {order.customer_id, order.creator_id}:
        raise ForbiddenError("You cannot access messages for this order")
    return order


async def send_message(db: AsyncSession, user: User, payload: MessageCreate) -> Message:
    order = await _authorize_order(db, user, payload.order_id)
    message = Message(
        order_id=payload.order_id,
        sender_id=user.id,
        message=(payload.message or "").strip(),
        attachment_url=payload.attachment_url,
        attachment_type=payload.attachment_type,
        attachment_name=payload.attachment_name,
    )
    db.add(message)
    recipient_ids = {order.customer_id, order.creator_id} - {user.id}
    for recipient_id in recipient_ids:
        queue_notification(
            db,
            recipient_id,
            "New message",
            f"{user.full_name} sent you a message. Open the workspace to reply.",
            f"/orders/{order.id}",
        )
    await db.commit()
    await db.refresh(message)
    message.sender = user
    return message


async def order_messages(db: AsyncSession, user: User, order_id: UUID) -> list[Message]:
    await _authorize_order(db, user, order_id)
    result = await db.scalars(
        select(Message)
        .options(selectinload(Message.sender))
        .where(Message.order_id == order_id)
        .order_by(Message.created_at.asc())
    )
    return list(result)
