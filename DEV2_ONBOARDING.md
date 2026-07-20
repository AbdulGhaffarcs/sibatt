# SlotFinder — Dev 2 Onboarding

> For Qasim (@qasimio). Last updated: July 2026.

---

## 1. What Is This?

**SlotFinder** is a timetable search engine for **Sukkur IBA University**. Students pick their program/semester/section and see a day-by-day class schedule. They can also search by teacher or room. Mobile-first, static deployment.

**Architecture:**

```
┌─────────────────────────────────────────────────┐
│  PDF (aSc Timetables export)                    │
└──────────────┬──────────────────────────────────┘
               │ upload via API
               ▼
┌──────────────────────┐     ┌──────────────────┐
│  Backend (FastAPI)   │────▶│  PostgreSQL       │
│  - PDF extraction    │     │  9 tables         │
│  - Validation        │     └──────────────────┘
│  - Admin API         │            │
└──────────────────────┘            │ export
               │                    ▼
               │         ┌──────────────────┐
               │         │  SQLite bundle   │
               │         │  (timetable.db)  │
               │         └──────────────────┘
               │                    │
               ▼                    ▼
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js 14 + Tailwind + sql.js)      │
│  - Static site, no runtime backend calls        │
│  - Loads SQLite client-side via sql.js           │
│  - 3 views: Timetable, Teachers, Rooms          │
└─────────────────────────────────────────────────┘
```

The frontend **never talks to PostgreSQL directly**. It reads a pre-built SQLite file from `/public/timetable.db`.

---

## 2. Project Structure

```
slotfinder/
├── backend/                    # Python/FastAPI
│   ├── api/
│   │   ├── main.py             # FastAPI app, CORS, lifespan
│   │   ├── routes.py           # 5 endpoints (health, ingest, export, flagged)
│   │   └── crud.py             # CRUD + query API (30+ endpoints, 699 lines)
│   ├── db/
│   │   ├── __init__.py         # Engine, session factory, Base, get_db()
│   │   ├── models.py           # 8 SQLAlchemy ORM models
│   │   ├── export.py           # PostgreSQL → SQLite export (with ID validation)
│   │   └── seed.py             # Seed timeslots + term
│   ├── extractor/
│   │   ├── loader.py           # PDF loading + MD5 hash dedup
│   │   ├── grid.py             # Reconstruct cell bounding boxes from vector lines
│   │   ├── parser.py           # Assign words to cells by position
│   │   └── validator.py        # Classify cells → EntryData + FlaggedCell (749 lines)
│   ├── scripts/
│   │   ├── ingest.py           # Full pipeline: PDF → DB upsert
│   │   └── export_sqlite.py    # CLI wrapper for export
│   ├── tests/
│   │   └── test_extractor.py   # 4 unit tests (loader, grid, parser only)
│   ├── .env.example            # DATABASE_URL template
│   ├── Dockerfile              # Python 3.12-slim container
│   └── requirements.txt
├── frontend/                   # Next.js 14 + Tailwind
│   ├── app/
│   │   ├── layout.tsx          # Root layout, Inter font, metadata, OG tags, SW register
│   │   ├── page.tsx            # Main page — loads SQLite, manages views
│   │   └── globals.css
│   ├── components/
│   │   ├── timetable/
│   │   │   ├── ClassCard.tsx       # Single class entry card
│   │   │   ├── DaySelector.tsx     # Mo-Tu-We-Th-Fr pill row
│   │   │   ├── DayView.tsx         # Weekly view for one section
│   │   │   └── SectionPicker.tsx   # Program → semester → section picker
│   │   ├── search/
│   │   │   ├── TeacherSearch.tsx   # Search by name/code, view schedule
│   │   │   └── RoomSearch.tsx      # Search by room, view bookings
│   │   └── ui/
│   │       ├── BottomNav.tsx       # Fixed bottom nav (3 tabs)
│   │       ├── DayTabs.tsx         # Reusable day tab row
│   │       └── SWRegister.tsx      # Service worker registration
│   ├── lib/
│   │   ├── db.ts               # sql.js loader + query helpers
│   │   ├── search.ts           # buildTeacherIndex()
│   │   └── constants.ts        # DAY_KEYS, SEM_ROMAN, DAY_FULL
│   ├── tests/
│   │   ├── setup.ts            # vitest + jest-dom setup
│   │   ├── BottomNav.test.tsx  # 4 tests
│   │   ├── ClassCard.test.tsx  # 8 tests
│   │   ├── DaySelector.test.tsx# 4 tests
│   │   └── search.test.ts      # 4 tests (buildTeacherIndex)
│   ├── types/
│   │   └── sql.js.d.ts
│   ├── public/
│   │   ├── timetable.db        # SQLite bundle (generated)
│   │   ├── favicon.svg         # SVG favicon
│   │   ├── manifest.json       # PWA manifest
│   │   └── sw.js               # Service worker (cache-first)
│   ├── vitest.config.ts        # Vitest config (jsdom, react plugin)
│   ├── package.json
│   └── next.config.js
├── shared/
│   ├── contract.md             # JSON record shape both sides agree on
│   └── timeslots.json          # 10 daily slots (09:00–20:00)
├── docker-compose.yml          # PostgreSQL 16 + backend service
├── fall2025.pdf                # Sample timetable PDF
├── pdf_hash.txt                # MD5 cache for dedup
└── slotfinder.db               # Local SQLite (dev fallback)
```

