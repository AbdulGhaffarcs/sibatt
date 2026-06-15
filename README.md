# SlotFinder

Sukkur IBA University timetable search engine.
Search by section, teacher, or room. Mobile-first.

## Structure

```
slotfinder/
├── backend/        # PDF extraction, DB, FastAPI admin routes
├── frontend/       # Next.js static site, reads SQLite bundle
└── shared/         # JSON contract, timeslots seed data
```

## Team

| Dev | Area |
|-----|------|
| Abdul (@AbdulGhaffarcs) | Extraction pipeline · DB · Teacher & Room search UI |
| Qasim (@qasimio) | SQLite export · Admin API · Timetable view · Deploy |

## Quick start

See `backend/README.md` and `frontend/README.md` (coming soon).
