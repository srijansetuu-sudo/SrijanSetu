from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.core.schemas import BlankStringAsNoneModel
from app.requirements.models import RequirementStatus


class RequirementCreate(BlankStringAsNoneModel):
    title: str = Field(min_length=2, max_length=180)
    description: str = Field(min_length=5)
    budget_min: Decimal = Field(ge=0)
    budget_max: Decimal = Field(ge=0)
    deadline: date | None = None
    ai_generated_reference: str | None = None

    @model_validator(mode="after")
    def budget_max_must_cover_budget_min(self):
        if self.budget_max < self.budget_min:
            raise ValueError("Maximum budget cannot be less than minimum budget")
        if self.deadline is not None and self.deadline < date.today():
            raise ValueError("Deadline cannot be in the past")
        return self


class RequirementUpdate(BlankStringAsNoneModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, min_length=5)
    budget_min: Decimal | None = Field(default=None, ge=0)
    budget_max: Decimal | None = Field(default=None, ge=0)
    deadline: date | None = None
    status: RequirementStatus | None = None
    ai_generated_reference: str | None = None

    @model_validator(mode="after")
    def required_fields_cannot_be_null(self):
        required_fields = {"title", "description", "budget_min", "budget_max", "status"}
        null_fields = [field for field in required_fields if field in self.model_fields_set and getattr(self, field) is None]
        if null_fields:
            raise ValueError(f"Fields cannot be null: {', '.join(sorted(null_fields))}")
        if self.budget_min is not None and self.budget_max is not None and self.budget_max < self.budget_min:
            raise ValueError("Maximum budget cannot be less than minimum budget")
        if self.deadline is not None and self.deadline < date.today():
            raise ValueError("Deadline cannot be in the past")
        return self


class RequirementReferenceCreate(BlankStringAsNoneModel):
    image_url: str = Field(min_length=1)


class RequirementRead(BaseModel):
    id: UUID
    customer_id: UUID
    title: str
    description: str
    budget_min: Decimal
    budget_max: Decimal
    deadline: date | None
    status: RequirementStatus
    ai_generated_reference: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RequirementReferenceRead(BaseModel):
    id: UUID
    requirement_id: UUID
    image_url: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
