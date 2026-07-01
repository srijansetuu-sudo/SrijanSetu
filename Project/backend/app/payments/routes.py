from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user, require_customer
from app.auth.schemas import APIResponse
from app.database.session import get_db
from app.payments import service
from app.payments.schemas import PaymentCreate, PaymentRead, PaymentVerify
from app.users.models import User

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=APIResponse)
async def create_payment(payload: PaymentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    payment = await service.create_payment(db, user, payload)
    return APIResponse(message="Payment created", data={"payment": PaymentRead.model_validate(payment).model_dump(mode="json")})


@router.patch("/{payment_id}/verify", response_model=APIResponse)
async def verify_payment(payment_id: UUID, payload: PaymentVerify, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    payment = await service.verify_payment(db, user, payment_id, payload)
    return APIResponse(message="Payment verified", data={"payment": PaymentRead.model_validate(payment).model_dump(mode="json")})


@router.get("/history", response_model=APIResponse)
async def payment_history(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    payments = await service.history(db, user)
    items = [PaymentRead.model_validate(payment).model_dump(mode="json") for payment in payments]
    return APIResponse(data={"items": items})
