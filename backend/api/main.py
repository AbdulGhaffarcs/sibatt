"""FastAPI application — admin API for timetable ingestion and export."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router
from backend.api.crud import router as crud_router
from backend.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup."""
    init_db()
    yield


app = FastAPI(
    title="Sibatt Admin API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(crud_router)
