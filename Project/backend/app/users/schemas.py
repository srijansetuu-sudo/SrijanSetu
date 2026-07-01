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
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    avatar_url: str | None = None
