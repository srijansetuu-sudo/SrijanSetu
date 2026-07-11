from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user, require_customer
from app.auth.schemas import APIResponse
from app.database.session import get_db
from app.payments import service
from app.payments.schemas import PaymentCreate, PaymentRead, PaymentVerify, PaymentVerifyRequest
from app.users.models import User

router = APIRouter(prefix="/payments", tags=["payments"])


def _payment_payload(payment):
    item = PaymentRead.model_validate(payment).model_dump(mode="json")
    return {
        "payment": item,
        "payment_id": item["id"],
        "order_id": item["razorpay_order_id"],
        "amount": item["amount"],
        "currency": "INR",
    }


@router.post("", response_model=APIResponse)
async def create_payment(payload: PaymentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    payment = await service.create_payment(db, user, payload)
    return APIResponse(message="Payment created", data={"payment": PaymentRead.model_validate(payment).model_dump(mode="json")})


@router.post("/create-order", response_model=APIResponse)
async def create_order(payload: PaymentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    payment = await service.create_payment(db, user, payload)
    return APIResponse(message="Razorpay order created", data=_payment_payload(payment))


@router.patch("/{payment_id}/verify", response_model=APIResponse)
async def verify_payment(payment_id: UUID, payload: PaymentVerify, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    payment = await service.verify_payment(db, user, payment_id, payload)
    return APIResponse(message="Payment verified", data={"payment": PaymentRead.model_validate(payment).model_dump(mode="json")})


@router.post("/verify-payment", response_model=APIResponse)
async def verify_payment_alias(payload: PaymentVerifyRequest, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    payment_id = payload.payment_id
    verify_payload = PaymentVerify(**payload.model_dump(exclude={"payment_id"}))
    payment = await service.verify_payment(db, user, payment_id, verify_payload)
    return APIResponse(message="Payment verified", data={"payment": PaymentRead.model_validate(payment).model_dump(mode="json")})


@router.get("/history", response_model=APIResponse)
async def payment_history(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    payments = await service.history(db, user)
    items = [PaymentRead.model_validate(payment).model_dump(mode="json") for payment in payments]
    return APIResponse(data={"items": items})
