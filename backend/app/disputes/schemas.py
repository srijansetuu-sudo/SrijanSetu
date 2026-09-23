from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.schemas import BlankStringAsNoneModel
from app.disputes.models import DisputeReason, DisputeResolution, DisputeStatus


class DisputeCreate(BlankStringAsNoneModel):
    reason: DisputeReason
    details: str = Field(min_length=10, max_length=3000)
    evidence_url: str | None = Field(default=None, max_length=2000)
    evidence_name: str | None = Field(default=None, max_length=255)


class DisputeUpdate(BlankStringAsNoneModel):
    status: DisputeStatus | None = None
    admin_note: str | None = Field(default=None, max_length=3000)
    resolution: DisputeResolution | None = None


class DisputeRead(BaseModel):
    id: UUID
    order_id: UUID
    raised_by: UUID | None
    reason: DisputeReason
    details: str
    evidence_url: str | None
    evidence_name: str | None
    status: DisputeStatus
    admin_note: str | None
    resolution: DisputeResolution | None
    resolved_by: UUID | None
    resolved_at: datetime | None
    contact_submission_id: UUID | None
    created_at: datetime
    updated_at: datetime
    raised_by_name: str | None = None
    raised_by_email: str | None = None
    resolved_by_name: str | None = None

    model_config = {"from_attributes": True}

