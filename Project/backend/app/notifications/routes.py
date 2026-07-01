from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.auth.schemas import APIResponse
from app.database.session import get_db
from app.notifications import service
from app.notifications.schemas import NotificationRead
from app.users.models import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=APIResponse)
async def list_notifications(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    notifications = await service.list_notifications(db, user)
    items = [NotificationRead.model_validate(notification).model_dump(mode="json") for notification in notifications]
    return APIResponse(data={"items": items})


@router.patch("/{notification_id}/read", response_model=APIResponse)
async def mark_read(notification_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    notification = await service.mark_read(db, user, notification_id)
    return APIResponse(message="Notification marked read", data={"notification": NotificationRead.model_validate(notification).model_dump(mode="json")})
