from fastapi import APIRouter, Depends, File, UploadFile

from app.auth.dependencies import get_current_active_user
from app.auth.schemas import APIResponse
from app.database.session import get_db
from app.uploads.service import UploadError, upload_file
from app.users.models import User

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/file", response_model=APIResponse)
async def upload_single_file(
    file: UploadFile = File(...),
    folder: str = "uploads",
    db=Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    try:
        url = await upload_file(file, folder=folder)
    except UploadError as exc:
        return APIResponse(success=False, message=str(exc), data={})

    return APIResponse(message="File uploaded", data={"url": url, "name": file.filename})
