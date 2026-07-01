from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

import app.database.base  # noqa: F401
from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


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
