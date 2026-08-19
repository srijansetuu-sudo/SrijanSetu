import hashlib
import re

from app.auth.constants import PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH
from app.core.exceptions import APIError

EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
UPPER_REGEX = re.compile(r"[A-Z]")
LOWER_REGEX = re.compile(r"[a-z]")
DIGIT_REGEX = re.compile(r"\d")
SPECIAL_REGEX = re.compile(r"[^A-Za-z0-9]")


def validate_email(email: str) -> str:
    if not EMAIL_REGEX.match(email):
        raise APIError("Invalid email format")
    return email.lower().strip()


def validate_password_strength(password: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH or len(password) > PASSWORD_MAX_LENGTH:
        raise APIError("Password must be between 8 and 128 characters")
    if not UPPER_REGEX.search(password):
        raise APIError("Password must include an uppercase letter")
    if not LOWER_REGEX.search(password):
        raise APIError("Password must include a lowercase letter")
    if not DIGIT_REGEX.search(password):
        raise APIError("Password must include a number")
    if not SPECIAL_REGEX.search(password):
        raise APIError("Password must include a special character")


def sha256_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
