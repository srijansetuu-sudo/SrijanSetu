import os
from urllib.parse import urlparse

from fastapi import UploadFile

from app.core.config import settings


class UploadError(Exception):
    pass


MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/zip",
}


async def upload_file(file: UploadFile, folder: str, public: bool = True) -> str:
    file_bytes = await file.read()
    if not file_bytes:
        raise UploadError("Uploaded file is empty")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise UploadError("Uploaded file must be 10 MB or smaller")
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise UploadError("Unsupported file type")

    safe_folder = os.path.basename(folder or "uploads") or "uploads"
    safe_name = os.path.basename(file.filename or "upload")

    if not settings.upload_provider:
        import base64

        encoded = base64.b64encode(file_bytes).decode("ascii")
        return f"data:{content_type};base64,{encoded}"

    if settings.upload_provider.lower() == "cloudinary":
        try:
            import cloudinary
            import cloudinary.uploader
        except ImportError as exc:
            raise UploadError("cloudinary package is not installed") from exc

        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
        )
        result = cloudinary.uploader.upload(
            file_bytes,
            folder=safe_folder,
            resource_type="auto",
            public_id=os.path.splitext(safe_name)[0],
        )
        return result.get("secure_url") or result.get("url")

    if settings.upload_provider.lower() == "s3":
        try:
            import boto3
        except ImportError as exc:
            raise UploadError("boto3 package is not installed") from exc

        bucket_name = settings.s3_bucket_name
        region_name = settings.s3_region_name or "us-east-1"
        endpoint_url = settings.s3_endpoint_url
        key = f"{safe_folder}/{safe_name}"
        client = boto3.client(
            "s3",
            region_name=region_name,
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
        )
        client.put_object(Bucket=bucket_name, Key=key, Body=file_bytes, ContentType=content_type)
        if endpoint_url:
            return f"{endpoint_url.rstrip('/')}/{bucket_name}/{key}"
        return f"https://{bucket_name}.s3.{region_name}.amazonaws.com/{key}"

    raise UploadError(f"Unsupported upload provider: {settings.upload_provider}")


def is_remote_url(value: str | None) -> bool:
    if not value:
        return False
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"}
