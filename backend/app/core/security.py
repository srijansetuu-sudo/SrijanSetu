from datetime import UTC, datetime, timedelta
import hashlib
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.auth.constants import ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE
from app.core.config import settings
from app.core.exceptions import UnauthorizedError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _password_input(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    return pwd_context.hash(_password_input(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_password_input(plain_password), hashed_password)


def _encode_token(payload: dict, expires_delta: timedelta) -> str:
    to_encode = payload.copy()
    expire = datetime.now(UTC) + expires_delta
    to_encode.update({"exp": expire, "iat": datetime.now(UTC)})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "token_type": ACCESS_TOKEN_TYPE,
    }
    return _encode_token(payload, timedelta(minutes=settings.access_token_expire_minutes))


def create_refresh_token(user_id: str, email: str, role: str, jti: str | None = None) -> tuple[str, str]:
    token_jti = jti or uuid4().hex
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "token_type": REFRESH_TOKEN_TYPE,
        "jti": token_jti,
    }
    token = _encode_token(payload, timedelta(days=settings.refresh_token_expire_days))
    return token, token_jti


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise UnauthorizedError("Invalid or expired token") from exc
