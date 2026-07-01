"""Database engine, session factory, and declarative base."""

from __future__ import annotations

import os
from collections.abc import Generator
from typing import TYPE_CHECKING

from sqlalchemy.orm import DeclarativeBase, Session

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine
    from sqlalchemy.orm import sessionmaker

_SQLITE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "slotfinder.db")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{os.path.abspath(_SQLITE_PATH)}",
)

_engine: Engine | None = None
_session_factory: sessionmaker | None = None


def _get_engine():
    global _engine
    if _engine is None:
        from sqlalchemy import create_engine
        _engine = create_engine(DATABASE_URL, echo=False)
    return _engine


def _get_session_factory():
    global _session_factory
    if _session_factory is None:
        from sqlalchemy.orm import sessionmaker
        _session_factory = sessionmaker(bind=_get_engine())
    return _session_factory


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and closes it after use."""
    db = _get_session_factory()()
    try:
        yield db
    finally:
        db.close()


def SessionLocal() -> Session:
    """Create a new database session (convenience wrapper)."""
    return _get_session_factory()()


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Create all tables defined by ORM models."""
    from backend.db import models  # noqa: F401  — ensure models are registered
    Base.metadata.create_all(bind=_get_engine())
