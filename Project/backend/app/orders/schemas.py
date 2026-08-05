from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.schemas import BlankStringAsNoneModel
from app.orders.models import OrderStatus


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderFileCreate(BlankStringAsNoneModel):
    file_url: str = Field(min_length=1)
    file_type: str = Field(min_length=1, max_length=80)


class OrderRead(BaseModel):
    id: UUID
    requirement_id: UUID
    quotation_id: UUID
    customer_id: UUID
    creator_id: UUID
    total_amount: Decimal
    platform_commission: Decimal
    status: OrderStatus
    started_at: datetime | None
    completed_at: datetime | None
    customer_completed_at: datetime | None
    creator_completed_at: datetime | None
    payout_ready_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderFileRead(BaseModel):
    id: UUID
    order_id: UUID
    uploaded_by: UUID
    file_url: str
    file_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
