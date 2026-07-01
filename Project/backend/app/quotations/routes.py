from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user, require_creator, require_customer
from app.auth.schemas import APIResponse
from app.database.session import get_db
from app.orders.schemas import OrderRead
from app.quotations import service
from app.quotations.schemas import QuotationCreate, QuotationRead
from app.users.models import User

router = APIRouter(tags=["quotations"])


@router.post("/quotations", response_model=APIResponse)
async def create_quotation(payload: QuotationCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_creator)):
    quotation = await service.create_quotation(db, user, payload)
    return APIResponse(message="Quotation created", data={"quotation": QuotationRead.model_validate(quotation).model_dump(mode="json")})


@router.get("/requirements/{requirement_id}/quotations", response_model=APIResponse)
async def list_quotations(requirement_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    quotations = await service.list_for_requirement(db, user, requirement_id)
    items = [QuotationRead.model_validate(item).model_dump(mode="json") for item in quotations]
    return APIResponse(data={"items": items})


@router.get("/quotations/my", response_model=APIResponse)
async def my_quotations(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    quotations = await service.list_my_quotations(db, user)
    items = [QuotationRead.model_validate(item).model_dump(mode="json") for item in quotations]
    return APIResponse(data={"items": items})


@router.post("/quotations/{quotation_id}/accept", response_model=APIResponse)
async def accept_quotation(quotation_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    order = await service.accept_quotation(db, user, quotation_id)
    return APIResponse(message="Quotation accepted", data={"order": OrderRead.model_validate(order).model_dump(mode="json")})


@router.post("/quotations/{quotation_id}/reject", response_model=APIResponse)
async def reject_quotation(quotation_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    quotation = await service.reject_quotation(db, user, quotation_id)
    return APIResponse(message="Quotation rejected", data={"quotation": QuotationRead.model_validate(quotation).model_dump(mode="json")})


@router.delete("/quotations/{quotation_id}", response_model=APIResponse)
async def delete_quotation(quotation_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_creator)):
    await service.delete_quotation(db, user, quotation_id)
    return APIResponse(message="Quotation deleted", data={})
