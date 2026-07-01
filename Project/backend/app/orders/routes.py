from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user, require_creator
from app.auth.schemas import APIResponse
from app.database.session import get_db
from app.orders import service
from app.orders.schemas import OrderFileCreate, OrderFileRead, OrderRead, OrderStatusUpdate
from app.users.models import User

router = APIRouter(prefix="/orders", tags=["orders"])


def _participant_payload(user: User | None) -> dict | None:
    if not user:
        return None
    profile = user.__dict__.get("creator_profile")
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "creator_profile_id": str(profile.id) if profile else None,
        "brand_name": profile.brand_name if profile else None,
    }


def _order_payload(order) -> dict:
    item = OrderRead.model_validate(order).model_dump(mode="json")
    item["requirement_title"] = order.requirement.title if getattr(order, "requirement", None) else None
    item["customer"] = _participant_payload(getattr(order, "customer", None))
    item["creator"] = _participant_payload(getattr(order, "creator", None))
    return item


@router.get("", response_model=APIResponse)
async def list_orders(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    orders = await service.list_orders(db, user)
    items = [_order_payload(order) for order in orders]
    return APIResponse(data={"items": items})


@router.get("/{order_id}", response_model=APIResponse)
async def get_order(order_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    order = await service.get_order(db, user, order_id)
    return APIResponse(data={"order": _order_payload(order)})


@router.patch("/{order_id}/status", response_model=APIResponse)
async def update_status(order_id: UUID, payload: OrderStatusUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_creator)):
    order = await service.update_status(db, user, order_id, payload)
    return APIResponse(message="Order status updated", data={"order": _order_payload(order)})


@router.post("/{order_id}/files", response_model=APIResponse)
async def add_file(order_id: UUID, payload: OrderFileCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_creator)):
    order_file = await service.add_file(db, user, order_id, payload)
    return APIResponse(message="Order file added", data={"file": OrderFileRead.model_validate(order_file).model_dump(mode="json")})


@router.get("/{order_id}/files", response_model=APIResponse)
async def list_files(order_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    files = await service.list_files(db, user, order_id)
    items = [OrderFileRead.model_validate(item).model_dump(mode="json") for item in files]
    return APIResponse(data={"items": items})
