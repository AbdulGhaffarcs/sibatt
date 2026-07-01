"""API routes — ingest PDF, export SQLite, health check, flagged cells."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.db.export import export_to_sqlite
from backend.db.models import FlaggedCell
from backend.scripts.ingest import ingest_pdf

router = APIRouter()

_DEFAULT_EXPORT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "timetable.db"


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """Lightweight liveness check — verifies DB connection."""
    try:
        db.execute(sql_text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/ingest")
def ingest(
    file: UploadFile = File(...),
    year: int = Form(2025),
    semester: str = Form("Fall"),
):
    """Upload a timetable PDF and ingest it."""
    suffix = Path(file.filename or "upload.pdf").suffix or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file.file.read())
        tmp_path = tmp.name

    try:
        stats = ingest_pdf(tmp_path, year=year, semester=semester)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if stats.get("status") == "skipped":
        raise HTTPException(status_code=422, detail=stats)
    return stats


@router.post("/export")
def export(db: Session = Depends(get_db)):
    """Export PostgreSQL data to the frontend SQLite bundle."""
    path = export_to_sqlite(db, _DEFAULT_EXPORT)
    return {"status": "ok", "path": str(path)}


@router.get("/flagged")
def list_flagged(
    status: str = "pending",
    db: Session = Depends(get_db),
):
    """List flagged cells for manual review."""
    rows = db.query(FlaggedCell).filter_by(status=status).all()
    return [
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
    ]


@router.put("/flagged/{flag_id}")
def fix_flagged(
    flag_id: int,
    fixed_data: str = Form(...),
    db: Session = Depends(get_db),
):
    """Mark a flagged cell as fixed with corrected data."""
    row = db.query(FlaggedCell).get(flag_id)
    if not row:
        raise HTTPException(status_code=404, detail="Flagged cell not found")
    row.status = "fixed"
    row.fixed_data = fixed_data
    db.commit()
    return {"status": "ok", "id": flag_id}
