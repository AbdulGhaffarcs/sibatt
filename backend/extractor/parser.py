"""Raw text extraction from reconstructed timetable cells."""

from __future__ import annotations

import sys
from pathlib import Path

import fitz

try:
    from backend.extractor.grid import extract_grid
except ImportError:  # Allows direct script execution from backend/extractor.
    from grid import extract_grid


CONTAINMENT_TOLERANCE = 0.5
LINE_GROUP_TOLERANCE = 5.0


def _word_center(word: tuple) -> tuple[float, float]:
    x0, y0, x1, y1 = word[:4]
    return (float(x0) + float(x1)) / 2, (float(y0) + float(y1)) / 2


def _contains(cell: dict, x: float, y: float) -> bool:
    return (
        float(cell["x0"]) - CONTAINMENT_TOLERANCE <= x <= float(cell["x1"]) + CONTAINMENT_TOLERANCE
        and float(cell["y0"]) - CONTAINMENT_TOLERANCE <= y <= float(cell["y1"]) + CONTAINMENT_TOLERANCE
    )


_SUFFIX_FRAGS = frozenset({
    "s", "t", "n", "l", "d", "r", "g", "y", "al", "le", "ly", "nt",
    "on", "ion", "ion", "sion", "ment", "ness", "ship", "ing", "ers",
    "ies", "ous", "ive", "ful", "ism", "ity", "ent", "ant", "ence",
    "ance", "tics", "mics", "rics", "ering", "ting", "ling",
    # Additional patterns for mid-word splits
    "ed", "er", "es", "est", "ous", "ive", "ful", "less", "able",
    "ible", "tion", "sion", "ation", "ization", "ment", "ness",
})

# High-confidence suffixes that should merge even with wider gaps
_HIGH_CONF_SUFFIXES = frozenset({
    "tion", "sion", "ation", "ment", "ness", "ship", "ing", "ers",
    "ies", "ous", "ive", "ful", "ism", "ity", "ent", "ant", "ence",
    "ance", "tics", "mics", "rics", "ering", "ting", "ling",
    "able", "ible", "less", "ized", "ised", "ation", "ization",
})

_COMMON_EN = frozenset({
    "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on",
    "at", "by", "for", "is", "it", "no", "not", "so", "up", "as", "be",
    "do", "go", "he", "me", "my", "we", "us", "am", "la", "la", "al",
})


def _collapse_words(words: list[tuple]) -> str:
    """Collapse words into cell text, grouping by line and joining with spaces.

    After grouping, merges trailing suffix-like fragments that are split by
    PDF column boundaries (e.g., 'Manageme' + 'nt', 'Microecono' + 'mics').
    """
    if not words:
        return ""
    ordered = sorted(words, key=lambda word: (float(word[1]), float(word[0])))
    lines: list[list[tuple]] = []

    for word in ordered:
        y_mid = (float(word[1]) + float(word[3])) / 2
        if not lines:
            lines.append([word])
            continue

        last_line = lines[-1]
        last_y_mid = sum((float(w[1]) + float(w[3])) / 2 for w in last_line) / len(last_line)
        if abs(y_mid - last_y_mid) <= LINE_GROUP_TOLERANCE:
            last_line.append(word)
        else:
            lines.append([word])

    merged_lines = []
    for line in lines:
        sorted_line = sorted(line, key=lambda word: float(word[0]))
        merged = _merge_suffix_fragments(sorted_line)
        merged_lines.append(merged)

    collapsed_lines = [
        " ".join(str(word[4]) for word in line)
        for line in merged_lines
    ]
    return " ".join(line for line in collapsed_lines if line).strip()


def _merge_suffix_fragments(words: list[tuple]) -> list[tuple]:
    """Merge trailing suffix fragments split by PDF column breaks.

    A fragment is merged if:
    - It's short (<=10 chars) and lowercase
    - It looks like a word suffix (in _SUFFIX_FRAGS) or is 1-3 chars lowercase
    - It follows a word on the same line with a moderate gap (column breaks)
    """
    if not words:
        return words
    result: list[tuple] = [words[0]]
    for w in words[1:]:
        prev = result[-1]
        frag = str(w[4]).strip()
        prev_text = str(prev[4]).strip()
        same_y = abs(
            (float(prev[1]) + float(prev[3])) / 2
            - (float(w[1]) + float(w[3])) / 2
        ) <= LINE_GROUP_TOLERANCE
        gap = float(w[0]) - float(prev[2])

        is_suffix = (
            len(frag) <= 7
            and frag.isalpha()
            and frag[0].islower()
            and frag not in _COMMON_EN
            and (frag in _SUFFIX_FRAGS or len(frag) <= 2)
        )

        # High-confidence suffixes get wider gap tolerance
        is_high_conf = frag in _HIGH_CONF_SUFFIXES and len(frag) >= 3
        max_gap = 40 if is_high_conf else 20

        if same_y and is_suffix and -5 < gap < max_gap:
            combined = prev_text + frag
            result[-1] = (
                float(prev[0]),
                float(prev[1]),
                float(w[2]),
                float(prev[3]),
                combined,
            ) + prev[5:]
        else:
            result.append(w)
    return result


def parse_page(page: fitz.Page, cells: list[dict]) -> list[dict]:
    """Assign page words to cells by word-center containment and return raw cell text."""
    words = page.get_text("words")
    words_by_cell: list[list[tuple]] = [[] for _ in cells]

    for word in words:
        x_mid, y_mid = _word_center(word)
        for index, cell in enumerate(cells):
            if _contains(cell, x_mid, y_mid):
                words_by_cell[index].append(word)
                break

    records: list[dict] = []
    for cell, cell_words in zip(cells, words_by_cell):
        text = _collapse_words(cell_words)
        if text:
            records.append({"cell": dict(cell), "text": text})

    return records


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python backend/extractor/parser.py <pdf-path>")
        raise SystemExit(1)

    doc = fitz.open(Path(sys.argv[1]))
    page = doc[0]
    cells = extract_grid(page)
    records = parse_page(page, cells)
    print(f"Page 1 cells: {len(cells)}")
    print(f"Page 1 non-empty cells: {len(records)}")
    for record in records[:10]:
        print(record)
    doc.close()
