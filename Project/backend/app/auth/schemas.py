from typing import Any

from pydantic import BaseModel, Field

from app.core.schemas import BlankStringAsNoneModel
from app.users.models import UserRole
from app.users.schemas import UserResponse


class APIResponse(BaseModel):
    success: bool = True
    message: str = "Operation successful"
    data: Any = Field(default_factory=dict)


class SignupRequest(BlankStringAsNoneModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str
    password: str
    role: UserRole


class LoginRequest(BlankStringAsNoneModel):
    email: str
    password: str


class RefreshRequest(BlankStringAsNoneModel):
    refresh_token: str


class LogoutRequest(BlankStringAsNoneModel):
    refresh_token: str


class TokenData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenResponse(APIResponse):
    data: TokenData
