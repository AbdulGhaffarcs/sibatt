"""API key authentication dependency."""

from __future__ import annotations

import os
import secrets

from fastapi import Header, HTTPException

API_KEY = os.getenv("API_KEY", "").strip() or secrets.token_urlsafe(32)


def verify_api_key(x_api_key: str | None = Header(None, alias="X-API-Key")) -> None:
    if x_api_key is None:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
