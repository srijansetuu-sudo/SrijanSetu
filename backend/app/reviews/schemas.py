from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.schemas import BlankStringAsNoneModel


class ReviewCreate(BlankStringAsNoneModel):
    order_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ReviewRead(BaseModel):
    id: UUID
    order_id: UUID
    reviewer_id: UUID
    creator_id: UUID
    rating: int
    comment: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
