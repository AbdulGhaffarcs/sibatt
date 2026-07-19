"""PDF ingestion pipeline: extract timetable PDF → upsert to database.

Usage:
    python -m backend.scripts.ingest <pdf_path> --year 2025 --semester Fall
"""

from __future__ import annotations

import argparse
from pathlib import Path

import fitz

from backend.db import SessionLocal, init_db
from backend.db.models import (
    Course,
    Entry,
    FlaggedCell,
    Program,
    Room,
    Section,
    Teacher,
    Term,
    Timeslot,
)
from backend.db.seed import seed_term, seed_timeslots
from backend.extractor.grid import extract_grid
from backend.extractor.loader import load_pdf
from backend.extractor.parser import parse_page
from backend.extractor.validator import classify_cells


def _get_or_create(db, model, defaults: dict, unique_filter: dict):
    """Get existing row or create a new one."""
    instance = db.query(model).filter_by(**unique_filter).first()
    if instance:
        return instance
    instance = model(**defaults)
    db.add(instance)
    db.flush()
    return instance


def ingest_pdf(
    pdf_path: str,
    year: int = 2025,
    semester: str = "Fall",
) -> dict:
    """Full pipeline: load PDF → extract → validate → upsert to DB."""
    init_db()

    doc = load_pdf(pdf_path)
    if doc is None:
        return {"status": "skipped", "reason": "same hash, no changes"}

    term_label = f"{semester}-{year}"
    stats = {
        "pages": doc.page_count,
        "entries": 0,
        "flagged": 0,
        "skipped_empty": 0,
        "programs": [],
    }

    with SessionLocal() as db:
        seed_timeslots(db)
        term = seed_term(db, year, semester)

        for page_no in range(doc.page_count):
            page = doc[page_no]
            cells = extract_grid(page)
            if not cells:
                stats["skipped_empty"] += 1
                continue

            records = parse_page(page, cells)
            if not records:
                stats["skipped_empty"] += 1
                continue

            result = classify_cells(
                records,
                page=page,
                page_no=page_no,
                term=term_label,
            )

            for entry_data in result.entries:
                if not entry_data.program:
                    continue

                program = _get_or_create(
                    db, Program,
                    {"name": entry_data.program},
                    {"name": entry_data.program},
                )
                section = _get_or_create(
                    db, Section,
                    {"program_id": program.id, "semester": entry_data.semester, "section": entry_data.section},
                    {"program_id": program.id, "semester": entry_data.semester, "section": entry_data.section},
                )
                course = _get_or_create(
                    db, Course,
                    {"name": entry_data.course},
                    {"name": entry_data.course},
                )
                teacher = _get_or_create(
                    db, Teacher,
                    {"code": entry_data.teacher_code, "name": entry_data.teacher_code, "dept": ""},
                    {"code": entry_data.teacher_code},
                )
                room = _get_or_create(
                    db, Room,
                    {"code": entry_data.room, "building": entry_data.building},
                    {"code": entry_data.room},
                )
                timeslot = db.query(Timeslot).filter_by(slot_no=entry_data.slot).first()
                if not timeslot:
                    continue

                existing = db.query(Entry).filter_by(
                    term_id=term.id,
                    section_id=section.id,
                    course_id=course.id,
                    teacher_id=teacher.id,
                    room_id=room.id,
                    timeslot_id=timeslot.id,
                    day=entry_data.day,
                ).first()

                if not existing:
                    db.add(Entry(
                        term_id=term.id,
                        section_id=section.id,
                        course_id=course.id,
                        teacher_id=teacher.id,
                        room_id=room.id,
                        timeslot_id=timeslot.id,
                        day=entry_data.day,
                        is_online=entry_data.is_online,
                    ))
                    stats["entries"] += 1

            for flagged in result.flagged:
                db.add(FlaggedCell(
                    term_id=term.id,
                    raw_text=flagged.raw_text,
                    cell_bbox=flagged.cell_bbox,
                    flags=flagged.flags,
                    status="pending",
                ))
                stats["flagged"] += 1

        db.commit()

    doc.close()
    stats["status"] = "ok"
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest a timetable PDF.")
    parser.add_argument("pdf_path", help="Path to the timetable PDF")
    parser.add_argument("--year", type=int, default=2025)
    parser.add_argument("--semester", default="Fall")
    parser.add_argument("--export", action="store_true", help="Also export to frontend SQLite bundle after ingest")
    args = parser.parse_args()

    stats = ingest_pdf(args.pdf_path, year=args.year, semester=args.semester)
    print(stats)

    if args.export:
        from backend.db.export import export_to_sqlite
        from backend.db import SessionLocal
        output = Path(__file__).resolve().parents[2] / "frontend" / "public" / "timetable.db"
        with SessionLocal() as db:
            path = export_to_sqlite(db, output)
        print(f"Exported to {path}")


if __name__ == "__main__":
    main()
