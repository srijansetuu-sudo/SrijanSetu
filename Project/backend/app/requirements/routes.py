from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user, require_creator, require_customer
from app.auth.schemas import APIResponse
from app.core.exceptions import ForbiddenError
from app.database.session import get_db
from app.requirements import service
from app.requirements.schemas import RequirementCreate, RequirementRead, RequirementReferenceCreate, RequirementReferenceRead, RequirementUpdate
from app.users.models import User

router = APIRouter(prefix="/requirements", tags=["requirements"])


@router.post("", response_model=APIResponse)
async def create_requirement(payload: RequirementCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    requirement = await service.create_requirement(db, user, payload)
    return APIResponse(message="Requirement created", data={"requirement": RequirementRead.model_validate(requirement).model_dump(mode="json")})


@router.get("", response_model=APIResponse)
async def list_requirements(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), db: AsyncSession = Depends(get_db), user: User = Depends(require_creator)):
    requirements = await service.list_requirements(db, limit, offset)
    items = [RequirementRead.model_validate(item).model_dump(mode="json") for item in requirements]
    return APIResponse(data={"items": items, "limit": limit, "offset": offset})


@router.get("/my", response_model=APIResponse)
async def my_requirements(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    requirements = await service.list_my_requirements(db, user)
    items = [RequirementRead.model_validate(item).model_dump(mode="json") for item in requirements]
    return APIResponse(data={"items": items})


@router.get("/{requirement_id}", response_model=APIResponse)
async def get_requirement(requirement_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    requirement = await service.get_requirement(db, requirement_id)
    if user.role.value == "CUSTOMER" and requirement.customer_id != user.id:
        raise ForbiddenError("Customers can only view their own requirements")
    return APIResponse(data={"requirement": RequirementRead.model_validate(requirement).model_dump(mode="json")})


@router.patch("/{requirement_id}", response_model=APIResponse)
async def update_requirement(requirement_id: UUID, payload: RequirementUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    requirement = await service.update_requirement(db, user, requirement_id, payload)
    return APIResponse(message="Requirement updated", data={"requirement": RequirementRead.model_validate(requirement).model_dump(mode="json")})


@router.delete("/{requirement_id}", response_model=APIResponse)
async def delete_requirement(requirement_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    await service.delete_requirement(db, user, requirement_id)
    return APIResponse(message="Requirement deleted", data={})


@router.post("/{requirement_id}/references", response_model=APIResponse)
async def add_reference(requirement_id: UUID, payload: RequirementReferenceCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    reference = await service.add_reference(db, user, requirement_id, payload)
    return APIResponse(message="Reference added", data={"reference": RequirementReferenceRead.model_validate(reference).model_dump(mode="json")})
