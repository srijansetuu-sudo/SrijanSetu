from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_customer
from app.auth.schemas import APIResponse
from app.database.session import get_db
from app.reviews import service
from app.reviews.schemas import ReviewCreate, ReviewRead
from app.users.models import User

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=APIResponse)
async def create_review(payload: ReviewCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_customer)):
    review = await service.create_review(db, user, payload)
    return APIResponse(message="Review created", data={"review": ReviewRead.model_validate(review).model_dump(mode="json")})


@router.get("/creators/{creator_id}", response_model=APIResponse)
async def creator_reviews(creator_id: UUID, db: AsyncSession = Depends(get_db)):
    reviews = await service.creator_reviews(db, creator_id)
    items = [ReviewRead.model_validate(review).model_dump(mode="json") for review in reviews]
    return APIResponse(data={"items": items})
