"""Targeted reset helpers for imported timetable data.

Timeslots are shared configuration, not imported timetable data, so they are
intentionally kept when an administrator resets the timetable.
"""

from __future__ import annotations

import argparse

from sqlalchemy.orm import Session

from backend.db import SessionLocal, init_db
from backend.db.models import Course, Entry, FlaggedCell, Program, Room, Section, Teacher, Term
from backend.extractor.loader import clear_ingestion_cache


def reset_timetable_data(db: Session) -> dict[str, int]:
    """Delete imported timetable rows while preserving the timeslot catalogue."""
    models = (FlaggedCell, Entry, Section, Course, Teacher, Room, Program, Term)
    deleted = {model.__tablename__: db.query(model).count() for model in models}

    try:
        for model in models:
            db.query(model).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return deleted


def main() -> None:
    """Reset the configured database from the command line."""
    parser = argparse.ArgumentParser(description="Delete imported timetable data and keep timeslots.")
    parser.add_argument("--yes", action="store_true", help="Confirm the destructive reset")
    args = parser.parse_args()
    if not args.yes:
        parser.error("pass --yes to reset imported timetable data")

    init_db()
    with SessionLocal() as db:
        deleted = reset_timetable_data(db)
    cache_files = clear_ingestion_cache()
    print({"status": "ok", "deleted": deleted, "ingestion_cache_files": cache_files})


if __name__ == "__main__":
    main()
