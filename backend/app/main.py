import time
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

import app.database.base  # noqa: F401
from app.api.v1.router import api_router
from app.auth.service import ensure_default_admin_user
from app.core.config import settings
from app.database.session import AsyncSessionLocal

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix="/api/v1")

_rate_limit_windows: dict[str, deque[float]] = defaultdict(deque)
_rate_limited_paths = ("/api/v1/auth/login", "/api/v1/auth/signup", "/api/v1/auth/refresh", "/api/v1/contact")


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if request.method != "OPTIONS" and request.url.path in _rate_limited_paths:
        client = request.client.host if request.client else "unknown"
        key = f"{client}:{request.url.path}"
        now = time.monotonic()
        window = _rate_limit_windows[key]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= 20:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"success": False, "message": "Too many requests. Please try again later.", "errors": []},
            )
        window.append(now)

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if request.url.scheme == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


@app.on_event("startup")
async def seed_default_admin_user() -> None:
    if settings.environment.lower() not in {"local", "development", "test"}:
        if not settings.environment_explicit:
            raise RuntimeError("ENVIRONMENT must be explicitly set in production")
        if settings.jwt_secret_key == "change-me":
            raise RuntimeError("JWT secret must be changed before running outside local development")

    async with AsyncSessionLocal() as db:
        await ensure_default_admin_user(db)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=settings.app_name,
        version="1.0.0",
        routes=app.routes,
    )
    openapi_schema.setdefault("components", {}).setdefault("securitySchemes", {})["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


def _format_validation_error(error: dict) -> str:
    message = str(error.get("msg") or "Invalid value")
    if message.startswith("Value error, "):
        message = message.removeprefix("Value error, ")

    location = [str(part) for part in error.get("loc", []) if part not in {"body", "query", "path"}]
    if location:
        return f"{'.'.join(location)}: {message}"
    return message


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.app_name}


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": str(exc.detail),
            "errors": [],
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    errors = jsonable_encoder(exc.errors())
    message = "; ".join(_format_validation_error(error) for error in errors) or "Validation error"
    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": message,
            "errors": errors,
        },
    )
