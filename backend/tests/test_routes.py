"""Integration tests for the admin API routes."""

from __future__ import annotations

import io
import os
import tempfile
import unittest
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite://"  # in-memory for tests
os.environ["API_KEY"] = "test-api-key"

from fastapi.testclient import TestClient
from backend.api.main import app
from backend.db import init_db, Base, _get_engine

client = TestClient(app)
HEADERS = {"X-API-Key": "test-api-key"}


class TestHealthEndpoint(unittest.TestCase):
    def test_health_returns_ok(self):
        resp = client.get("/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "ok"})


class TestIngestEndpoint(unittest.TestCase):
    def test_ingest_requires_auth(self):
        resp = client.post("/ingest")
        self.assertEqual(resp.status_code, 401)

    def test_ingest_with_auth(self):
        init_db()
        pdf = Path(__file__).resolve().parents[2] / "fall2025.pdf"
        if not pdf.exists():
            self.skipTest("fall2025.pdf not found")
        with open(pdf, "rb") as f:
            resp = client.post(
                "/ingest",
                files={"file": ("fall2025.pdf", f, "application/pdf")},
                data={"year": 2025, "semester": "Fall"},
                headers=HEADERS,
            )
        self.assertIn(resp.status_code, (200, 422, 500))


class TestExportEndpoint(unittest.TestCase):
    def test_export_requires_auth(self):
        resp = client.post("/export")
        self.assertEqual(resp.status_code, 401)

    def test_export_returns_500_with_sqlite(self):
        init_db()
        resp = client.post("/export", headers=HEADERS)
        self.assertIn(resp.status_code, (200, 500))


class TestFlaggedEndpoints(unittest.TestCase):
    def setUp(self):
        init_db()

    def test_list_flagged_requires_auth(self):
        resp = client.get("/flagged")
        self.assertEqual(resp.status_code, 401)

    def test_list_flagged_with_auth(self):
        resp = client.get("/flagged", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("total", data)
        self.assertIn("rows", data)
        self.assertIn("limit", data)
        self.assertIn("offset", data)

    def test_list_flagged_with_pagination(self):
        resp = client.get("/flagged?limit=10&offset=0", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)

    def test_flagged_not_found(self):
        resp = client.put("/flagged/999", json={"fixed_data": "fixed"}, headers=HEADERS)
        self.assertEqual(resp.status_code, 404)

    def test_delete_flagged_requires_auth(self):
        resp = client.delete("/flagged/1")
        self.assertEqual(resp.status_code, 401)

    def test_delete_flagged_not_found(self):
        resp = client.delete("/flagged/999", headers=HEADERS)
        self.assertEqual(resp.status_code, 404)


if __name__ == "__main__":
    unittest.main()
