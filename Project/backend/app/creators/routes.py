from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user, require_creator, require_customer
from app.auth.schemas import APIResponse
from app.creators import service
from app.creators.schemas import CreatorProfileRead, CreatorProfileUpsert, SavedCreatorRead
from app.database.session import get_db
from app.users.models import User

router = APIRouter(prefix="/creators", tags=["creators"])


@router.put("/profile", response_model=APIResponse)
async def upsert_profile(payload: CreatorProfileUpsert, db: AsyncSession = Depends(get_db), user: User = Depends(require_creator)):
    profile = await service.upsert_profile(db, user, payload)
    return APIResponse(message="Creator profile saved", data={"creator": CreatorProfileRead.model_validate(profile).model_dump(mode="json")})


@router.get("/profile/me", response_model=APIResponse)
async def my_profile(db: AsyncSession = Depends(get_db), user: User = Depends(require_creator)):
    profile = await service.get_profile_by_user(db, user)
    return APIResponse(data={"creator": CreatorProfileRead.model_validate(profile).model_dump(mode="json")})


@router.get("", response_model=APIResponse)
async def list_profiles(
    search: str | None = Query(None, max_length=120),
    category: str | None = Query(None, max_length=120),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    profiles = await service.list_profiles(db, limit, offset, search=search, category=category)
    items = [CreatorProfileRead.model_validate(profile).model_dump(mode="json") for profile in profiles]
    return APIResponse(data={"items": items, "limit": limit, "offset": offset})


@router.get("/saved/me", response_model=APIResponse)
async def list_saved_creators(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    saved = await service.list_saved_creators(db, user)
    items = []
    for item in saved:
        saved_creator = SavedCreatorRead.model_validate(item).model_dump(mode="json")
        saved_creator["creator"] = (
            CreatorProfileRead.model_validate(item.creator_profile).model_dump(mode="json")
            if item.creator_profile
            else None
        )
        items.append(saved_creator)
    return APIResponse(data={"items": items})


@router.get("/{creator_id}", response_model=APIResponse)
async def get_profile(creator_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    profile = await service.get_profile(db, creator_id)
    return APIResponse(data={"creator": CreatorProfileRead.model_validate(profile).model_dump(mode="json")})


@router.post("/{creator_id}/save", response_model=APIResponse)
async def save_creator(creator_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    saved = await service.save_creator(db, user, creator_id)
    return APIResponse(message="Creator saved", data={"saved_creator": SavedCreatorRead.model_validate(saved).model_dump(mode="json")})


@router.delete("/saved/{creator_user_id}", response_model=APIResponse)
async def remove_saved_creator(creator_user_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    await service.remove_saved_creator(db, user, creator_user_id)
    return APIResponse(message="Saved creator removed", data={})
