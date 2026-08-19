from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.auth.schemas import APIResponse
from app.database.session import get_db
from app.users import service
from app.users.models import User
from app.users.schemas import UserProfileUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.put("/me", response_model=APIResponse)
async def update_me(payload: UserProfileUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    updated = await service.update_profile(db, user, payload)
    return APIResponse(message="Profile updated", data={"user": UserResponse.model_validate(updated).model_dump(mode="json")})
