from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.core.schemas import BlankStringAsNoneModel


class MessageCreate(BlankStringAsNoneModel):
    order_id: UUID
    message: str | None = None
    attachment_url: str | None = Field(default=None, max_length=7000000)
    attachment_type: str | None = Field(default=None, max_length=20)
    attachment_name: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def require_text_or_attachment(self):
        if self.message is not None:
            self.message = self.message.strip()
        if self.attachment_url is not None:
            self.attachment_url = self.attachment_url.strip()
        if not (self.message or self.attachment_url):
            raise ValueError("Message or attachment is required")
        return self


class MessageRead(BaseModel):
    id: UUID
    order_id: UUID
    sender_id: UUID
    message: str
    attachment_url: str | None = None
    attachment_type: str | None = None
    attachment_name: str | None = None
    sender_name: str | None = None
    sender_avatar_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
