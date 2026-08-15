from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.schemas import BlankStringAsNoneModel


class PayoutCreate(BlankStringAsNoneModel):
    transaction_id: str = Field(min_length=1)
    payment_method: str = Field(min_length=1, max_length=80)
    remarks: str | None = None


class PayoutRead(BaseModel):
    id: UUID
    order_id: UUID
    amount: Decimal
    commission_amount: Decimal
    creator_receivable: Decimal
    transaction_id: str
    payment_method: str
    remarks: str | None
    status: str
    payout_date: datetime | None
    created_by: UUID | None
    updated_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PayoutUpdate(BlankStringAsNoneModel):
    remarks: str | None = None
    status: str | None = None


class PayoutAuditLogRead(BaseModel):
    id: UUID
    payout_id: UUID
    order_id: UUID
    event_type: str
    event_data: str | None
    performed_by: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
