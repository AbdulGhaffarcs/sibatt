# SlotFinder

A modern timetable search engine for Sukkur IBA University. Search and filter class schedules by section, teacher, or room. Built with a Python backend and Next.js frontend, optimized for mobile-first experience.

## 🎯 Features

- **Multi-filter search**: Find classes by section, instructor, or classroom
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

### Development

**Frontend:**
```bash
cd frontend
npm install
npm run dev          # Start dev server on http://localhost:3000
npm run test:watch  # Watch mode for tests
```

**Backend:**
See `backend/README.md` for setup and API documentation.

### Building

**Frontend:**
```bash
npm run build  # Production build
npm start      # Start production server
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
