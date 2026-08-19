from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.schemas import BlankStringAsNoneModel


class CreatorProfileUpsert(BlankStringAsNoneModel):
    brand_name: str = Field(min_length=2, max_length=160)
    headline: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=10)
    years_of_experience: int = Field(default=0, ge=0)
    portfolio_cover_url: str | None = None
    response_time_hours: int | None = Field(default=None, ge=0)
    instagram_url: str | None = None
    website_url: str | None = None
    youtube_url: str | None = None
    categories: list[str] = Field(min_length=1)


class CreatorCategoryRead(BaseModel):
    id: UUID
    category_name: str

    model_config = {"from_attributes": True}


class CreatorProfileRead(BaseModel):
    id: UUID
    user_id: UUID
    brand_name: str | None
    headline: str | None
    description: str | None
    years_of_experience: int
    portfolio_cover_url: str | None
    average_rating: float
    total_reviews: int
    total_orders_completed: int
    response_time_hours: int | None
    instagram_url: str | None
    website_url: str | None
    youtube_url: str | None
    is_verified_creator: bool
    categories: list[CreatorCategoryRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SavedCreatorRead(BaseModel):
    id: UUID
    customer_id: UUID
    creator_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
