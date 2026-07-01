"""Export PostgreSQL data to the SQLite bundle for the frontend.

Usage:
    python -m backend.scripts.export_sqlite [--output frontend/public/timetable.db]
"""

from __future__ import annotations

import argparse
from pathlib import Path

from backend.db import SessionLocal, init_db
from backend.db.export import export_to_sqlite

_DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "timetable.db"


def main() -> None:
    parser = argparse.ArgumentParser(description="Export PostgreSQL → SQLite bundle.")
    parser.add_argument(
        "--output",
        type=Path,
        default=_DEFAULT_OUTPUT,
        help="Output SQLite path (default: frontend/public/timetable.db)",
    )
    args = parser.parse_args()

    init_db()
    with SessionLocal() as db:
        path = export_to_sqlite(db, args.output)
        print(f"Exported SQLite to {path}")


if __name__ == "__main__":
    main()
