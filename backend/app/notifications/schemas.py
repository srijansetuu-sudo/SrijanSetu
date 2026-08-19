from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    body: str
    action_url: str | None = None
    is_read: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
