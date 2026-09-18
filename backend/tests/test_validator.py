"""Tests for the validator module — the most complex part of the pipeline."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

import pymupdf
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.extractor.validator import (
    EntryData,
    FlaggedCell,
    ValidationResult,
    _detect_day_rows,
    _detect_slot_columns,
    _extract_section_letter,
    _extract_semester_from_page,
    _fix_word_splits,
    _parse_page_header,
    _parse_timetable_title,
    _strip_embedded_section,
    classify_cells,
    parse_cell_text,
    parse_room,
    parse_teacher_code,
)


class TestParseRoom(unittest.TestCase):
    def test_standard_room(self):
        self.assertEqual(parse_room("R-305,B-II"), ("R-305", "B-II", False))

    def test_underscore_room(self):
        self.assertEqual(parse_room("R_305,B_II"), ("R-305", "B-II", False))

    def test_online_detection(self):
        self.assertEqual(parse_room("Online Class"), ("", "", True))
        self.assertEqual(parse_room("Zoom Meeting"), ("", "", True))
        self.assertEqual(parse_room("Teams Link"), ("", "", True))

    def test_short_room(self):
        self.assertEqual(parse_room("R-3"), ("R-3", "", False))

    def test_room_word_pattern(self):
        self.assertEqual(parse_room("Room-011"), ("R-011", "", False))

    def test_lab_pattern(self):
        self.assertEqual(parse_room("Lab-2"), ("LAB-2", "", False))

    def test_no_room(self):
        self.assertEqual(parse_room("Course Only"), ("", "", False))

    def test_room_without_building(self):
        room, building, online = parse_room("R-108")
        self.assertEqual(room, "R-108")
        self.assertEqual(building, "")
        self.assertFalse(online)


class TestParseTeacherCode(unittest.TestCase):
    def test_multi_letter_code(self):
        self.assertEqual(parse_teacher_code("Finance PK"), "PK")

    def test_code_in_not_teacher_set(self):
        self.assertEqual(parse_teacher_code("CS Course"), "")

    def test_code_after_room(self):
        self.assertEqual(parse_teacher_code("R-108,B-II A"), "A")

    def test_code_glued_to_word(self):
        self.assertEqual(parse_teacher_code("FinanceDGA"), "DGA")

    def test_single_letter_at_end(self):
        self.assertEqual(parse_teacher_code("Data Science D"), "D")

    def test_no_code(self):
        self.assertEqual(parse_teacher_code("Mathematics"), "")

    def test_short_codes(self):
        self.assertEqual(parse_teacher_code("Physics PK"), "PK")


class TestExtractSectionLetter(unittest.TestCase):
    def test_section_letter_at_start(self):
        self.assertEqual(_extract_section_letter("A Computer Science"), "A")

    def test_no_section_letter(self):
        self.assertEqual(_extract_section_letter("Computer Science"), "")

    def test_single_letter(self):
        self.assertEqual(_extract_section_letter("B"), "B")

    def test_two_letter_not_section(self):
        self.assertEqual(_extract_section_letter("The Course"), "")


class TestStripEmbeddedSection(unittest.TestCase):
    def test_removes_single_letters(self):
        self.assertEqual(_strip_embedded_section("Business A Math"), "Business Math")

    def test_preserves_roman_numerals(self):
        self.assertEqual(_strip_embedded_section("CS II"), "CS II")

    def test_short_text_unchanged(self):
        self.assertEqual(_strip_embedded_section("A B"), "A B")


class TestFixWordSplits(unittest.TestCase):
    def test_management_merge(self):
        result = _fix_word_splits("Manageme nt")
        self.assertEqual(result, "Management")

    def test_no_split(self):
        result = _fix_word_splits("Management")
        self.assertEqual(result, "Management")

    def test_information_suffix(self):
        result = _fix_word_splits("Informati on")
        self.assertEqual(result, "Information")

    def test_empty_string(self):
        self.assertEqual(_fix_word_splits(""), "")

    def test_short_words_no_change(self):
        result = _fix_word_splits("A B")
        self.assertEqual(result, "A B")


class TestParseCellText(unittest.TestCase):
    def test_full_cell(self):
        result = parse_cell_text("A Computer Science R-305,B-II PK")
        self.assertEqual(result["course"], "Computer Science")
        self.assertEqual(result["teacher_code"], "PK")
        self.assertEqual(result["room"], "R-305")
        self.assertEqual(result["building"], "B-II")

    def test_online_cell(self):
        result = parse_cell_text("A Online Class")
        self.assertEqual(result["is_online"], "1")

    def test_empty_text(self):
        result = parse_cell_text("")
        self.assertEqual(result["course"], "")

    def test_cell_with_embedded_section(self):
        result = parse_cell_text("A Business A Math R-305 D")
        self.assertIn("Business", result["course"])
        self.assertIn("Math", result["course"])


class TestPageHeaderParsing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pdf = Path(__file__).resolve().parents[2] / "fall2025.pdf"
        if not cls.pdf.exists():
            raise unittest.SkipTest("fall2025.pdf not found")

    def test_header_extraction_returns_tuple(self):
        doc = fitz.open(str(self.pdf))
        try:
            for page in doc:
                program, sections = _parse_page_header(page)
                self.assertIsInstance(program, str)
                self.assertIsInstance(sections, list)
                break
        finally:
            doc.close()

    def test_semester_extraction_returns_int(self):
        doc = fitz.open(str(self.pdf))
        try:
            for page in doc:
                sem = _extract_semester_from_page(page)
                self.assertIsInstance(sem, int)
                break
        finally:
            doc.close()

    def test_specialised_page_title_keeps_department_and_section_separate(self):
        self.assertEqual(
            _parse_timetable_title("BS-III(CS,AI)-B"),
            ("BS (CS, AI)", ["B"]),
        )


class TestFall2025RegressionFixture(unittest.TestCase):
    """Regression coverage for the first-column loss reported by users."""

    @classmethod
    def setUpClass(cls):
        cls.pdf = Path(__file__).resolve().parents[2] / "fall2025.pdf"
        if not cls.pdf.exists():
            raise unittest.SkipTest("fall2025.pdf not found")

    def test_bba_i_a_friday_fixture(self):
        from backend.extractor.grid import extract_grid
        from backend.extractor.parser import parse_page

        expected = json.loads(
            (Path(__file__).parent / "fixtures" / "bba_i_a_friday.json").read_text()
        )
        document = pymupdf.open(self.pdf)
        try:
            page = document[0]
            result = classify_cells(parse_page(page, extract_grid(page)), page=page, term="Fall-2025")
        finally:
            document.close()

        actual = [
            {
                "day": entry.day,
                "slot": entry.slot,
                "course": entry.course,
                "room": entry.room,
                "teacher_code": entry.teacher_code,
            }
            for entry in result.entries
            if entry.program == "BBA" and entry.semester == 1 and entry.section == "A" and entry.day == "Friday"
        ]
        self.assertEqual(actual, expected)


class TestSlotAndDayDetection(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pdf = Path(__file__).resolve().parents[2] / "fall2025.pdf"
        if not cls.pdf.exists():
            raise unittest.SkipTest("fall2025.pdf not found")

    def test_detect_slot_columns(self):
        doc = fitz.open(str(self.pdf))
        try:
            for page in doc:
                slots = _detect_slot_columns(page)
                if slots:
                    for slot_no, (x_left, x_right) in slots.items():
                        self.assertIsInstance(slot_no, int)
                        self.assertLess(x_left, x_right)
                    break
        finally:
            doc.close()

    def test_detect_day_rows(self):
        doc = fitz.open(str(self.pdf))
        try:
            for page in doc:
                days = _detect_day_rows(page)
                if days:
                    for day_name, (y_top, y_bottom) in days.items():
                        self.assertIn(day_name, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
                        self.assertLess(y_top, y_bottom)
                    break
        finally:
            doc.close()


class TestClassifyCells(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pdf = Path(__file__).resolve().parents[2] / "fall2025.pdf"
        if not cls.pdf.exists():
            raise unittest.SkipTest("fall2025.pdf not found")

    def test_classify_with_empty_records(self):
        result = classify_cells([], term="Fall-2025")
        self.assertIsInstance(result, ValidationResult)
        self.assertEqual(len(result.entries), 0)
        self.assertEqual(len(result.flagged), 0)

    def test_classify_with_program_override(self):
        records = [{"cell": {"x0": 200, "y0": 200, "x1": 300, "y1": 250}, "text": "Test Course"}]
        result = classify_cells(
            records,
            program_override="BSCS",
            semester_override=3,
            section_override="A",
            term="Fall-2025",
        )
        self.assertIsInstance(result, ValidationResult)

    def test_classify_returns_correct_types(self):
        doc = fitz.open(str(self.pdf))
        try:
            # Get the first page's grid and parse it
            from backend.extractor.grid import extract_grid
            from backend.extractor.parser import parse_page
            page = doc[0]
            cells = extract_grid(page)
            records = parse_page(page, cells)
            if not records:
                self.skipTest("No records parsed from first page")
            result = classify_cells(records, page=page, page_no=0, term="Fall-2025")
            self.assertIsInstance(result, ValidationResult)
            for entry in result.entries:
                self.assertIsInstance(entry, EntryData)
            for flagged in result.flagged:
                self.assertIsInstance(flagged, FlaggedCell)
        finally:
            doc.close()


class TestParseCellTextEdgeCases(unittest.TestCase):
    def test_cell_with_smart_class(self):
        result = parse_cell_text("A Math R-305,B-II PK Smart Class - PK")
        self.assertIsNotNone(result["course"])

    def test_cell_with_group_prefix(self):
        result = parse_cell_text("A Group 1 Physics R-305 PK")
        self.assertIn("Physics", result["course"])

    def test_cell_with_trailing_punctuation(self):
        result = parse_cell_text("A Algorithms R-305, PK")
        self.assertEqual(result["teacher_code"], "PK")

    def test_multi_line_cell(self):
        result = parse_cell_text("A Computer\nScience R-305\nPK")
        self.assertTrue(result["course"])

    def test_cell_no_teacher(self):
        result = parse_cell_text("A Study Hall R-305")
        self.assertEqual(result["teacher_code"], "")


class TestClassifyCellFiltering(unittest.TestCase):
    def test_university_header_is_not_added_as_a_course(self):
        records = [
            {"cell": {"x0": 200, "y0": 200, "x1": 300, "y1": 250}, "text": "Sukkur IBA University"},
        ]
        result = classify_cells(records, term="Fall-2026")
        self.assertEqual(result.entries, [])

class TestFall2026SpanningSlots(unittest.TestCase):
    """Regression coverage for merged PDF cells spanning multiple slots."""

    @classmethod
    def setUpClass(cls):
        cls.pdf = Path(__file__).resolve().parents[2] / "fall2026.pdf"
        if not cls.pdf.exists():
            raise unittest.SkipTest("fall2026.pdf not found")

    def test_bs_v_cs_ai_h_thursday_preserves_spanned_slots(self):
        from backend.extractor.grid import extract_grid
        from backend.extractor.parser import parse_page

        document = pymupdf.open(self.pdf)
        try:
            # Page 34 of fall2026.pdf contains BS-V(CS, CS-AI)-H.
            page = document[33]
            result = classify_cells(
                parse_page(page, extract_grid(page)),
                page=page,
                page_no=33,
                term="Fall-2026",
            )
        finally:
            document.close()

        actual = [
            (entry.slot, entry.course)
            for entry in result.entries
            if (
                entry.program == "BS (CS, CS-AI)"
                and entry.semester == 5
                and entry.section == "H"
                and entry.day == "Thursday"
            )
        ]

        self.assertEqual(
            [slot for slot, _ in actual],
            [1, 2, 3, 5, 6, 7],
        )

    def test_bba_v_section_c_keeps_cells_with_noisy_markers(self):
        from backend.extractor.grid import extract_grid
        from backend.extractor.parser import parse_page

        document = pymupdf.open(self.pdf)
        try:
            # Page 5 contains BBA-V(A,B,C). Some B/C cells have parser markers
            # polluted by teacher codes, so the explicit cell label must win.
            page = document[4]
            result = classify_cells(
                parse_page(page, extract_grid(page)),
                page=page,
                page_no=4,
                term="Fall-2026",
            )
        finally:
            document.close()

        actual = {
            (entry.day, entry.slot)
            for entry in result.entries
            if entry.section == "C"
        }

        self.assertEqual(
            actual,
            {
                ("Monday", 1), ("Monday", 2), ("Monday", 3),
                ("Monday", 5), ("Monday", 6), ("Monday", 7),
                ("Tuesday", 1), ("Tuesday", 2), ("Tuesday", 3),
                ("Wednesday", 1), ("Wednesday", 2),
                ("Thursday", 1), ("Thursday", 2), ("Thursday", 3),
                ("Friday", 1), ("Friday", 2), ("Friday", 3),
            },
        )


if __name__ == "__main__":
    unittest.main()
