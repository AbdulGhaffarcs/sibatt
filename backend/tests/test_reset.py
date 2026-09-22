"""Tests for targeted timetable reset behaviour."""

from __future__ import annotations

import unittest

from sqlalchemy import text

from backend.db import Base, SessionLocal, _get_engine, init_db
from backend.db.models import Course, Entry, Program, Room, Section, Teacher, Term
from backend.db.models import Course, Entry, Program, Room, Section, Teacher, Term, Timeslot
from backend.db.reset import reset_timetable_data
from backend.db.seed import seed_term, seed_timeslots


class TestTimetableReset(unittest.TestCase):
    def setUp(self):
        init_db()
        Base.metadata.drop_all(_get_engine())
        Base.metadata.create_all(_get_engine())

    def test_reset_removes_imported_rows_and_keeps_timeslots(self):
        with SessionLocal() as db:
            seed_timeslots(db)
            term = seed_term(db, 2026, "Fall")
            program = Program(name="BS Test")
            course = Course(name="Test Course")
            teacher = Teacher(code="TT", name="TT", dept="")
            room = Room(code="R-1", building="")
            db.add_all([program, course, teacher, room])
            db.flush()
            section = Section(program_id=program.id, semester=1, section="A")
            db.add(section)
            db.flush()
            db.add(Entry(
                term_id=term.id, section_id=section.id, course_id=course.id,
                teacher_id=teacher.id, room_id=room.id, timeslot_id=1, day="Monday",
            ))
            db.commit()

            deleted = reset_timetable_data(db)

            self.assertEqual(deleted["entries"], 1)
            self.assertEqual(db.query(Entry).count(), 0)
            self.assertEqual(db.query(Term).count(), 0)
            self.assertEqual(db.query(Program).count(), 0)
            self.assertEqual(db.execute(text("SELECT COUNT(*) FROM timeslots")).scalar(), 10)

    def test_seed_timeslots_repairs_existing_times(self):
        with SessionLocal() as db:
            seed_timeslots(db)
            slot = db.query(Timeslot).filter_by(slot_no=7).one()
            slot.start_time = "16:00"
            db.commit()

            seed_timeslots(db)

            repaired = db.query(Timeslot).filter_by(slot_no=7).one()
            self.assertEqual((repaired.start_time, repaired.end_time), ("16:10", "17:00"))
