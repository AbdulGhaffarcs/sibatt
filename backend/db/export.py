"""Export data from PostgreSQL to the SQLite bundle consumed by the frontend."""

from __future__ import annotations

import os
import re
import sqlite3
import tempfile
from pathlib import Path

from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

# Whitelist of valid table and column names to prevent SQL injection.
_VALID_IDENTIFIER = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def _safe_identifier(name: str) -> str:
    """Validate that an identifier contains only safe characters."""
    if not _VALID_IDENTIFIER.match(name):
        raise ValueError(f"Invalid SQL identifier: {name!r}")
    return name


def export_to_sqlite(db: Session, output_path: str | Path) -> Path:
    """Query PostgreSQL and write a SQLite file matching the frontend schema.

    The output SQLite contains the exact tables the frontend expects:
    terms, programs, timeslots, rooms, teachers, sections, courses, entries, flagged_cells.
    """
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    # Build beside the live file and swap it in only once complete.  The
    # frontend can therefore never fetch a missing or half-written bundle.
    with tempfile.NamedTemporaryFile(
        prefix=f".{output.stem}-", suffix=".tmp", dir=output.parent, delete=False
    ) as tmp:
        temp_output = Path(tmp.name)

    try:
        conn = sqlite3.connect(str(temp_output))
        try:
            cur = conn.cursor()

            cur.executescript("""
        CREATE TABLE programs   (id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE sections   (id INTEGER PRIMARY KEY, program_id INTEGER, semester INTEGER, section TEXT);
        CREATE TABLE courses    (id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE teachers   (id INTEGER PRIMARY KEY, code TEXT, name TEXT, dept TEXT);
        CREATE TABLE rooms      (id INTEGER PRIMARY KEY, code TEXT, building TEXT);
        CREATE TABLE timeslots  (id INTEGER PRIMARY KEY, slot_no INTEGER, start_time TEXT, end_time TEXT);
        CREATE TABLE terms      (id INTEGER PRIMARY KEY, year INTEGER, semester TEXT);
        CREATE TABLE entries    (id INTEGER PRIMARY KEY, term_id INTEGER, section_id INTEGER,
                                 course_id INTEGER, teacher_id INTEGER, room_id INTEGER,
                                 timeslot_id INTEGER, day TEXT, is_online INTEGER);
        CREATE TABLE flagged_cells (id INTEGER PRIMARY KEY, term_id INTEGER, raw_text TEXT,
                                    cell_bbox TEXT, flags TEXT, status TEXT, fixed_data TEXT);
            """)

            _copy_table(db, cur, "programs",   ["id", "name"])
            _copy_table(db, cur, "teachers",   ["id", "code", "name", "dept"])
            _copy_table(db, cur, "rooms",      ["id", "code", "building"])
            _copy_table(db, cur, "timeslots",  ["id", "slot_no", "start_time", "end_time"])
            _copy_table(db, cur, "terms",      ["id", "year", "semester"])
            _copy_table(db, cur, "sections",   ["id", "program_id", "semester", "section"])
            _copy_table(db, cur, "courses",    ["id", "name"])

            _copy_table(db, cur, "entries", [
                "id", "term_id", "section_id", "course_id", "teacher_id",
                "room_id", "timeslot_id", "day", "is_online",
            ])

            _copy_table(db, cur, "flagged_cells", [
                "id", "term_id", "raw_text", "cell_bbox", "flags", "status", "fixed_data",
            ])

            conn.commit()
        finally:
            conn.close()
        os.replace(temp_output, output)
    except Exception:
        temp_output.unlink(missing_ok=True)
        raise
    return output


def _copy_table(db: Session, sqlite_cur: sqlite3.Cursor, table: str, columns: list[str]) -> None:
    # Validate identifiers to prevent SQL injection
    safe_table = _safe_identifier(table)
    safe_columns = [_safe_identifier(col) for col in columns]

    col_list = ", ".join(safe_columns)
    rows = db.execute(sql_text(f"SELECT {col_list} FROM {safe_table}")).fetchall()
    placeholders = ", ".join(["?"] * len(safe_columns))
    sqlite_cur.executemany(
        f"INSERT INTO {safe_table} ({col_list}) VALUES ({placeholders})",
        [tuple(row) for row in rows],
    )