---

## 3. Database Schema (9 tables)

```
programs          sections           courses
┌──────────┐     ┌──────────────┐   ┌──────────┐
│ id (PK)  │◀─┐  │ id (PK)      │   │ id (PK)  │
│ name     │  └──│ program_id   │   │ name     │
└──────────┘     │ semester     │   └─────┬────┘
                 │ section      │         │
                 └──────┬───────┘         │
                        │                 │
teachers                │                 │
┌──────────┐           │                 │
│ id (PK)  │           │                 │
│ code (UQ)│           │                 │
│ name     │           │                 │
│ dept     │           │                 │
└─────┬────┘           │                 │
      │                │                 │
rooms │                │                 │
┌──────────┐           │                 │
│ id (PK)  │           │                 │
│ code (UQ)│           │                 │
│ building │           │                 │
└─────┬────┘           │                 │
      │                │                 │
timeslots              │                 │
┌──────────┐           │                 │
│ id (PK)  │           │                 │
│ slot_no  │           │                 │
│ start_time│          │                 │
│ end_time  │          │                 │
└─────┬────┘           │                 │
      │                │                 │
      │    ┌───────────┴─────────────────┘
      │    │
      ▼    ▼
┌─────────────────────────────────────────┐
│ entries (the core timetable data)       │
│ ─────────────────────────────────────── │
│ id (PK)                                 │
│ term_id     → terms.id                  │
│ section_id  → sections.id               │
│ course_id   → courses.id                │
│ teacher_id  → teachers.id               │
│ room_id     → rooms.id                  │
│ timeslot_id → timeslots.id              │
│ day         (Monday, Tuesday, ...)      │
│ is_online   (boolean)                   │
└─────────────────────────────────────────┘

terms
┌──────────┐
│ id (PK)  │
│ year     │
│ semester │  ("Fall", "Spring")
└──────────┘

flagged_cells
┌────────────────────┐
│ id (PK)            │
│ term_id → terms.id │
│ raw_text           │
│ cell_bbox          │
│ flags              │
│ status             │  ("pending", "fixed")
│ fixed_data         │
└────────────────────┘
```

---

## 4. Backend — How It Works

### 4.1 PDF Extraction Pipeline

The pipeline runs inside `backend/scripts/ingest.py` → `ingest_pdf()`:

```
PDF file
  │
  ▼ load_pdf()          — MD5 hash check, skip if unchanged
  │
  ▼ extract_grid()      — Reconstruct cells from vector lines
  │                       (horizontal/vertical line detection → cell bboxes)
  │
  ▼ parse_page()        — Assign words to cells by word-center containment
  │                       (collapse words, merge split suffixes)
  │
  ▼ classify_cells()    — Parse cell text into structured data:
  │                       - Extract section letter from cell start
  │                       - Extract room (R-XXX pattern)
  │                       - Extract teacher code (uppercase abbreviation)
  │                       - Extract course name (remaining text)
  │                       - Map cell position → day + slot
  │                       - Return EntryData + FlaggedCell for failures
  │
  ▼ _get_or_create()    — Upsert to PostgreSQL:
      (per entry)        - Program, Section, Course, Teacher, Room, Timeslot
                         - Entry (with dedup check)
                         - FlaggedCell (for unclassifiable cells)
```

### 4.2 API Endpoints

The app uses two routers mounted in `main.py`:

#### Admin Router (`routes.py`) — 5 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | DB liveness check |
| `POST` | `/ingest` | None | Upload PDF, runs full pipeline |
| `POST` | `/export` | None | PostgreSQL → SQLite file |
| `GET` | `/flagged?status=pending` | None | List flagged cells |
| `PUT` | `/flagged/{id}` | None | Mark flagged cell as fixed |

