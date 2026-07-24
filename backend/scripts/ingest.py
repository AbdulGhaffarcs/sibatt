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


def _get_or_create(db, model, defaults: dict, unique_filter: dict, cache: dict | None = None):
    """Get existing row or create a new one."""
    cache_key = tuple(sorted(unique_filter.items()))
    if cache is not None and cache_key in cache:
        return cache[cache_key]
    instance = db.query(model).filter_by(**unique_filter).first()
    if instance:
        if cache is not None:
            cache[cache_key] = instance
        return instance
    instance = model(**defaults)
    db.add(instance)
    db.flush()
    if cache is not None:
        cache[cache_key] = instance
    return instance


def ingest_pdf(
    pdf_path: str,
    year: int = 2025,
    semester: str = "Fall",
    force: bool = False,
    replace_term: bool = True,
) -> dict:
    """Full pipeline: load PDF → extract → validate → upsert to DB."""
    init_db()

    # The hash cache is useful for scheduled imports, but a corrected parser
    # must be able to reprocess the same source document.
    doc = fitz.open(pdf_path) if force else load_pdf(pdf_path)
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
        entity_caches: dict[type, dict] = {
            Program: {}, Section: {}, Course: {}, Teacher: {}, Room: {},
        }
        seed_timeslots(db)
        term = seed_term(db, year, semester)

        if replace_term:
            db.query(Entry).filter_by(term_id=term.id).delete(synchronize_session=False)
            db.query(FlaggedCell).filter_by(term_id=term.id).delete(synchronize_session=False)
            db.flush()

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
                    entity_caches[Program],
                )
                section = _get_or_create(
                    db, Section,
                    {"program_id": program.id, "semester": entry_data.semester, "section": entry_data.section},
                    {"program_id": program.id, "semester": entry_data.semester, "section": entry_data.section},
                    entity_caches[Section],
                )
                course = _get_or_create(
                    db, Course,
                    {"name": entry_data.course},
                    {"name": entry_data.course},
                    entity_caches[Course],
                )
                teacher = _get_or_create(
                    db, Teacher,
                    {"code": entry_data.teacher_code, "name": entry_data.teacher_code, "dept": ""},
                    {"code": entry_data.teacher_code},
                    entity_caches[Teacher],
                )
                room = _get_or_create(
                    db, Room,
                    {"code": entry_data.room, "building": entry_data.building},
                    {"code": entry_data.room},
                    entity_caches[Room],
                )
                timeslot = db.query(Timeslot).filter_by(slot_no=entry_data.slot).first()
                if not timeslot:
                    continue

                # One section can have only one class in a timetable slot.
                # Using all descriptive fields here allowed parser mistakes to
                # create multiple conflicting cards for the same day and slot.
                existing = db.query(Entry).filter_by(
                    term_id=term.id,
                    section_id=section.id,
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
    parser.add_argument("--force", action="store_true", help="Reprocess the PDF even when its source hash is unchanged")
    parser.add_argument("--append", action="store_true", help="Keep existing term entries instead of replacing them")
    args = parser.parse_args()

    stats = ingest_pdf(
        args.pdf_path,
        year=args.year,
        semester=args.semester,
        force=args.force,
        replace_term=not args.append,
    )
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
