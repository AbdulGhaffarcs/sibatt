# SlotFinder Backend

The backend imports timetable PDFs, manages timetable data, and exposes the FastAPI admin API. Run the commands below from the repository root (`slotfinder/`), not from `backend/`.

## Quick start

Create and activate a virtual environment, then install the backend dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

Set an API key for protected endpoints and start the development server:

```bash
export API_KEY=dev-api-key-change-me
uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at <http://127.0.0.1:8000>. Open <http://127.0.0.1:8000/docs> for the interactive API documentation. Include the value of `API_KEY` as the `X-API-Key` header for every endpoint except `GET /health`.

## Database configuration

Without configuration, the backend uses a SQLite database at `slotfinder.db` in the repository root. Tables are created automatically when the API starts or when a data command runs.

To use PostgreSQL instead, start the database service and point `DATABASE_URL` at it:

```bash
docker compose up -d db
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/slotfinder
```

## Data commands

### Seed timeslots and a term

```bash
python -m backend.db.seed 2025 Fall
```

The year and semester are optional; the defaults are `2025` and `Fall`.

### Import a timetable PDF

```bash
python -m backend.scripts.ingest path/to/timetable.pdf --year 2025 --semester Fall
```

Useful options:

```bash
# Reprocess an unchanged PDF and export the frontend SQLite bundle afterwards.
python -m backend.scripts.ingest path/to/timetable.pdf --year 2025 --semester Fall --force --export

# Replace all timetable data before importing.
python -m backend.scripts.ingest path/to/timetable.pdf --year 2025 --semester Fall --replace
```

By default, importing replaces entries for the selected term. Use `--append` to retain the term's existing entries.

### Export the frontend SQLite bundle

```bash
python -m backend.scripts.export_sqlite
```

This writes `frontend/public/timetable.db`. Supply `--output path/to/file.db` to choose another destination.

## Test

```bash
python -m pytest backend/tests -v
```

## API endpoints

`GET /health` is public. Every other endpoint requires `X-API-Key`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Check database connectivity. |
| POST | `/ingest` | Upload and import a timetable PDF. |
| POST | `/export` | Export the PostgreSQL data to the frontend SQLite bundle. |
| GET | `/flagged` | List flagged cells; supports `status`, `limit`, and `offset`. |
| PUT | `/flagged/{id}` | Save a correction for a flagged cell. |
| DELETE | `/flagged/{id}` | Dismiss a flagged cell. |
| GET/POST | `/{resource}` | List or create a program, section, course, teacher, room, term, or entry. |
| GET/PUT/DELETE | `/{resource}/{id}` | Read, update, or delete a resource. |
| GET | `/query/entries` | Return joined entries with filters. |
| GET | `/query/teacher-schedule` | Return a teacher's weekly schedule. |
| GET | `/query/room-schedule` | Return a room's weekly bookings. |
| GET | `/query/available-rooms` | Return rooms free for a given day and slot. |

## Pipeline

```
PDF → loader → grid extraction → parser → validator → database upsert → SQLite export
```