#### CRUD + Query Router (`crud.py`) — 30+ endpoints

| Resource | Endpoints | Notes |
|----------|-----------|-------|
| Programs | `GET/POST`, `GET/PUT/DELETE /{id}` | Full CRUD |
| Sections | `GET/POST`, `GET/PUT/DELETE /{id}` | Filterable by `program_id`, `semester` |
| Courses | `GET/POST`, `GET/PUT/DELETE /{id}` | Full CRUD |
| Teachers | `GET/POST`, `GET/PUT/DELETE /{id}` | Searchable by `code`/`name` |
| Rooms | `GET/POST`, `GET/PUT/DELETE /{id}` | Searchable by `code`/`building` |
| Terms | `GET/POST`, `GET /{id}` | Read + create only |
| Timeslots | `GET` | Read-only |
| Entries | `GET/POST`, `GET/DELETE /{id}` | Filterable by `term_id`, `section_id`, etc. |

**Query Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/query/entries` | Full joined query with filters (teacher_code, room, day, program, semester, section) |
| `GET` | `/query/teacher-schedule` | Weekly schedule for a teacher by code |
| `GET` | `/query/room-schedule` | Weekly bookings for a room by code |
| `GET` | `/query/available-rooms` | Unbooked rooms for a given day + slot |

**Key observations:**
- No authentication on any endpoint
- `PUT /flagged/{id}` accepts `fixed_data` as a raw string — no validation
- No DELETE endpoint for flagged cells

### 4.3 ORM Models (`backend/db/models.py`)

8 models, all using SQLAlchemy 2.0 `Mapped` style:
- `Program`, `Section`, `Course`, `Teacher`, `Room`, `Timeslot`, `Term`, `Entry`
- Plus `FlaggedCell` (has `relationship()` to Term)
- `Section` has a unique constraint on `(program_id, semester, section)`
- `Teacher` and `Room` have unique constraints on `code`
- `Term` has a unique constraint on `(year, semester)`

### 4.4 Database Config (`backend/db/__init__.py`)

- Uses `DATABASE_URL` env var, defaults to local SQLite (`slotfinder.db`)
- In Docker, connects to PostgreSQL via `postgresql://postgres:postgres@db:5432/slotfinder`
- `init_db()` creates all tables via `Base.metadata.create_all()`
- `get_db()` is a FastAPI dependency yielding a session

### 4.5 Export (`backend/db/export.py`)

- Reads all 9 tables from PostgreSQL via raw SQL `SELECT` queries
- Creates SQLite file with hardcoded schema
- Uses `_safe_identifier()` to validate table/column names (regex whitelist) — prevents SQL injection

### 4.6 Seed (`backend/db/seed.py`)

- `seed_timeslots()` — reads `shared/timeslots.json`, inserts 10 rows
- `seed_term(year, semester)` — get-or-create a Term row
- Both are called at the start of `ingest_pdf()`

---

## 5. Frontend — How It Works

### 5.1 Data Loading

1. On mount, `page.tsx` calls `loadDB("/timetable.db")`
2. `db.ts` dynamically imports `sql.js`, fetches the SQLite file, creates an in-memory database
3. `getAllEntries()` runs a JOIN query across all tables, returns `FullEntry[]`
4. `buildTeacherIndex()` groups entries by teacher code
5. `getAllRooms()` gets distinct room codes

**All search/filtering happens in-memory on the client.**

### 5.2 Three Views

| View | Component | What It Does |
|------|-----------|--------------|
| **Timetable** | `DayView` + `SectionPicker` | Pick section → see day-by-day classes with "Up next" highlighting |
| **Teachers** | `TeacherSearch` | Search by name/code → tap to see full weekly schedule |
| **Rooms** | `RoomSearch` | Search by room code → see booked slots per day |

### 5.3 Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `ClassCard` | `components/timetable/ClassCard.tsx` | Single class card (time, course, room, teacher, slot) |
| `DaySelector` | `components/timetable/DaySelector.tsx` | Mo-Tu-We-Th-Fr pill row |
| `DayView` | `components/timetable/DayView.tsx` | Section header + day selector + class cards |
| `SectionPicker` | `components/timetable/SectionPicker.tsx` | Searchable grouped list of all sections |
| `TeacherSearch` | `components/search/TeacherSearch.tsx` | Teacher list with search, detail view with day tabs |
| `RoomSearch` | `components/search/RoomSearch.tsx` | Room list with search, detail view with day tabs |
| `BottomNav` | `components/ui/BottomNav.tsx` | Fixed bottom tab bar (Timetable / Teachers / Rooms) |
| `DayTabs` | `components/ui/DayTabs.tsx` | Reusable day tab row (used in Teacher/Room detail) |

