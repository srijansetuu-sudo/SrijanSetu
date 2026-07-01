from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.schemas import BlankStringAsNoneModel
from app.payments.models import PaymentStatus


class PaymentCreate(BlankStringAsNoneModel):
    order_id: UUID
    amount: Decimal = Field(ge=0)
    payment_method: str | None = Field(default=None, max_length=80)


class PaymentVerify(BlankStringAsNoneModel):
    razorpay_payment_id: str = Field(min_length=1)
    status: PaymentStatus = PaymentStatus.SUCCESS


class PaymentRead(BaseModel):
    id: UUID
    order_id: UUID
    razorpay_payment_id: str | None
    amount: Decimal
    payment_status: PaymentStatus
    payment_method: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
