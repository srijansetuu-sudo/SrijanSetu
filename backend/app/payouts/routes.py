from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.database.session import get_db
# APIResponse not required here; keep routes minimal
from app.payouts import service
from app.payouts import schemas
from app.users.models import User

router = APIRouter(prefix="/admin", tags=["payouts"])


@router.post("/orders/{order_id}/payouts")
async def create_payout(order_id: UUID, payload: schemas.PayoutCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    payout = await service.create_payout(db, user, order_id, payload)
    return {"success": True, "message": "Payout recorded", "data": {"payout": schemas.PayoutRead.model_validate(payout).model_dump(mode="json")}}


@router.get("/payouts")
async def list_payouts(status: str | None = None, order_id: UUID | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    items = await service.list_payouts(db, status=status, order_id=order_id)
    return {"success": True, "data": {"items": [schemas.PayoutRead.model_validate(item).model_dump(mode="json") for item in items]}}


@router.get("/payouts/{payout_id}")
async def get_payout(payout_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    payout = await service.get_payout(db, payout_id)
    if not payout:
        return {"success": False, "message": "Payout not found", "data": {}}
    return {"success": True, "data": {"payout": schemas.PayoutRead.model_validate(payout).model_dump(mode="json")}}


@router.get("/orders/{order_id}/payout")
async def get_payout_for_order(order_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    payout = await service.get_payout_by_order(db, order_id)
    if not payout:
        return {"success": False, "message": "Payout not found", "data": {}}
    return {"success": True, "data": {"payout": schemas.PayoutRead.model_validate(payout).model_dump(mode="json")}}


@router.patch("/payouts/{payout_id}")
async def update_payout(payout_id: UUID, payload: schemas.PayoutUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    payout = await service.update_payout(db, user, payout_id, payload)
    return {"success": True, "message": "Payout updated", "data": {"payout": schemas.PayoutRead.model_validate(payout).model_dump(mode="json")}}
