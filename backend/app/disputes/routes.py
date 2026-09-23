from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user, require_admin
from app.auth.schemas import APIResponse
from app.database.session import get_db
from app.disputes import service
from app.disputes.schemas import DisputeCreate, DisputeUpdate
from app.users.models import User

router = APIRouter(tags=["disputes"])


@router.post("/orders/{order_id}/disputes", response_model=APIResponse)
async def create_dispute(order_id: UUID, payload: DisputeCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    dispute = await service.create_dispute(db, user, order_id, payload)
    return APIResponse(message="Dispute raised", data={"dispute": service.dispute_payload(dispute)})


@router.get("/orders/{order_id}/disputes", response_model=APIResponse)
async def list_order_disputes(order_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    disputes = await service.list_for_order(db, user, order_id)
    return APIResponse(data={"items": [service.dispute_payload(dispute) for dispute in disputes]})


@router.patch("/admin/disputes/{dispute_id}", response_model=APIResponse)
async def update_dispute(dispute_id: UUID, payload: DisputeUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    dispute = await service.update_dispute(db, user, dispute_id, payload)
    return APIResponse(message="Dispute updated", data={"dispute": service.dispute_payload(dispute)})

