from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.schemas import BlankStringAsNoneModel
from app.quotations.models import QuotationStatus


class QuotationCreate(BlankStringAsNoneModel):
    requirement_id: UUID
    proposed_price: Decimal = Field(ge=0)
    estimated_days: int = Field(ge=1)
    revisions_allowed: int = Field(default=0, ge=0, le=20)
    message: str = Field(min_length=1)


class QuotationRead(BaseModel):
    id: UUID
    requirement_id: UUID
    creator_id: UUID
    proposed_price: Decimal
    estimated_days: int
    revisions_allowed: int
    message: str
    status: QuotationStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
