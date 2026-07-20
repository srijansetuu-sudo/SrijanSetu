from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.contact.models import ContactCategory, ContactStatus
from app.core.schemas import BlankStringAsNoneModel
from app.auth.utils import EMAIL_REGEX


class ContactSubmissionCreate(BlankStringAsNoneModel):
    category: ContactCategory
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(max_length=255)
    subject: str = Field(min_length=4, max_length=180)
    message: str = Field(min_length=10, max_length=3000)
    order_id: UUID | None = None

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        email = value.strip().lower()
        if not EMAIL_REGEX.match(email):
            raise ValueError("Invalid email format")
        return email

    @model_validator(mode="after")
    def complaint_requires_order(self):
        if self.category == ContactCategory.ORDER_COMPLAINT and not self.order_id:
            raise ValueError("Order complaints must include an order")
        return self


class ContactSubmissionUpdate(BlankStringAsNoneModel):
    status: ContactStatus | None = None
    admin_note: str | None = Field(default=None, max_length=3000)


class ContactSubmissionRead(BaseModel):
    id: UUID
    user_id: UUID | None
    order_id: UUID | None
    category: ContactCategory
    status: ContactStatus
    name: str
    email: str
    subject: str
    message: str
    admin_note: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
