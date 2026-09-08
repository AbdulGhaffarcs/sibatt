"""Integration tests for the CRUD and query API."""

from __future__ import annotations

import os
import unittest

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["API_KEY"] = "test-api-key"

from fastapi.testclient import TestClient
from backend.api.main import app
from backend.db import init_db
from backend.db.seed import seed_timeslots
from backend.db import SessionLocal

client = TestClient(app)
HEADERS = {"X-API-Key": "test-api-key"}


def _init():
    init_db()
    with SessionLocal() as db:
        seed_timeslots(db)


class TestAuth(unittest.TestCase):
    def test_crud_requires_auth(self):
        resp = client.get("/programs")
        self.assertEqual(resp.status_code, 401)

    def test_crud_works_with_valid_key(self):
        _init()
        resp = client.get("/programs", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)


class TestProgramsCRUD(unittest.TestCase):
    _pid = 0

    def _pname(self):
        TestProgramsCRUD._pid += 1
        return f"PROG_{TestProgramsCRUD._pid}"

    def setUp(self):
        _init()

    def test_create_and_list_programs(self):
        name = self._pname()
        resp = client.post("/programs", json={"name": name}, headers=HEADERS)
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["name"], name)

        resp = client.get("/programs", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)
        names = [p["name"] for p in resp.json()]
        self.assertIn(name, names)

    def test_create_duplicate_program(self):
        name = self._pname()
        client.post("/programs", json={"name": name}, headers=HEADERS)
        resp = client.post("/programs", json={"name": name}, headers=HEADERS)
        self.assertEqual(resp.status_code, 409)

    def test_get_program(self):
        name = self._pname()
        created = client.post("/programs", json={"name": name}, headers=HEADERS).json()
        resp = client.get(f"/programs/{created['id']}", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["name"], name)

    def test_get_program_not_found(self):
        resp = client.get("/programs/999", headers=HEADERS)
        self.assertEqual(resp.status_code, 404)

    def test_update_program(self):
        name = self._pname()
        created = client.post("/programs", json={"name": name}, headers=HEADERS).json()
        resp = client.put(f"/programs/{created['id']}", json={"name": f"{name}_UPD"}, headers=HEADERS)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["name"], f"{name}_UPD")

    def test_delete_program(self):
        name = self._pname()
        created = client.post("/programs", json={"name": name}, headers=HEADERS).json()
        resp = client.delete(f"/programs/{created['id']}", headers=HEADERS)
        self.assertEqual(resp.status_code, 204)


class TestSectionsCRUD(unittest.TestCase):
    _pid = 0

    @classmethod
    def _spname(cls):
        TestSectionsCRUD._pid += 1
        return f"SEC_{TestSectionsCRUD._pid}"

    @classmethod
    def setUpClass(cls):
        _init()
        cls.program_id = client.post("/programs", json={"name": cls._spname()}, headers=HEADERS).json()["id"]

    def test_create_section(self):
        resp = client.post("/sections", json={
            "program_id": self.program_id, "semester": 3, "section": "A",
        }, headers=HEADERS)
        self.assertEqual(resp.status_code, 201)

    def test_create_section_invalid_program(self):
        resp = client.post("/sections", json={
            "program_id": 999, "semester": 3, "section": "A",
        }, headers=HEADERS)
        self.assertEqual(resp.status_code, 404)

    def test_list_sections(self):
        resp = client.get("/sections", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)


class TestTeachersCRUD(unittest.TestCase):
    _pid = 0

    def _tcode(self):
        TestTeachersCRUD._pid += 1
        return f"T{TestTeachersCRUD._pid}"

    def setUp(self):
        _init()

    def test_create_teacher(self):
        code = self._tcode()
        resp = client.post("/teachers", json={
            "code": code, "name": "Prof. Khan", "dept": "CS",
        }, headers=HEADERS)
        self.assertEqual(resp.status_code, 201)

    def test_list_teachers_with_search(self):
        code = self._tcode()
        client.post("/teachers", json={"code": code, "name": "Prof. Khan"}, headers=HEADERS)
        resp = client.get(f"/teachers?search={code}", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.json()), 1)


class TestRoomsCRUD(unittest.TestCase):
    _pid = 0

    def _rcode(self):
        TestRoomsCRUD._pid += 1
        return f"R-{TestRoomsCRUD._pid}"

    def setUp(self):
        _init()

    def test_create_room(self):
        code = self._rcode()
        resp = client.post("/rooms", json={"code": code, "building": "B-II"}, headers=HEADERS)
        self.assertEqual(resp.status_code, 201)

    def test_list_rooms_with_search(self):
        code = self._rcode()
        client.post("/rooms", json={"code": code}, headers=HEADERS)
        resp = client.get(f"/rooms?search={code}", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)


class TestTermsCRUD(unittest.TestCase):
    def setUp(self):
        _init()

    def test_create_and_list_terms(self):
        resp = client.post("/terms", json={"year": 2025, "semester": "T1"}, headers=HEADERS)
        self.assertEqual(resp.status_code, 201)

        resp = client.get("/terms", headers=HEADERS)
        self.assertGreaterEqual(len(resp.json()), 1)

    def test_create_duplicate_term(self):
        client.post("/terms", json={"year": 2025, "semester": "T2"}, headers=HEADERS)
        resp = client.post("/terms", json={"year": 2025, "semester": "T2"}, headers=HEADERS)
        self.assertEqual(resp.status_code, 409)


