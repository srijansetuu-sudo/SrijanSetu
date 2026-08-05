from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.users.models import UserRole


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: UserRole
    avatar_url: str | None = None
    phone_number: str | None = None
    address_line: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    avatar_url: str | None = None
    phone_number: str = Field(min_length=7, max_length=30)
    address_line: str = Field(min_length=5)
    city: str = Field(min_length=2, max_length=120)
    state: str = Field(min_length=2, max_length=120)
    postal_code: str = Field(min_length=3, max_length=20)
