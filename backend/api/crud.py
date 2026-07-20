"""CRUD and query API routes for timetable data."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from backend.api.auth import verify_api_key
from backend.db import get_db
from backend.db.models import (
    Course,
    Entry,
    Program,
    Room,
    Section,
    Teacher,
    Term,
    Timeslot,
)

router = APIRouter(dependencies=[Depends(verify_api_key)])


# ── Schemas ──────────────────────────────────────────────────────────────────


class ProgramCreate(BaseModel):
    name: str


class ProgramOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class SectionCreate(BaseModel):
    program_id: int
    semester: int
    section: str


class SectionOut(BaseModel):
    id: int
    program_id: int
    semester: int
    section: str

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    name: str


class CourseOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TeacherCreate(BaseModel):
    code: str
    name: str = ""
    dept: str = ""


class TeacherOut(BaseModel):
    id: int
    code: str
    name: str
    dept: str

    class Config:
        from_attributes = True


class RoomCreate(BaseModel):
    code: str
    building: str = ""


class RoomOut(BaseModel):
    id: int
    code: str
    building: str

    class Config:
        from_attributes = True


class TermCreate(BaseModel):
    year: int
    semester: str


class TermOut(BaseModel):
    id: int
    year: int
    semester: str

    class Config:
        from_attributes = True


class EntryCreate(BaseModel):
    term_id: int
    section_id: int
    course_id: int
    teacher_id: int
    room_id: int
    timeslot_id: int
    day: str
    is_online: bool = False


class EntryOut(BaseModel):
    id: int
    term_id: int
    section_id: int
    course_id: int
    teacher_id: int
    room_id: int
    timeslot_id: int
    day: str
    is_online: bool

    class Config:
        from_attributes = True


class EntryDetailOut(BaseModel):
    id: int
    day: str
    is_online: bool
    program: str
    semester: int
    section: str
    course: str
    teacher_code: str
    teacher_name: str
    room: str
    building: str
    slot_no: int
    start_time: str
    end_time: str
    term_label: str

    class Config:
        from_attributes = True


class TimeslotOut(BaseModel):
    id: int
    slot_no: int
    start_time: str
    end_time: str

    class Config:
        from_attributes = True


# ── Programs CRUD ────────────────────────────────────────────────────────────


@router.get("/programs", response_model=list[ProgramOut])
def list_programs(db: Session = Depends(get_db)):
    return db.query(Program).order_by(Program.name).all()


@router.post("/programs", response_model=ProgramOut, status_code=201)
def create_program(data: ProgramCreate, db: Session = Depends(get_db)):
    existing = db.query(Program).filter_by(name=data.name).first()
    if existing:
        raise HTTPException(409, "Program already exists")
    obj = Program(name=data.name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/programs/{program_id}", response_model=ProgramOut)
def get_program(program_id: int, db: Session = Depends(get_db)):
    obj = db.query(Program).get(program_id)
    if not obj:
        raise HTTPException(404, "Program not found")
    return obj


@router.put("/programs/{program_id}", response_model=ProgramOut)
def update_program(program_id: int, data: ProgramCreate, db: Session = Depends(get_db)):
    obj = db.query(Program).get(program_id)
    if not obj:
        raise HTTPException(404, "Program not found")
    obj.name = data.name
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/programs/{program_id}", status_code=204)
def delete_program(program_id: int, db: Session = Depends(get_db)):
    obj = db.query(Program).get(program_id)
    if not obj:
        raise HTTPException(404, "Program not found")
    db.delete(obj)
    db.commit()


# ── Sections CRUD ────────────────────────────────────────────────────────────


@router.get("/sections", response_model=list[SectionOut])
def list_sections(
    program_id: Optional[int] = None,
    semester: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Section)
    if program_id is not None:
        q = q.filter_by(program_id=program_id)
    if semester is not None:
        q = q.filter_by(semester=semester)
    return q.order_by(Section.program_id, Section.semester, Section.section).all()


@router.post("/sections", response_model=SectionOut, status_code=201)
def create_section(data: SectionCreate, db: Session = Depends(get_db)):
    existing = db.query(Section).filter_by(
        program_id=data.program_id, semester=data.semester, section=data.section
    ).first()
    if existing:
        raise HTTPException(409, "Section already exists")
    if not db.query(Program).get(data.program_id):
        raise HTTPException(404, "Program not found")
    obj = Section(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/sections/{section_id}", response_model=SectionOut)
def get_section(section_id: int, db: Session = Depends(get_db)):
    obj = db.query(Section).get(section_id)
    if not obj:
        raise HTTPException(404, "Section not found")
    return obj


@router.put("/sections/{section_id}", response_model=SectionOut)
def update_section(section_id: int, data: SectionCreate, db: Session = Depends(get_db)):
    obj = db.query(Section).get(section_id)
    if not obj:
        raise HTTPException(404, "Section not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/sections/{section_id}", status_code=204)
def delete_section(section_id: int, db: Session = Depends(get_db)):
    obj = db.query(Section).get(section_id)
    if not obj:
        raise HTTPException(404, "Section not found")
    db.delete(obj)
    db.commit()


# ── Courses CRUD ─────────────────────────────────────────────────────────────


@router.get("/courses", response_model=list[CourseOut])
def list_courses(db: Session = Depends(get_db)):
    return db.query(Course).order_by(Course.name).all()


@router.post("/courses", response_model=CourseOut, status_code=201)
def create_course(data: CourseCreate, db: Session = Depends(get_db)):
    existing = db.query(Course).filter_by(name=data.name).first()
    if existing:
        raise HTTPException(409, "Course already exists")
    obj = Course(name=data.name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/courses/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db)):
    obj = db.query(Course).get(course_id)
    if not obj:
        raise HTTPException(404, "Course not found")
    return obj


@router.put("/courses/{course_id}", response_model=CourseOut)
def update_course(course_id: int, data: CourseCreate, db: Session = Depends(get_db)):
    obj = db.query(Course).get(course_id)
    if not obj:
        raise HTTPException(404, "Course not found")
    obj.name = data.name
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/courses/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    obj = db.query(Course).get(course_id)
    if not obj:
        raise HTTPException(404, "Course not found")
    db.delete(obj)
    db.commit()


# ── Teachers CRUD ────────────────────────────────────────────────────────────


@router.get("/teachers", response_model=list[TeacherOut])
def list_teachers(search: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Teacher)
    if search:
        pattern = f"%{search}%"
        q = q.filter(or_(Teacher.code.ilike(pattern), Teacher.name.ilike(pattern)))
    return q.order_by(Teacher.code).all()


@router.post("/teachers", response_model=TeacherOut, status_code=201)
def create_teacher(data: TeacherCreate, db: Session = Depends(get_db)):
    existing = db.query(Teacher).filter_by(code=data.code).first()
    if existing:
        raise HTTPException(409, "Teacher code already exists")
    obj = Teacher(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/teachers/{teacher_id}", response_model=TeacherOut)
def get_teacher(teacher_id: int, db: Session = Depends(get_db)):
    obj = db.query(Teacher).get(teacher_id)
    if not obj:
        raise HTTPException(404, "Teacher not found")
    return obj


@router.put("/teachers/{teacher_id}", response_model=TeacherOut)
def update_teacher(teacher_id: int, data: TeacherCreate, db: Session = Depends(get_db)):
    obj = db.query(Teacher).get(teacher_id)
    if not obj:
        raise HTTPException(404, "Teacher not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/teachers/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    obj = db.query(Teacher).get(teacher_id)
    if not obj:
        raise HTTPException(404, "Teacher not found")
    db.delete(obj)
    db.commit()


# ── Rooms CRUD ───────────────────────────────────────────────────────────────


@router.get("/rooms", response_model=list[RoomOut])
def list_rooms(search: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Room)
    if search:
        pattern = f"%{search}%"
        q = q.filter(or_(Room.code.ilike(pattern), Room.building.ilike(pattern)))
    return q.order_by(Room.code).all()


@router.post("/rooms", response_model=RoomOut, status_code=201)
def create_room(data: RoomCreate, db: Session = Depends(get_db)):
    existing = db.query(Room).filter_by(code=data.code).first()
    if existing:
        raise HTTPException(409, "Room code already exists")
    obj = Room(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/rooms/{room_id}", response_model=RoomOut)
def get_room(room_id: int, db: Session = Depends(get_db)):
    obj = db.query(Room).get(room_id)
    if not obj:
        raise HTTPException(404, "Room not found")
    return obj


@router.put("/rooms/{room_id}", response_model=RoomOut)
def update_room(room_id: int, data: RoomCreate, db: Session = Depends(get_db)):
    obj = db.query(Room).get(room_id)
    if not obj:
        raise HTTPException(404, "Room not found")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/rooms/{room_id}", status_code=204)
def delete_room(room_id: int, db: Session = Depends(get_db)):
    obj = db.query(Room).get(room_id)
    if not obj:
        raise HTTPException(404, "Room not found")
    db.delete(obj)
    db.commit()


# ── Terms CRUD ───────────────────────────────────────────────────────────────


@router.get("/terms", response_model=list[TermOut])
def list_terms(db: Session = Depends(get_db)):
    return db.query(Term).order_by(Term.year.desc(), Term.semester).all()


@router.post("/terms", response_model=TermOut, status_code=201)
def create_term(data: TermCreate, db: Session = Depends(get_db)):
    existing = db.query(Term).filter_by(year=data.year, semester=data.semester).first()
    if existing:
        raise HTTPException(409, "Term already exists")
    obj = Term(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/terms/{term_id}", response_model=TermOut)
def get_term(term_id: int, db: Session = Depends(get_db)):
    obj = db.query(Term).get(term_id)
    if not obj:
        raise HTTPException(404, "Term not found")
    return obj


# ── Timeslots (read-only) ───────────────────────────────────────────────────


@router.get("/timeslots", response_model=list[TimeslotOut])
def list_timeslots(db: Session = Depends(get_db)):
    return db.query(Timeslot).order_by(Timeslot.slot_no).all()


# ── Entries CRUD ─────────────────────────────────────────────────────────────


@router.get("/entries", response_model=list[EntryOut])
def list_entries(
    term_id: Optional[int] = None,
    section_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    room_id: Optional[int] = None,
    day: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Entry)
    if term_id is not None:
        q = q.filter_by(term_id=term_id)
    if section_id is not None:
        q = q.filter_by(section_id=section_id)
    if teacher_id is not None:
        q = q.filter_by(teacher_id=teacher_id)
    if room_id is not None:
        q = q.filter_by(room_id=room_id)
    if day is not None:
        q = q.filter_by(day=day)
    return q.all()


@router.post("/entries", response_model=EntryOut, status_code=201)
def create_entry(data: EntryCreate, db: Session = Depends(get_db)):
    obj = Entry(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/entries/{entry_id}", response_model=EntryOut)
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    obj = db.query(Entry).get(entry_id)
    if not obj:
        raise HTTPException(404, "Entry not found")
    return obj


@router.delete("/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    obj = db.query(Entry).get(entry_id)
    if not obj:
        raise HTTPException(404, "Entry not found")
    db.delete(obj)
    db.commit()


# ── Query API ────────────────────────────────────────────────────────────────


@router.get("/query/entries", response_model=list[EntryDetailOut])
def query_entries(
    teacher_code: Optional[str] = None,
    room: Optional[str] = None,
    day: Optional[str] = None,
    program: Optional[str] = None,
    semester: Optional[int] = None,
    section: Optional[str] = None,
    term_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Query timetable entries with full joined data.

    Supports filtering by teacher_code, room, day, program, semester, section, term_id.
    """
    q = (
        db.query(Entry)
        .options(
            joinedload(Entry.section).joinedload(Section.program),
            joinedload(Entry.course),
            joinedload(Entry.teacher),
            joinedload(Entry.room),
            joinedload(Entry.timeslot),
            joinedload(Entry.term),
        )
    )

    if teacher_code:
        q = q.join(Entry.teacher).filter(Teacher.code.ilike(f"%{teacher_code}%"))
    if room:
        q = q.join(Entry.room, isouter=True).filter(Room.code.ilike(f"%{room}%"))
    if day:
        q = q.filter(Entry.day == day)
    if program:
        q = q.join(Entry.section).join(Section.program).filter(Program.name.ilike(f"%{program}%"))
    if semester is not None:
        q = q.join(Entry.section, isouter=True).filter(Section.semester == semester)
    if section:
        q = q.join(Entry.section, isouter=True).filter(Section.section.ilike(f"%{section}%"))
    if term_id is not None:
        q = q.filter(Entry.term_id == term_id)

    entries = q.all()

    return [
        EntryDetailOut(
            id=e.id,
            day=e.day,
            is_online=e.is_online,
            program=e.section.program.name if e.section and e.section.program else "",
            semester=e.section.semester if e.section else 0,
            section=e.section.section if e.section else "",
            course=e.course.name if e.course else "",
            teacher_code=e.teacher.code if e.teacher else "",
            teacher_name=e.teacher.name if e.teacher else "",
            room=e.room.code if e.room else "",
            building=e.room.building if e.room else "",
            slot_no=e.timeslot.slot_no if e.timeslot else 0,
            start_time=e.timeslot.start_time if e.timeslot else "",
            end_time=e.timeslot.end_time if e.timeslot else "",
            term_label=f"{e.term.semester}-{e.term.year}" if e.term else "",
        )
        for e in entries
    ]