### 5.4 Data Shape (ClassEntry)

```typescript
interface ClassEntry {
  id: number
  course: string
  teacher_code: string
  teacher_name: string
  room: string
  building: string
  section: string
  program: string
  semester: number
  term: string
  slot: number
  start_time: string
  end_time: string
  day: string           // "Monday", "Tuesday", ...
  is_online: boolean
}
```

---

## 6. How to Run

### Prerequisites
- Docker Desktop (for PostgreSQL)
- Python 3.12+
- Node.js 18+

### Backend (with Docker)

```bash
# Start PostgreSQL + backend
docker-compose up -d

# Ingest a PDF
curl -X POST http://localhost:8000/ingest \
  -F "file=@fall2025.pdf" \
  -F "year=2025" \
  -F "semester=Fall"

# Export to SQLite
curl -X POST http://localhost:8000/export

# Check flagged cells
curl http://localhost:8000/flagged?status=pending
```

### Backend (without Docker — local SQLite)

```bash
cd backend
pip install -r requirements.txt

# Ingest (uses local slotfinder.db by default)
python -m backend.scripts.ingest ../fall2025.pdf --year 2025 --semester Fall

# Export
python -m backend.scripts.export_sqlite
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### Run Tests

```bash
# Backend tests
cd backend
python -m pytest tests/ -v

# Frontend tests
cd frontend
npm test
```

---

## 7. What's Done (Abdul — Dev 1)

### Backend — Complete
- [x] PDF extraction pipeline (grid → parser → validator → ingest)
- [x] MD5-based change detection (skip re-ingestion of same PDF)
- [x] SQLAlchemy ORM models with full relationships
- [x] PostgreSQL connection + table creation
- [x] PostgreSQL → SQLite export
- [x] FastAPI admin API (5 endpoints)
- [x] Docker Compose setup (PostgreSQL + backend)
- [x] Seed script for timeslots and terms
- [x] CLI scripts for ingest and export
- [x] CRUD + Query API (`crud.py` — 30+ endpoints)
- [x] FlaggedCell `relationship()` to Term (fixed)
- [x] Export SQL injection prevention (`_safe_identifier()`)
- [x] Backend Dockerfile

### Frontend — Complete
- [x] Next.js 14 app with Tailwind CSS
- [x] sql.js client-side SQLite loading
- [x] Section picker (searchable, grouped by program)
- [x] Day view with "Up next" highlighting
- [x] Teacher search with weekly schedule view
- [x] Room search with booking view
- [x] Bottom navigation bar
- [x] Mobile-first responsive design
- [x] Static export build (`next build`)
- [x] Favicon (SVG)
- [x] OpenGraph + Twitter meta tags
- [x] PWA manifest + service worker (offline caching)
- [x] `constants.ts` (DAY_KEYS, SEM_ROMAN, DAY_FULL)
- [x] `DayTabs` reusable component

### Tests — Partial
- [x] 4 unit tests for loader, grid, parser (backend)
- [x] 20 frontend component tests (BottomNav, ClassCard, DaySelector, search)
- [ ] No tests for validator (749 lines, most complex file)
- [ ] No tests for API endpoints (routes or crud)
- [ ] No integration tests

---

## 8. What's Remaining (Dev 2 — You)

### Priority 1: Critical

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 1 | **API authentication** | `routes.py`, `crud.py`, `main.py` | All endpoints wide open. Add API key or basic auth. |
| 2 | **Validator tests** | `tests/test_validator.py` | 749 lines, zero tests. Test `parse_room()`, `parse_teacher_code()`, `parse_cell_text()`, `classify_cells()`. |
| 3 | **API integration tests** | `tests/test_routes.py`, `tests/test_crud.py` | Use `httpx.AsyncClient` with FastAPI `TestClient`. Test admin + CRUD + query endpoints. |
| 4 | **CI/CD deployment** | `.github/workflows/deploy.yml` | Currently a stub (`echo "configure vercel action"`). Set up Vercel deploy. |

### Priority 2: Important

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 5 | **Flagged cell DELETE** | `routes.py` | Add `DELETE /flagged/{id}` to dismiss false positives. |
| 6 | **Flagged cell validation** | `routes.py` | `PUT /flagged/{id}` accepts raw string. Parse and validate `fixed_data`. |
| 7 | **Pagination on /flagged** | `routes.py` | Currently returns all rows. Add `limit`/`offset` params. |
| 8 | **Error handling** | `routes.py`, `crud.py`, `page.tsx` | API exposes raw exceptions. Add logging, typed errors, retry logic. |
| 9 | **Backend README** | `backend/README.md` | Currently doesn't exist. Document setup, API, pipeline. |
| 10 | **Frontend README** | `frontend/README.md` | Currently doesn't exist. Document dev, build, deploy. |

### Priority 3: Nice to Have

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 11 | **More frontend tests** | `frontend/tests/` | Add tests for SectionPicker, DayView, TeacherSearch, RoomSearch. |
| 12 | **Backend linting** | `pyproject.toml` | Add ruff or flake8 for consistent Python style. |

---

## 9. Key Files to Know

| Why you'd open it | File |
|--------------------|------|
| Add a new admin API endpoint | `backend/api/routes.py` |
| Add a new CRUD/query endpoint | `backend/api/crud.py` |
| Add a new DB model | `backend/db/models.py` |
| Change the extraction logic | `backend/extractor/validator.py` |
| Modify the ingestion pipeline | `backend/scripts/ingest.py` |
| Change what the frontend queries | `frontend/lib/db.ts` |
| Add a new frontend view | `frontend/app/page.tsx` + new component in `frontend/components/` |
| Change the SQLite schema | `backend/db/export.py` (lines 38-51) |
| Modify the JSON contract | `shared/contract.md` |
| Change timeslot definitions | `shared/timeslots.json` |
| Add frontend constants | `frontend/lib/constants.ts` |
| Run frontend tests | `frontend/vitest.config.ts` + `frontend/tests/` |

---

## 10. Git History

All 23 commits are from Abdul (`abdulghaffarcs`). Commits span June 15–23, 2026.

```
Jun 15  Initial project setup
Jun 18  Backend extraction pipeline (DaySelector, ClassCard, early frontend)
Jun 23  Full frontend build-out (all views, components, SQL.js, styling)
```

No branches other than `main`. No tags or releases.

**Uncommitted changes:** CRUD API, PWA support, frontend tests, export.py security fix, FlaggedCell relationship fix.

---

## 11. Environment Variables

| Variable | Default | Used In |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:///./slotfinder.db` | `backend/db/__init__.py` |
| — | `postgresql://postgres:postgres@db:5432/slotfinder` | `docker-compose.yml` |

