import importlib
import tempfile
import unittest
from pathlib import Path

import fitz

from backend.extractor.loader import get_page_hash, load_pdf
from backend.extractor.grid import extract_grid
from backend.extractor.parser import parse_page


def make_pdf(path: Path, text: str = "Course A") -> None:
    doc = fitz.open()
    page = doc.new_page(width=200, height=160)

    for x in (20, 100, 180):
        page.draw_line((x, 20), (x, 120))
    for y in (20, 70, 120):
        page.draw_line((20, y), (180, y))

    page.insert_text((35, 48), text)
    page.insert_text((120, 98), "R-305")
    doc.save(path)
    doc.close()


class ExtractorTests(unittest.TestCase):
    def test_load_pdf_returns_document_only_when_file_hash_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            pdf_path = Path(tmp) / "timetable.pdf"
            make_pdf(pdf_path)

            first = load_pdf(str(pdf_path))
            self.assertIsNotNone(first)
            first.close()

            second = load_pdf(str(pdf_path))
            self.assertIsNone(second)

            make_pdf(pdf_path, text="Course B")
            third = load_pdf(str(pdf_path))
            self.assertIsNotNone(third)
            third.close()

            self.assertTrue((pdf_path.parent / "pdf_hash.txt").exists())

    def test_get_page_hash_changes_when_page_content_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            first_path = Path(tmp) / "first.pdf"
            second_path = Path(tmp) / "second.pdf"
            make_pdf(first_path, text="Course A")
            make_pdf(second_path, text="Course B")

            first_doc = fitz.open(first_path)
            second_doc = fitz.open(second_path)
            self.assertNotEqual(get_page_hash(first_doc[0]), get_page_hash(second_doc[0]))
            first_doc.close()
            second_doc.close()

    def test_extract_grid_reconstructs_cells_from_vector_lines(self):
        with tempfile.TemporaryDirectory() as tmp:
            pdf_path = Path(tmp) / "grid.pdf"
            make_pdf(pdf_path)
            doc = fitz.open(pdf_path)

            cells = extract_grid(doc[0])

            self.assertEqual(len(cells), 4)
            self.assertIn({"x0": 20.0, "y0": 20.0, "x1": 100.0, "y1": 70.0}, cells)
            self.assertIn({"x0": 100.0, "y0": 70.0, "x1": 180.0, "y1": 120.0}, cells)
            doc.close()

    def test_parse_page_assigns_words_to_cells_by_word_center(self):
        with tempfile.TemporaryDirectory() as tmp:
            pdf_path = Path(tmp) / "parse.pdf"
            make_pdf(pdf_path, text="Course A")
            doc = fitz.open(pdf_path)
            cells = extract_grid(doc[0])

            records = parse_page(doc[0], cells)
            texts = {record["text"] for record in records}

            self.assertIn("Course A", texts)
            self.assertIn("R-305", texts)
            self.assertTrue(all("cell" in record and "text" in record for record in records))
            doc.close()


if __name__ == "__main__":
    unittest.main()
