import asyncio
import getpass
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

import app.database.base  # noqa: F401
from app.auth.utils import validate_email, validate_password_strength
from app.core.exceptions import APIError
from app.core.security import hash_password, verify_password
from app.database.session import AsyncSessionLocal
from app.users.models import User, UserRole


def _admin_email() -> str:
    return os.getenv("ADMIN_EMAIL") or input("Admin email: ").strip()


def _admin_password() -> str:
    password = os.getenv("ADMIN_PASSWORD")
    if password:
        return password

    password = getpass.getpass("Admin password: ")
    if password != getpass.getpass("Confirm admin password: "):
        raise ValueError("Passwords do not match")
    return password


async def create_first_admin() -> int:
    async with AsyncSessionLocal() as db:
        existing_admin = await db.scalar(select(User).where(User.role == UserRole.ADMIN))
        if existing_admin:
            print(f"An admin already exists ({existing_admin.email}); no changes made.")
            return 0

        email = validate_email(_admin_email())
        existing_user = await db.scalar(select(User).where(User.email == email))
        if existing_user:
            raise ValueError(f"A user already exists with {email}; no changes made")

        password = _admin_password()
        validate_password_strength(password)
        password_hash = hash_password(password)

        admin_user = User(
            full_name="System Administrator",
            email=email,
            password_hash=password_hash,
            role=UserRole.ADMIN,
            is_verified=True,
            is_active=True,
        )
        db.add(admin_user)
        await db.commit()
        await db.refresh(admin_user)

        persisted_admin = await db.scalar(select(User).where(User.id == admin_user.id, User.role == UserRole.ADMIN))
        if not persisted_admin:
            raise RuntimeError("The admin record could not be verified after commit")
        if not verify_password(password, admin_user.password_hash):
            raise RuntimeError("The generated password hash could not be verified")

        print(f"Created first admin user: {admin_user.email}")
        print("Password hash verified with the application security implementation.")
        return 0


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(create_first_admin()))
    except (APIError, ValueError, RuntimeError) as error:
        print(f"Error: {error}")
        raise SystemExit(1) from error