---

## 12. Dependencies

### Backend (`requirements.txt`)
- `pymupdf` — PDF parsing (fitz)
- `fastapi` — API framework
- `uvicorn[standard]` — ASGI server
- `sqlalchemy` — ORM
- `psycopg2-binary` — PostgreSQL driver
- `python-dotenv` — env loading
- `python-multipart` — file uploads
- `pytest` — testing
- `httpx` — async HTTP client (for tests)

### Frontend (`package.json`)
- `next` 14.2.5
- `react` / `react-dom` ^18
- `sql.js` ^1.12.0 — client-side SQLite
- `tailwindcss` ^3.3.0
- `typescript` ^5

### Frontend Dev Dependencies
- `vitest` ^4.1.9 — test runner
- `@testing-library/react` ^16.3.2 — component testing
- `@testing-library/jest-dom` ^6.9.1 — DOM matchers
- `@vitejs/plugin-react` ^6.0.3 — React plugin for vitest
- `jsdom` ^29.1.1 — browser environment for tests

---

## 13. Tips

1. **The frontend never calls the backend API at runtime.** It reads a pre-built SQLite file. The API is only for admin tasks (ingest, export, flagged review) and CRUD/query operations.

2. **The validator (`validator.py`) is the most complex file.** It handles all the edge cases of parsing aSc Timetables PDF output. Read it carefully before modifying.

3. **`FlaggedCell` is a separate model from the core data.** It stores cells that couldn't be automatically parsed. The admin reviews them and provides `fixed_data` as a raw string.

4. **The SQLite file is the source of truth for the frontend.** If you change the PostgreSQL schema, you must update `export.py` and `db.ts` to match.

5. **Docker is optional for local dev.** The backend falls back to SQLite if `DATABASE_URL` isn't set. But you need PostgreSQL for the export pipeline to work correctly.

6. **Run `npm run build` in `frontend/` to regenerate the static export.** The `out/` directory contains the deployable site.

7. **Run frontend tests with `npm test` in `frontend/`.** Vitest is configured with jsdom and React plugin.

8. **The CRUD router (`crud.py`) uses Pydantic schemas** for input validation. Follow the same pattern when adding new endpoints.

9. **The export pipeline uses `_safe_identifier()`** to validate table/column names. Always use this when building dynamic SQL queries.
