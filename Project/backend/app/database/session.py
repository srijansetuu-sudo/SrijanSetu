from collections.abc import AsyncGenerator
import asyncio
import sys

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.database.config import get_database_url


class Base(DeclarativeBase):
    pass


if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


engine = create_async_engine(get_database_url(), pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as db:
        yield db