@router.get("/query/teacher-schedule")
def query_teacher_schedule(
    teacher_code: str = Query(..., min_length=1),
    day: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get full weekly schedule for a teacher by code."""
    teacher = db.query(Teacher).filter(Teacher.code == teacher_code).first()
    if not teacher:
        raise HTTPException(404, "Teacher not found")

    q = (
        db.query(Entry)
        .filter(Entry.teacher_id == teacher.id)
        .options(
            joinedload(Entry.section).joinedload(Section.program),
            joinedload(Entry.course),
            joinedload(Entry.room),
            joinedload(Entry.timeslot),
        )
    )
    if day:
        q = q.filter(Entry.day == day)

    entries = q.order_by(Entry.day, Timeslot.slot_no).all()

    return {
        "teacher": {"code": teacher.code, "name": teacher.name, "dept": teacher.dept},
        "entries": [
            {
                "id": e.id,
                "day": e.day,
                "course": e.course.name if e.course else "",
                "section": f"{e.section.program.name if e.section and e.section.program else ''} "
                           f"Sem {e.section.semester if e.section else 0} "
                           f"({e.section.section if e.section else ''})",
                "room": e.room.code if e.room else "",
                "slot": e.timeslot.slot_no if e.timeslot else 0,
                "start_time": e.timeslot.start_time if e.timeslot else "",
                "end_time": e.timeslot.end_time if e.timeslot else "",
            }
            for e in entries
        ],
    }


@router.get("/query/room-schedule")
def query_room_schedule(
    room_code: str = Query(..., min_length=1),
    day: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get full weekly schedule for a room by code."""
    room = db.query(Room).filter(Room.code == room_code).first()
    if not room:
        raise HTTPException(404, "Room not found")

    q = (
        db.query(Entry)
        .filter(Entry.room_id == room.id)
        .options(
            joinedload(Entry.section).joinedload(Section.program),
            joinedload(Entry.course),
            joinedload(Entry.teacher),
            joinedload(Entry.timeslot),
        )
    )
    if day:
        q = q.filter(Entry.day == day)

    entries = q.order_by(Entry.day, Timeslot.slot_no).all()

    return {
        "room": {"code": room.code, "building": room.building},
        "entries": [
            {
                "id": e.id,
                "day": e.day,
                "course": e.course.name if e.course else "",
                "section": f"{e.section.program.name if e.section and e.section.program else ''} "
                           f"Sem {e.section.semester if e.section else 0} "
                           f"({e.section.section if e.section else ''})",
                "teacher": e.teacher.code if e.teacher else "",
                "slot": e.timeslot.slot_no if e.timeslot else 0,
                "start_time": e.timeslot.start_time if e.timeslot else "",
                "end_time": e.timeslot.end_time if e.timeslot else "",
            }
            for e in entries
        ],
    }


@router.get("/query/available-rooms")
def query_available_rooms(
    day: str = Query(..., min_length=1),
    slot_no: int = Query(..., ge=1, le=10),
    db: Session = Depends(get_db),
):
    """Get rooms that are NOT booked at a specific day + slot."""
    booked_room_ids = (
        db.query(Entry.room_id)
        .filter(Entry.day == day)
        .join(Entry.timeslot)
        .filter(Timeslot.slot_no == slot_no)
        .subquery()
    )
    available = db.query(Room).filter(~Room.id.in_(booked_room_ids)).order_by(Room.code).all()
    return [{"code": r.code, "building": r.building} for r in available]
