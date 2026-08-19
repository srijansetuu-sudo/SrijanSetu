from uuid import UUID

from fastapi import APIRouter, Depends, Query, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.auth.schemas import APIResponse
from app.contact import service
from app.contact.models import ContactStatus
from app.contact.schemas import ContactSubmissionCreate, ContactSubmissionRead, ContactSubmissionUpdate
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token
from app.database.session import get_db
from app.users.models import User

router = APIRouter(prefix="/contact", tags=["contact"])
optional_bearer = HTTPBearer(auto_error=False)


async def optional_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Security(optional_bearer),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("token_type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await db.get(User, user_id)
        return user if user and user.is_active else None
    except UnauthorizedError:
        return None


@router.post("", response_model=APIResponse)
async def submit_contact(
    payload: ContactSubmissionCreate,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(optional_current_user),
):
    submission = await service.create_submission(db, payload, user)
    item = ContactSubmissionRead.model_validate(submission).model_dump(mode="json")
    return APIResponse(message="Message submitted", data={"submission": item})


@router.get("/admin", response_model=APIResponse)
async def admin_contact_submissions(
    status: ContactStatus | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    submissions = await service.list_submissions(db, status)
    items = [ContactSubmissionRead.model_validate(item).model_dump(mode="json") for item in submissions]
    return APIResponse(data={"items": items})


@router.patch("/admin/{submission_id}", response_model=APIResponse)
async def update_contact_submission(
    submission_id: UUID,
    payload: ContactSubmissionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    submission = await service.update_submission(db, submission_id, payload)
    item = ContactSubmissionRead.model_validate(submission).model_dump(mode="json")
    return APIResponse(message="Contact submission updated", data={"submission": item})
