from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import service
from app.auth.dependencies import require_admin
from app.auth.schemas import APIResponse
from app.database.session import get_db
from app.quotations.schemas import QuotationRead
from app.requirements.schemas import RequirementRead
from app.users.schemas import UserResponse
from app.users.models import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=APIResponse)
async def admin_stats(db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    stats = await service.get_stats(db)
    return APIResponse(data={"stats": stats})


@router.get("/users", response_model=APIResponse)
async def list_users(db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    users = await service.list_users(db)
    items = [UserResponse.model_validate(item).model_dump(mode="json") for item in users]
    return APIResponse(data={"items": items})


@router.delete("/users/{user_id}", response_model=APIResponse)
async def delete_user(user_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    await service.delete_user(db, user_id, str(user.id))
    return APIResponse(message="User deleted", data={})


@router.get("/requirements", response_model=APIResponse)
async def list_requirements(db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    requirements = await service.list_requirements(db)
    items = []
    for item in requirements:
        payload = RequirementRead.model_validate(item).model_dump(mode="json")
        payload["customer_name"] = item.customer.full_name if item.customer else None
        payload["customer_email"] = item.customer.email if item.customer else None
        items.append(payload)
    return APIResponse(data={"items": items})


@router.delete("/requirements/{requirement_id}", response_model=APIResponse)
async def delete_requirement(requirement_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    await service.delete_requirement(db, requirement_id)
    return APIResponse(message="Requirement deleted", data={})


@router.get("/quotations", response_model=APIResponse)
async def list_quotations(db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    quotations = await service.list_quotations(db)
    items = []
    for item in quotations:
        payload = QuotationRead.model_validate(item).model_dump(mode="json")
        payload["requirement_title"] = item.requirement.title if item.requirement else None
        payload["creator_name"] = item.creator.full_name if item.creator else None
        items.append(payload)
    return APIResponse(data={"items": items})


@router.delete("/quotations/{quotation_id}", response_model=APIResponse)
async def delete_quotation(quotation_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    await service.delete_quotation(db, quotation_id)
    return APIResponse(message="Quotation deleted", data={})
