from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.notifications.models import Notification
from app.users.models import User, UserRole


def queue_notification(db: AsyncSession, user_id: UUID, title: str, body: str, action_url: str | None = None) -> Notification:
    notification = Notification(user_id=user_id, title=title, body=body, action_url=action_url)
    db.add(notification)
    return notification


async def queue_for_creators(
    db: AsyncSession,
    title: str,
    body: str,
    exclude_user_id: UUID | None = None,
    action_url: str | None = None,
) -> None:
    statement = select(User.id).where(User.role == UserRole.CREATOR, User.is_active.is_(True))
    if exclude_user_id:
        statement = statement.where(User.id != exclude_user_id)
    creator_ids = await db.scalars(statement)
    for creator_id in creator_ids:
        queue_notification(db, creator_id, title, body, action_url)


async def list_notifications(db: AsyncSession, user: User) -> list[Notification]:
    result = await db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()))
    return list(result)


async def mark_read(db: AsyncSession, user: User, notification_id: UUID) -> Notification:
    notification = await db.get(Notification, notification_id)
    if not notification:
        raise NotFoundError("Notification not found")
    if notification.user_id != user.id:
        raise ForbiddenError("You cannot modify this notification")
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification
