"""Seed the database with timeslots from shared/timeslots.json and optional term."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from backend.db import SessionLocal, init_db
from backend.db.models import Term, Timeslot

_TIMESLOTS_JSON = Path(__file__).resolve().parents[2] / "shared" / "timeslots.json"


def seed_timeslots(db: Session) -> int:
    """Insert or reconcile timeslots from shared JSON. Returns count inserted."""
    data = json.loads(_TIMESLOTS_JSON.read_text(encoding="utf-8"))
    inserted = 0
    for row in data:
        exists = db.query(Timeslot).filter_by(slot_no=row["slot"]).first()
        if not exists:
            db.add(Timeslot(
                slot_no=row["slot"],
                start_time=row["start"],
                end_time=row["end"],
            ))
            inserted += 1
        else:
            exists.start_time = row["start"]
            exists.end_time = row["end"]
    db.commit()
    return inserted


def seed_term(db: Session, year: int, semester: str) -> Term:
    """Get or create a term row."""
    term = db.query(Term).filter_by(year=year, semester=semester).first()
    if not term:
        term = Term(year=year, semester=semester)
        db.add(term)
        db.commit()
        db.refresh(term)
    return term


def seed_all(year: int = 2025, semester: str = "Fall") -> None:
    """Create tables and seed timeslots + default term."""
    init_db()
    with SessionLocal() as db:
        n = seed_timeslots(db)
        print(f"Timeslots: {n} inserted")
        term = seed_term(db, year, semester)
        print(f"Term: id={term.id} ({term.year} {term.semester})")


if __name__ == "__main__":
    yr = int(sys.argv[1]) if len(sys.argv) > 1 else 2025
    sem = sys.argv[2] if len(sys.argv) > 2 else "Fall"
    seed_all(yr, sem)