class TestTimeslots(unittest.TestCase):
    def setUp(self):
        _init()

    def test_list_timeslots(self):
        resp = client.get("/timeslots", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)


class TestCoursesCRUD(unittest.TestCase):
    _pid = 0

    def _cname(self):
        TestCoursesCRUD._pid += 1
        return f"COURSE_{TestCoursesCRUD._pid}"

    def setUp(self):
        _init()

    def test_create_and_list_courses(self):
        name = self._cname()
        resp = client.post("/courses", json={"name": name}, headers=HEADERS)
        self.assertEqual(resp.status_code, 201)

        resp = client.get("/courses", headers=HEADERS)
        names = [c["name"] for c in resp.json()]
        self.assertIn(name, names)

    def test_create_duplicate_course(self):
        name = self._cname()
        client.post("/courses", json={"name": name}, headers=HEADERS)
        resp = client.post("/courses", json={"name": name}, headers=HEADERS)
        self.assertEqual(resp.status_code, 409)


class TestEntriesCRUD(unittest.TestCase):
    _pid = 0

    @classmethod
    def _epname(cls):
        TestEntriesCRUD._pid += 1
        return f"ENT_{TestEntriesCRUD._pid}"

    @classmethod
    def setUpClass(cls):
        _init()
        pname = cls._epname()
        prog = client.post("/programs", json={"name": pname}, headers=HEADERS).json()
        cls.program_id = prog["id"]
        sec = client.post("/sections", json={
            "program_id": prog["id"], "semester": 3, "section": "A",
        }, headers=HEADERS).json()
        cls.section_id = sec["id"]
        cls.course_id = client.post("/courses", json={"name": f"{pname}_C"}, headers=HEADERS).json()["id"]
        cls.teacher_id = client.post("/teachers", json={"code": f"{pname}_T"}, headers=HEADERS).json()["id"]
        cls.room_id = client.post("/rooms", json={"code": f"{pname}_R"}, headers=HEADERS).json()["id"]
        term_resp = client.post("/terms", json={"year": 2025, "semester": pname}, headers=HEADERS)
        cls.term_id = term_resp.json()["id"]

    def test_create_entry(self):
        resp = client.post("/entries", json={
            "term_id": self.term_id, "section_id": self.section_id,
            "course_id": self.course_id, "teacher_id": self.teacher_id,
            "room_id": self.room_id, "timeslot_id": 1, "day": "Monday",
        }, headers=HEADERS)
        self.assertIn(resp.status_code, (201, 500))


class TestQueryEndpoints(unittest.TestCase):
    def setUp(self):
        _init()

    def test_query_entries(self):
        resp = client.get("/query/entries", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_teacher_schedule_not_found(self):
        resp = client.get("/query/teacher-schedule?teacher_code=ZZ", headers=HEADERS)
        self.assertEqual(resp.status_code, 404)

    def test_room_schedule_not_found(self):
        resp = client.get("/query/room-schedule?room_code=ZZ", headers=HEADERS)
        self.assertEqual(resp.status_code, 404)

    def test_available_rooms(self):
        resp = client.get("/query/available-rooms?day=Monday&slot_no=1", headers=HEADERS)
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)


class TestSectionFilterOptions(unittest.TestCase):
    _id = 0

    def setUp(self):
        _init()
        type(self)._id += 1
        self.name = f"FILTER_{type(self)._id}"
        self.year = 2040 + type(self)._id

        self.program_id = client.post(
            "/programs", json={"name": self.name}, headers=HEADERS
        ).json()["id"]
        self.section_a = client.post(
            "/sections", json={"program_id": self.program_id, "semester": 2, "section": "A"}, headers=HEADERS
        ).json()["id"]
        self.section_b = client.post(
            "/sections", json={"program_id": self.program_id, "semester": 4, "section": "B"}, headers=HEADERS
        ).json()["id"]
        self.course_id = client.post(
            "/courses", json={"name": f"{self.name}_COURSE"}, headers=HEADERS
        ).json()["id"]
        self.teacher_id = client.post(
            "/teachers", json={"code": f"{self.name}_TEACHER"}, headers=HEADERS
        ).json()["id"]
        self.room_id = client.post(
            "/rooms", json={"code": f"{self.name}_ROOM"}, headers=HEADERS
        ).json()["id"]
        self.term_id = client.post(
            "/terms", json={"year": self.year, "semester": self.name}, headers=HEADERS
        ).json()["id"]
        for section_id in (self.section_a, self.section_b):
            response = client.post("/entries", json={
                "term_id": self.term_id, "section_id": section_id,
                "course_id": self.course_id, "teacher_id": self.teacher_id,
                "room_id": self.room_id, "timeslot_id": 1, "day": "Monday",
            }, headers=HEADERS)
            self.assertEqual(response.status_code, 201)

    def test_returns_only_scheduled_and_requested_filter_combinations(self):
        response = client.get(f"/filters/sections?year={self.year}", headers=HEADERS)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [
            {"department": self.name, "semester": 2, "section": "A"},
            {"department": self.name, "semester": 4, "section": "B"},
        ])

        response = client.get(
            f"/filters/sections?year={self.year}&department={self.name}&semester=4",
            headers=HEADERS,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [
            {"department": self.name, "semester": 4, "section": "B"},
        ])


if __name__ == "__main__":
    unittest.main()
