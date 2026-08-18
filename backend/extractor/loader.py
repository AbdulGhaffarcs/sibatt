"""PDF loading and fingerprint helpers for timetable extraction."""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

import fitz


def _md5_bytes(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


def _cache_path(pdf_path: Path) -> Path:
    # Keep importer state inside the project. Source PDFs are often supplied
    # from a read-only Downloads folder, so writing beside the PDF can make a
    # perfectly valid import fail.
    cache_dir = Path(__file__).resolve().parents[2] / ".cache"
    cache_dir.mkdir(exist_ok=True)
    source_id = hashlib.md5(str(pdf_path.resolve()).encode("utf-8")).hexdigest()[:12]
    return cache_dir / f"{pdf_path.stem}-{source_id}.hash"


def load_pdf(path: str) -> fitz.Document | None:
    """Open a PDF only when its file-level md5 differs from the cached hash."""
    pdf_path = Path(path)
    current_hash = _md5_bytes(pdf_path.read_bytes())
    cache_file = _cache_path(pdf_path)

    if cache_file.exists() and cache_file.read_text(encoding="utf-8").strip() == current_hash:
        print("Same PDF. Nothing to do.")
        return None

    cache_file.write_text(current_hash, encoding="utf-8")
    return fitz.open(pdf_path)


def get_page_hash(page: fitz.Page) -> str:
    """Return a stable md5 fingerprint for one page's text and vector drawings."""
    text = page.get_text("text", sort=True)
    drawing_parts: list[str] = []

    for drawing in page.get_drawings():
        for item in drawing.get("items", []):
            drawing_parts.append(repr(item))

    payload = "\n".join([text, *drawing_parts]).encode("utf-8", errors="replace")
    return _md5_bytes(payload)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python backend/extractor/loader.py <pdf-path>")
        raise SystemExit(1)

    doc = load_pdf(sys.argv[1])
    if doc is not None:
        print(f"Loaded PDF: {doc.page_count} pages")
        if doc.page_count:
            print(f"Page 1 hash: {get_page_hash(doc[0])}")
        doc.close()
