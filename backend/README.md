# SlotFinder Backend

PDF extraction pipeline, admin API, and database management.

## Setup

```bash
cd backend
pip install -r requirements.txt
```

## Configuration

Set `DATABASE_URL` env var (defaults to local SQLite `slotfinder.db`):

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/slotfinder
```

## Usage

### Seed timeslots and a term

```bash
python -m backend.db.seed 2025 Fall
```

### Ingest a PDF

```bash
python -m backend.scripts.ingest ../fall2025.pdf --year 2025 --semester Fall
```

### Export to SQLite bundle

```bash
python -m backend.scripts.export_sqlite
```

### Run the API server

```bash
uvicorn backend.api.main:app --reload --port 8000
```

## API Endpoints

### Admin (`/`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | DB liveness check |
| POST | `/ingest` | Upload PDF, run extraction pipeline |
| POST | `/export` | PostgreSQL → SQLite bundle |
| GET | `/flagged` | List flagged cells (supports `?limit=&offset=`) |
| PUT | `/flagged/{id}` | Mark flagged cell as fixed |
| DELETE | `/flagged/{id}` | Dismiss a flagged cell |

### CRUD (`/`)

Standard CRUD for programs, sections, courses, teachers, rooms, terms, entries.

| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/{resource}` | List / create |
| GET/PUT/DELETE | `/{resource}/{id}` | Read / update / delete |

### Query (`/query/`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/query/entries` | Joined entries with filters |
| GET | `/query/teacher-schedule` | Weekly schedule by teacher code |
| GET | `/query/room-schedule` | Weekly bookings by room code |
| GET | `/query/available-rooms` | Free rooms for a given day + slot |

## Tests

```bash
python -m pytest tests/ -v
```

## Architecture

```
PDF → loader → grid → parser → validator → DB upsert → SQLite export
```
