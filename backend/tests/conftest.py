"""Test session configuration — must run before any test module imports the app."""

import os
import tempfile
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite://")  # in-memory for tests
os.environ.setdefault("API_KEY", "test-api-key")
# Redirect /export away from the real frontend/public/timetable.db.
os.environ["EXPORT_PATH"] = str(
    Path(tempfile.mkdtemp(prefix="slotfinder-test-export-")) / "timetable.db"
)
