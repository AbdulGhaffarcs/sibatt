"""SQLAlchemy ORM models — matches the frontend SQLite schema exactly."""

from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db import Base


class Program(Base):
    __tablename__ = "programs"

    id:   Mapped[int]  = mapped_column(Integer, primary_key=True)
    name: Mapped[str]  = mapped_column(String, nullable=False)

    sections: Mapped[list["Section"]] = relationship(back_populates="program")


class Section(Base):
    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint("program_id", "semester", "section"),
    )

    id:        Mapped[int]  = mapped_column(Integer, primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"), nullable=False)
    semester:  Mapped[int]  = mapped_column(Integer, nullable=False)
    section:   Mapped[str]  = mapped_column(String, nullable=False)

    program: Mapped["Program"] = relationship(back_populates="sections")
    entries: Mapped[list["Entry"]] = relationship(back_populates="section")


class Course(Base):
    __tablename__ = "courses"

    id:   Mapped[int]  = mapped_column(Integer, primary_key=True)
    name: Mapped[str]  = mapped_column(String, nullable=False)

    entries: Mapped[list["Entry"]] = relationship(back_populates="course")


class Teacher(Base):
    __tablename__ = "teachers"
    __table_args__ = (
        UniqueConstraint("code"),
    )

    id:   Mapped[int]  = mapped_column(Integer, primary_key=True)
    code: Mapped[str]  = mapped_column(String, nullable=False)
    name: Mapped[str]  = mapped_column(String, nullable=False, default="")
    dept: Mapped[str]  = mapped_column(String, nullable=False, default="")

    entries: Mapped[list["Entry"]] = relationship(back_populates="teacher")


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("code", "building"),
    )

    id:       Mapped[int]  = mapped_column(Integer, primary_key=True)
    code:     Mapped[str]  = mapped_column(String, nullable=False)
    building: Mapped[str]  = mapped_column(String, nullable=False, default="")

    entries: Mapped[list["Entry"]] = relationship(back_populates="room")


class Timeslot(Base):
    __tablename__ = "timeslots"

    id:         Mapped[int]  = mapped_column(Integer, primary_key=True)
    slot_no:    Mapped[int]  = mapped_column(Integer, nullable=False)
    start_time: Mapped[str]  = mapped_column(String, nullable=False)
    end_time:   Mapped[str]  = mapped_column(String, nullable=False)

    entries: Mapped[list["Entry"]] = relationship(back_populates="timeslot")


class Term(Base):
    __tablename__ = "terms"
    __table_args__ = (
        UniqueConstraint("year", "semester"),
    )

    id:       Mapped[int]  = mapped_column(Integer, primary_key=True)
    year:     Mapped[int]  = mapped_column(Integer, nullable=False)
    semester: Mapped[str]  = mapped_column(String, nullable=False)

    entries: Mapped[list["Entry"]] = relationship(back_populates="term")
    flagged_cells: Mapped[list["FlaggedCell"]] = relationship(back_populates="term")


class Entry(Base):
    __tablename__ = "entries"

    id:          Mapped[int]  = mapped_column(Integer, primary_key=True)
    term_id:     Mapped[int]  = mapped_column(ForeignKey("terms.id"), nullable=False)
    section_id:  Mapped[int]  = mapped_column(ForeignKey("sections.id"), nullable=False)
    course_id:   Mapped[int]  = mapped_column(ForeignKey("courses.id"), nullable=False)
    teacher_id:  Mapped[int]  = mapped_column(ForeignKey("teachers.id"), nullable=False)
    room_id:     Mapped[int]  = mapped_column(ForeignKey("rooms.id"), nullable=False)
    timeslot_id: Mapped[int]  = mapped_column(ForeignKey("timeslots.id"), nullable=False)
    day:         Mapped[str]  = mapped_column(String, nullable=False)
    is_online:   Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    term:     Mapped["Term"]     = relationship(back_populates="entries")
    section:  Mapped["Section"]  = relationship(back_populates="entries")
    course:   Mapped["Course"]   = relationship(back_populates="entries")
    teacher:  Mapped["Teacher"]  = relationship(back_populates="entries")
    room:     Mapped["Room"]     = relationship(back_populates="entries")
    timeslot: Mapped["Timeslot"] = relationship(back_populates="entries")


class FlaggedCell(Base):
    __tablename__ = "flagged_cells"

    id:        Mapped[int]   = mapped_column(Integer, primary_key=True)
    term_id:   Mapped[int]   = mapped_column(ForeignKey("terms.id"), nullable=False)
    raw_text:  Mapped[str]   = mapped_column(String, nullable=False, default="")
    cell_bbox: Mapped[str]   = mapped_column(String, nullable=False, default="")
    flags:     Mapped[str]   = mapped_column(String, nullable=False, default="")
    status:    Mapped[str]   = mapped_column(String, nullable=False, default="pending")
    fixed_data: Mapped[str]  = mapped_column(String, nullable=False, default="")

    term: Mapped["Term"] = relationship(back_populates="flagged_cells")
