"""
Database Engine, Async Session, and Base Model Declaration.
Supports SQLite (async with aiosqlite) and PostgreSQL (async with asyncpg).
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base
from app.config import settings

# Normalize Postgres URLs for asyncpg if standard 'postgresql://' was passed
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Check if asyncpg is available; if not (e.g. local host Windows dev), fall back to SQLite
if "postgresql" in db_url:
    try:
        import asyncpg  # noqa: F401
    except ImportError:
        db_url = "sqlite+aiosqlite:///./chatbot.db"

engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    future=True,
    # SQLite-specific connect args
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing database sessions per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables on application startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

