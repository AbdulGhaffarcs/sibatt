## Staging deployment

Staging is intentionally separate from production. Deploy the `staging` branch to a separate Vercel project or to a host that runs `staging/Dockerfile`; do not use the production project or database.

### Vercel preview

1. Create a separate Vercel project for staging and add `VERCEL_STAGING_PROJECT_ID` as a GitHub Actions secret. Reuse the organization and token secrets only if they are scoped to both projects.
2. Enable Vercel Deployment Protection/password protection for that project. The workflow deploys a preview URL, not a production deployment.
3. Create and push the branch with `git switch -c staging` and `git push -u origin staging`.
4. Share only the generated preview URL and the Vercel protection password with testers.

The staging build sets `NEXT_PUBLIC_STAGING=true`, emits `Disallow: /`, and adds `X-Robots-Tag: noindex, nofollow, noarchive`. Production builds keep their existing metadata.

### Docker host

For Render, Railway, Fly.io, or another Docker host, deploy from the `staging` branch using `staging/Dockerfile`. Set the variables in `.env.staging.example` as host secrets. The container requires HTTP Basic Auth, serves noindex headers, and uses the separate `slotfinder-staging` database volume from `docker-compose.staging.yml`.

For a local smoke test:

```bash
cp .env.staging.example .env.staging
docker compose --env-file .env.staging -f docker-compose.staging.yml up --build
```

Open `http://localhost:8080` and use the configured Basic Auth credentials. Never reuse production database credentials or the production API key.

### Promotion

After testing, merge `staging` into `main`. The existing production workflow then deploys the production Vercel project. No staging database volume is reused during promotion.
# SlotFinder

A modern timetable search engine for Sukkur IBA University. Search and filter class schedules by section, course, or room. Built with a Python backend and Next.js frontend, optimized for mobile-first experience.

## 🎯 Features

- **Multi-filter search**: Find classes by section, courses, or classroom
- **Mobile-first design**: Responsive UI optimized for all devices
- **Offline-capable**: SQLite database bundled for static site performance
- **PDF-powered**: Automatic timetable extraction from institutional PDFs

## 📁 Architecture

The project is structured as a monorepo with three main components:

```
slotfinder/
├── backend/       # Python (63.5%)
│   ├── PDF extraction & processing
│   ├── SQLite database management
│   └── FastAPI admin routes
│
├── frontend/      # TypeScript/JavaScript (36.1%)
│   ├── Next.js 14 static site
│   ├── React components
│   ├── Tailwind CSS styling
│   ├── sql.js for client-side DB queries
│   └── Vitest for testing
│
└── shared/        # Data & Contracts
    ├── JSON data schema
    └── Timeslots seed data
```

### Tech Stack

**Backend:**
- FastAPI (Python)
- PDF extraction & processing
- SQLite database

**Frontend:**
- Next.js 14
- React 18
- Tailwind CSS
- sql.js (in-browser SQLite)
- Vitest for testing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+

### Run locally

Open two terminals from the repository root.

**Terminal 1 — backend:**

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
export API_KEY=dev-api-key-change-me
uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000
```

The admin API runs at <http://127.0.0.1:8000>; its interactive documentation is at <http://127.0.0.1:8000/docs>.

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>.

### Load a new timetable

From the repository root, with the virtual environment activated:

```bash
python -m backend.scripts.ingest /home/UserX/slot-finder/fall2026.pdf --year 2026 --semester Fall --replace --export
```

This replaces previously imported timetable data, preserves shared timeslots, and writes the bundle read by the frontend. See [the backend guide](backend/README.md) for reset and API commands.

### Building

**Frontend:**
```bash
cd frontend
npm run build  # Production build
python3 -m http.server 3000 --directory out  # Serve the static build
```

## 👥 Team

| Developer | GitHub |
|-----------|--------|
| Abdul | [@AbdulGhaffarcs](https://github.com/AbdulGhaffarcs) |
| Qasim | [@qasimio](https://github.com/qasimio) |

## 📝 License

TBD

## 🤝 Contributing

Contributions welcome! Please see individual README files in `backend/` and `frontend/` for development guidelines.
