# Sibatt Backend

The backend provides the admin API and exports the timetable database used by the frontend. Run all commands from the repository root, not from `backend/`.

## Run the backend

Create the virtual environment and install dependencies once:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
```

Start the backend:

```bash
source .venv/bin/activate
export API_KEY=dev-api-key-change-me
uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000
```

The API runs at <http://127.0.0.1:8000>. Open <http://127.0.0.1:8000/docs> for the API documentation.

## Configure feedback email

Feedback is sent by email and is not stored in the database. Set these variables
on the backend deployment:

```bash
export FEEDBACK_RECIPIENT_EMAIL=your@email.com
export SMTP_HOST=smtp.example.com
export SMTP_PORT=587
export SMTP_USER=your-smtp-user
export SMTP_PASSWORD=your-smtp-password
export SMTP_FROM=slotfinder@example.com
export SMTP_USE_TLS=true
```

The frontend build must also set `NEXT_PUBLIC_FEEDBACK_API_URL` to the public
URL of this backend, for example `https://api.example.com`.

## Check the backend

In another terminal:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

## Refresh the frontend timetable

When the current backend database changes, regenerate the SQLite bundle used by the frontend:

```bash
source .venv/bin/activate
python -m backend.scripts.export_sqlite
```

This writes `frontend/public/timetable.db`. Refresh the frontend page afterwards.
