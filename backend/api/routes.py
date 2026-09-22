"""API routes — ingest PDF, export SQLite, health check, flagged cells."""

from __future__ import annotations

import json
import logging
import os
import smtplib
import tempfile
from email.message import EmailMessage
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Security, UploadFile
from pydantic import BaseModel, ValidationError
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

from backend.api.auth import verify_api_key
from backend.db import SessionLocal, get_db
from backend.db.export import export_to_sqlite
from backend.db.models import FlaggedCell
from backend.scripts.ingest import ingest_pdf

logger = logging.getLogger(__name__)

router = APIRouter()

# Overridable via EXPORT_PATH so tests never touch the real frontend bundle.
# Resolved lazily (per call) because env vars may be set after import.
def _default_export() -> Path:
    return Path(
        os.getenv("EXPORT_PATH")
        or Path(__file__).resolve().parents[2] / "frontend" / "public" / "timetable.db"
    )


class FixFlaggedBody(BaseModel):
    fixed_data: str


class FeedbackBody(BaseModel):
    message: str
    email: str = ""


class FeedbackResponse(BaseModel):
    status: str


def _send_feedback_email(message: str, email: str, user_agent: str) -> None:
    """Send feedback through the configured SMTP relay without storing it."""
    host = os.getenv("SMTP_HOST")
    recipient = os.getenv("FEEDBACK_RECIPIENT_EMAIL")
    if not host or not recipient:
        raise RuntimeError("Feedback email is not configured")

    sender = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", recipient))
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    subject = "SIBATT user feedback"

    email_message = EmailMessage()
    email_message["Subject"] = subject
    email_message["From"] = sender
    email_message["To"] = recipient
    if email:
        email_message["Reply-To"] = email
    email_message.set_content(
        f"Feedback:\n\n{message}\n\n"
        f"Reply email: {email or 'Not provided'}\n"
        f"User agent: {user_agent or 'Not provided'}"
    )

    with smtplib.SMTP(host, smtp_port, timeout=10) as smtp:
        if os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}:
            smtp.starttls()
        if smtp_user and smtp_password:
            smtp.login(smtp_user, smtp_password)
        smtp.send_message(email_message)


def _handle(desc: str):
    """Decorator that wraps endpoints with logging and generic error handling."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except HTTPException:
                raise
            except Exception as exc:
                logger.exception("%s failed", desc)
                raise HTTPException(status_code=500, detail=f"{desc}: {str(exc)}")
        return wrapper
    return decorator


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """Lightweight liveness check — verifies DB connection."""
    try:
        db.execute(sql_text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/feedback", response_model=FeedbackResponse, status_code=201)
def submit_feedback(body: FeedbackBody, request: Request):
    """Send public user feedback to the configured team email."""
    message = body.message.strip()
    email = body.email.strip()
    if not message:
        raise HTTPException(status_code=422, detail="message must not be empty")
    if len(message) > 2000:
        raise HTTPException(status_code=422, detail="message is too long")
    if len(email) > 320:
        raise HTTPException(status_code=422, detail="email is too long")

    try:
        _send_feedback_email(message, email, request.headers.get("user-agent", "")[:500])
    except Exception:
        logger.exception("Feedback email delivery failed")
        raise HTTPException(status_code=503, detail="Feedback email is temporarily unavailable")
    return {"status": "received"}


@router.post("/ingest")
def ingest(
    file: UploadFile = File(...),
    year: int = Form(2025),
    semester: str = Form("Fall"),
    replace: bool = Form(False),
    _auth: None = Depends(verify_api_key),
):
    """Upload and import a timetable PDF, optionally replacing all timetable data."""
    suffix = Path(file.filename or "upload.pdf").suffix or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file.file.read())
        tmp_path = tmp.name

    try:
        stats = ingest_pdf(tmp_path, year=year, semester=semester, replace=replace)
    except Exception:
        logger.exception("Ingest failed for %s", file.filename)
        raise HTTPException(status_code=500, detail="Ingestion pipeline failed")
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if stats.get("status") == "skipped":
        raise HTTPException(status_code=422, detail=stats)

    # The static frontend reads this SQLite bundle, so publishing it here keeps
    # an admin upload from leaving users on the previous timetable.
    try:
        with SessionLocal() as export_db:
            bundle_path = export_to_sqlite(export_db, _default_export())
    except Exception:
        logger.exception("Export after ingest failed")
        raise HTTPException(status_code=500, detail="Timetable was imported but bundle export failed")
    stats["bundle_path"] = str(bundle_path)
    return stats


@router.post("/export")
def export(
    db: Session = Depends(get_db),
    _auth: None = Depends(verify_api_key),
):
    """Export PostgreSQL data to the frontend SQLite bundle."""
    try:
        path = export_to_sqlite(db, _default_export())
    except Exception:
        logger.exception("Export failed")
        raise HTTPException(status_code=500, detail="Export failed")
    return {"status": "ok", "path": str(path)}


@router.get("/flagged")
def list_flagged(
    status: str = Query("pending", description="Filter by status"),
    limit: int = Query(50, ge=1, le=500, description="Max rows"),
    offset: int = Query(0, ge=0, description="Row offset"),
    db: Session = Depends(get_db),
    _auth: None = Depends(verify_api_key),
):
    """List flagged cells for manual review."""
    rows = (
        db.query(FlaggedCell)
        .filter_by(status=status)
        .order_by(FlaggedCell.id)
        .offset(offset)
        .limit(limit)
        .all()
    )
    total = db.query(FlaggedCell).filter_by(status=status).count()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "rows": [
            {
                "id": r.id,
                "term_id": r.term_id,
                "raw_text": r.raw_text,
                "cell_bbox": r.cell_bbox,
                "flags": r.flags,
                "status": r.status,
                "fixed_data": r.fixed_data,
            }
            for r in rows
        ],
    }


@router.put("/flagged/{flag_id}")
def fix_flagged(
    flag_id: int,
    body: FixFlaggedBody,
    db: Session = Depends(get_db),
    _auth: None = Depends(verify_api_key),
):
    """Mark a flagged cell as fixed with corrected data."""
    row = db.query(FlaggedCell).get(flag_id)
    if not row:
        raise HTTPException(status_code=404, detail="Flagged cell not found")
    if not body.fixed_data or not body.fixed_data.strip():
        raise HTTPException(status_code=422, detail="fixed_data must not be empty")
    row.status = "fixed"
    row.fixed_data = body.fixed_data.strip()
    db.commit()
    return {"status": "ok", "id": flag_id}


@router.delete("/flagged/{flag_id}", status_code=204)
def delete_flagged(
    flag_id: int,
    db: Session = Depends(get_db),
    _auth: None = Depends(verify_api_key),
):
    """Dismiss a flagged cell (delete it)."""
    row = db.query(FlaggedCell).get(flag_id)
    if not row:
        raise HTTPException(status_code=404, detail="Flagged cell not found")
    db.delete(row)
    db.commit()
