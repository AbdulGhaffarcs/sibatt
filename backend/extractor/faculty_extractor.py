"""
Faculty Timetable Extractor v3
Uses the same grid-line reconstruction as the student extractor.
This is the intelligent approach – cells are real rectangles from PDF lines.

Usage (from project root, with backend on PYTHONPATH):
    python -m backend.extractor.faculty_extractor path/to/Fall2026Teacherwise.pdf

Or standalone (copies grid logic):
    python faculty_extractor.py path/to/Fall2026Teacherwise.pdf
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pymupdf

# ── Try to reuse project grid extractor; fall back to embedded copy ─────────
try:
    from backend.extractor.grid import extract_grid
except ImportError:
    # Minimal embedded grid (same algorithm)
    LINE_TOLERANCE = 1.0
    MIN_LINE_LENGTH = 2.0

    def _cluster_values(values, tolerance=LINE_TOLERANCE):
        sorted_values = sorted(values)
        clusters = []
        for value in sorted_values:
            if not clusters or abs(value - clusters[-1][-1]) > tolerance:
                clusters.append([value])
            else:
                clusters[-1].append(value)
        return [round(sum(c) / len(c), 3) for c in clusters]

    def _snap(value, clustered):
        return min(clustered, key=lambda c: abs(c - value))

    def _covers(intervals, start, end):
        relevant = sorted(
            (max(a, start), min(b, end))
            for a, b in intervals if b >= start and a <= end
        )
        if not relevant:
            return False
        covered = start
        for a, b in relevant:
            if a > covered + LINE_TOLERANCE:
                return False
            covered = max(covered, b)
            if covered >= end - LINE_TOLERANCE:
                return True
        return False

    def extract_grid(page):
        horizontal, vertical = [], []

        def add_line(x0, y0, x1, y1):
            if abs(y0 - y1) <= LINE_TOLERANCE and abs(x1 - x0) >= MIN_LINE_LENGTH:
                left, right = sorted((x0, x1))
                horizontal.append((y0, left, right))
            elif abs(x0 - x1) <= LINE_TOLERANCE and abs(y1 - y0) >= MIN_LINE_LENGTH:
                top, bottom = sorted((y0, y1))
                vertical.append((x0, top, bottom))

        for drawing in page.get_drawings():
            for item in drawing.get("items", []):
                op = item[0]
                if op == "l":
                    p0, p1 = item[1], item[2]
                    add_line(float(p0.x), float(p0.y), float(p1.x), float(p1.y))
                elif op == "re":
                    r = item[1]
                    add_line(float(r.x0), float(r.y0), float(r.x1), float(r.y0))
                    add_line(float(r.x0), float(r.y1), float(r.x1), float(r.y1))
                    add_line(float(r.x0), float(r.y0), float(r.x0), float(r.y1))
                    add_line(float(r.x1), float(r.y0), float(r.x1), float(r.y1))

        if not horizontal or not vertical:
            return []

        xs = _cluster_values([ln[0] for ln in vertical])
        ys = _cluster_values([ln[0] for ln in horizontal])
        snapped_h = [
            (_snap(y, ys), min(_snap(x0, xs), _snap(x1, xs)), max(_snap(x0, xs), _snap(x1, xs)))
            for y, x0, x1 in horizontal
        ]
        snapped_v = [
            (_snap(x, xs), min(_snap(y0, ys), _snap(y1, ys)), max(_snap(y0, ys), _snap(y1, ys)))
            for x, y0, y1 in vertical
        ]

        xs = sorted({x for x, _, _ in snapped_v})
        ys = sorted({y for y, _, _ in snapped_h})
        h_by_y = {y: [] for y in ys}
        v_by_x = {x: [] for x in xs}
        for y, x0, x1 in snapped_h:
            h_by_y.setdefault(y, []).append((x0, x1))
        for x, y0, y1 in snapped_v:
            v_by_x.setdefault(x, []).append((y0, y1))

        cells = []
        for y0, y1 in zip(ys, ys[1:]):
            row_bounds = [x for x in xs if _covers(v_by_x.get(x, []), y0, y1)]
            for x0, x1 in zip(row_bounds, row_bounds[1:]):
                if _covers(h_by_y.get(y0, []), x0, x1) and _covers(h_by_y.get(y1, []), x0, x1):
                    cells.append({"x0": float(x0), "y0": float(y0), "x1": float(x1), "y1": float(y1)})
        return cells


SLOT_TIMES = {
    1: ("09:00", "09:50"),
    2: ("09:50", "10:40"),
    3: ("11:10", "12:00"),
    4: ("12:10", "13:00"),
    5: ("14:00", "14:50"),
    6: ("14:50", "15:40"),
    7: ("16:10", "17:00"),
    8: ("17:00", "17:50"),
    9: ("17:50", "18:40"),
    10: ("18:40", "20:00"),
}

DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
DAY_LABELS = {"Mo": "Monday", "Tu": "Tuesday", "We": "Wednesday", "Th": "Thursday", "Fr": "Friday"}


def extract_teacher_name(page: pymupdf.Page) -> str:
    areas = page.search_for("Teacher")
    if not areas:
        return "Unknown"
    rect = areas[0]
    clip = pymupdf.Rect(0, max(0, rect.y0 - 5), page.rect.width, rect.y1 + 30)
    text = page.get_text(clip=clip).replace("\n", " ")
    m = re.search(r"Teacher\s+(.+)", text)
    if not m:
        return "Unknown"
    name = m.group(1).strip()
    name = re.split(r"\s{2,}|\s+\d{1,2}\s+\d", name)[0].strip()
    return name


def words_in_cell(page_words, cell, tol=1.5):
    """Return words whose center lies inside the cell rectangle."""
    result = []
    for w in page_words:
        x0, y0, x1, y1, word = w[:5]
        cx = (float(x0) + float(x1)) / 2
        cy = (float(y0) + float(y1)) / 2
        if (cell["x0"] - tol <= cx <= cell["x1"] + tol and
                cell["y0"] - tol <= cy <= cell["y1"] + tol):
            result.append(w)
    return result


def cell_text(words) -> str:
    if not words:
        return ""
    ordered = sorted(words, key=lambda w: (round(float(w[1]) / 3) * 3, float(w[0])))
    text = " ".join(str(w[4]) for w in ordered)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    text = re.sub(r"\s*,\s*", ", ", text)
    return text.strip()


def parse_cell(text: str) -> dict | None:
    text = text.strip()
    if not text:
        return None
    low = text.lower()
    if any(k in low for k in ("break", "minutes", "lunch", "prayer")):
        return None
    if text in {"-", "—", "&", "Mo", "Tu", "We", "Th", "Fr"}:
        return None

    room = ""
    rm = re.search(r"((?:LR|R)-?\d+[A-Z]?(?:\s*,\s*B-[IVX]+)?)\s*$", text, re.I)
    if rm:
        room = rm.group(1).strip()
        text = text[: rm.start()].strip()

    section = ""
    sm = re.match(
        r"^((?:BS|BBA|BE|MBA|MS|PhD|B\.?E\.?)[-\w() ,./]*?)(?=\s+[A-Za-z]|\s*$)",
        text, re.I,
    )
    if sm:
        cand = sm.group(1).strip()
        if re.search(r"[\d()]", cand):
            section = re.sub(r"\s+", " ", cand)
            section = re.sub(r"\s*,\s*", ", ", section)
            text = text[sm.end():].strip()

    course = re.sub(r"\s+", " ", text).strip(" -")
    if not course and not section:
        return None

    return {
        "section": section or "—",
        "course": course or "—",
        "room": room or "—",
    }


def map_cell_to_day_slot(cell, day_y_map, slot_x_map):
    """Map a cell to its day and the complete horizontal slot range it covers."""
    cy = (cell["y0"] + cell["y1"]) / 2
    cx = (cell["x0"] + cell["x1"]) / 2

    day = next((d for (y0, y1), d in day_y_map.items() if y0 <= cy < y1), None)
    centers = sorted(slot_x_map.items(), key=lambda item: item[1])
    covered = [slot for sx, slot in centers if cell["x0"] - 2 <= sx <= cell["x1"] + 2]
    if covered:
        return day, covered[0], covered[-1]

    nearest = min(centers, key=lambda item: abs(cx - item[0]), default=(0, None))
    return day, (nearest[1] if abs(cx - nearest[0]) <= 55 else None), (nearest[1] if abs(cx - nearest[0]) <= 55 else None)


def build_day_slot_maps(page):
    """Detect day label Y bands and slot header X positions from the page."""
    day_y_map = {}
    slot_x_map = {}

    words = page.get_text("words")
    # Day labels
    for w in words:
        text = str(w[4]).strip()
        if text in DAY_LABELS:
            y0, y1 = float(w[1]), float(w[3])
            # Expand to row band
            mid = (y0 + y1) / 2
            day_y_map[(mid - 40, mid + 50)] = DAY_LABELS[text]

    # Slot numbers in header (y < 100)
    for w in words:
        text = str(w[4]).strip()
        y0 = float(w[1])
        if y0 > 100:
            continue
        if text.isdigit() and 1 <= int(text) <= 10:
            cx = (float(w[0]) + float(w[2])) / 2
            slot_x_map[cx] = int(text)

    # Fallback if detection fails
    if not day_y_map:
        day_y_map = {
            (100, 198): "Monday",
            (198, 292): "Tuesday",
            (292, 386): "Wednesday",
            (386, 480): "Thursday",
            (480, 575): "Friday",
        }
    if not slot_x_map:
        centers = [114, 163, 262, 360, 459, 508, 607, 656, 706, 755]
        slot_x_map = {c: i + 1 for i, c in enumerate(centers)}

    return day_y_map, slot_x_map



def merge_adjacent_entries(entries: list[dict]) -> list[dict]:
    """
    General rule: on the same day, if two consecutive slots have
    complementary section fragments, merge them into one clean entry.
    This handles aSc vertical lines that split section text across columns.
    """
    if not entries:
        return []

    from collections import defaultdict
    by_day = defaultdict(list)
    for e in entries:
        by_day[e["day"]].append(dict(e))

    result = []
    for day, items in by_day.items():
        items.sort(key=lambda x: x["slot"])
        used = set()
        for i, cur in enumerate(items):
            if i in used:
                continue
            # Look ahead one slot
            if i + 1 < len(items) and items[i + 1]["slot"] == cur["slot"] + 1:
                nxt = items[i + 1]
                cur_sec = cur["section"]
                nxt_sec = nxt["section"]
                # Incomplete section patterns
                cur_incomplete = (
                    cur_sec.endswith((",", "(", "-"))
                    or (cur_sec.startswith("BS") and ")" not in cur_sec and "(" in cur_sec)
                )
                nxt_looks_continuation = bool(re.match(
                    r"^(CS-AI|CS|SE|AI|A&F)\)-",
                    nxt_sec + nxt["course"],
                    re.I,
                )) or (nxt_sec in ("—", "") and re.search(r"\)-[A-Z]", nxt["course"]))

                if cur_incomplete or nxt_looks_continuation:
                    # Merge section
                    combined_sec = (cur_sec + " " + nxt_sec).replace("—", "").strip()
                    combined_sec = re.sub(r"\s+", " ", combined_sec)
                    # Fix BS-V(CS, CS-AI)-F style
                    combined_sec = re.sub(r"\(CS,\s*CS-AI\)", "(CS, CS-AI)", combined_sec)
                    combined_sec = re.sub(r"\(CS\s+CS-AI\)", "(CS, CS-AI)", combined_sec)
                    combined_sec = re.sub(r"CS,\s*CS-AI\)", "CS, CS-AI)", combined_sec)

                    # Merge course – prefer the longer/cleaner one
                    c1, c2 = cur["course"], nxt["course"]
                    # Remove section fragments from course
                    for frag in re.findall(r"(?:CS-AI|CS|SE)\)-[A-Z]", c1 + " " + c2):
                        c1 = c1.replace(frag, "").strip()
                        c2 = c2.replace(frag, "").strip()
                    course = c1 if len(c1) >= len(c2) else c2
                    course = re.sub(r"\s+", " ", course).strip(" -")

                    room = cur["room"] if cur["room"] not in ("—", "") else nxt["room"]

                    # Pull section out of course if still mixed
                    m = re.match(
                        r"^((?:BS|BBA|BE|MBA)[-\w() ,./]+?)\s+(.+)$",
                        course, re.I,
                    )
                    if m and combined_sec in ("—", ""):
                        combined_sec = m.group(1)
                        course = m.group(2)

                    # Final section cleanup
                    if combined_sec and not combined_sec.endswith(")") and re.search(r"\)-[A-Z]$", nxt_sec + nxt["course"]):
                        tail = re.search(r"((?:CS-AI|CS)\)-[A-Z])", nxt_sec + " " + nxt["course"])
                        if tail and tail.group(1) not in combined_sec:
                            combined_sec = (combined_sec.rstrip(", ") + ", " + tail.group(1)).replace(", ,", ",")

                    combined_sec = re.sub(r"\s*,\s*", ", ", combined_sec)
                    combined_sec = re.sub(r"\s+", " ", combined_sec).strip()

                    result.append({
                        "day": day,
                        "slot": cur["slot"],
                        "start_time": cur["start_time"],
                        "end_time": nxt["end_time"],  # span both
                        "section": combined_sec or "—",
                        "course": course or "—",
                        "room": room or "—",
                    })
                    used.add(i)
                    used.add(i + 1)
                    continue

            result.append(cur)
            used.add(i)

    result.sort(key=lambda e: (DAY_ORDER.index(e["day"]) if e["day"] in DAY_ORDER else 9, e["slot"]))
    return result


def extract_page(page: pymupdf.Page, page_num: int) -> dict:
    teacher = extract_teacher_name(page)
    cells = extract_grid(page)
    page_words = page.get_text("words")
    day_y_map, slot_x_map = build_day_slot_maps(page)

    entries = []
    seen = set()

    for cell in cells:
        # Skip tiny / header cells
        if cell["y1"] - cell["y0"] < 20 or cell["x1"] - cell["x0"] < 30:
            continue
        if cell["y0"] < 95:
            continue

        wlist = words_in_cell(page_words, cell)
        text = cell_text(wlist)
        parsed = parse_cell(text)
        if not parsed:
            continue

        day, slot, end_slot = map_cell_to_day_slot(cell, day_y_map, slot_x_map)
        if not day or not slot or not end_slot:
            continue

        key = (day, slot, parsed["section"], parsed["course"])
        if key in seen:
            continue
        seen.add(key)

        start = SLOT_TIMES.get(slot, ("", ""))[0]
        end = SLOT_TIMES.get(end_slot, ("", ""))[1]
        entries.append({
            "day": day,
            "slot": slot,
            "end_slot": end_slot,
            "start_time": start,
            "end_time": end,
            "course": parsed["course"],
            "section": parsed["section"],
            "room": parsed["room"],
        })

    entries.sort(key=lambda e: (DAY_ORDER.index(e["day"]) if e["day"] in DAY_ORDER else 9, e["slot"]))
    entries = smart_dedupe(entries)
    return {"teacher": teacher, "page": page_num, "entries": entries}



def smart_dedupe(entries: list[dict]) -> list[dict]:
    """General post-process: merge fragmented cells of the same class on a day."""
    from collections import defaultdict
    grouped = defaultdict(list)
    for e in entries:
        course_key = re.sub(r"[^a-z]", "", e["course"].lower())[:18]
        room_key = e["room"].replace(" ", "")[:12]
        section_key = re.sub(r"[^a-z0-9]", "", e["section"].lower())[:30]
        grouped[(e["day"], course_key, room_key, section_key)].append(dict(e))

    # Split repeated classes into contiguous slot runs. A class at slot 1 and
    # another at slot 5 must not be merged merely because course/room match.
    groups = []
    for items in grouped.values():
        items.sort(key=lambda x: x["slot"])
        run = []
        for item in items:
            if run and item["slot"] - run[-1]["slot"] > 2:
                groups.append(run)
                run = []
            run.append(item)
        if run:
            groups.append(run)

    merged = []
    for items in groups:
        items = sorted(items, key=lambda x: x["slot"])
        base = dict(items[0])
        base["end_slot"] = max(i.get("end_slot", i["slot"]) for i in items)
        base["end_time"] = max((i.get("end_time", "") for i in items), default=base.get("end_time", ""))
        all_text = " ".join(i["section"] + " " + i["course"] for i in items)

        # Best section
        m = re.search(
            r"((?:BS|BBA|BE|MBA|MS|PhD)[-IVX0-9()]*\([A-Za-z0-9, &\-]+\)[-A-Z0-9]*)",
            all_text,
        )
        if m:
            sec = re.sub(r"\s+", "", m.group(1))
            sec = sec.replace("(CS,CS-AI)", "(CS, CS-AI)")
            base["section"] = sec
        elif base["section"] in ("—", ""):
            m2 = re.search(r"((?:BS|BBA|BE)-\w+\([^)]+\))", all_text)
            if m2:
                base["section"] = re.sub(r"\s+", " ", m2.group(1))

        # Best course – strip section tails
        course = base["course"]
        course = re.sub(r"^(?:CS-AI|CS|SE|AI)\)-[A-Z]\s*", "", course)
        course = re.sub(r"^(?:BS|BBA|BE)[-\w() ,]+\s+", "", course)
        for i in items:
            c = re.sub(r"^(?:CS-AI|CS|SE)\)-[A-Z]\s*", "", i["course"])
            c = re.sub(r"\s+", " ", c).strip(" -")
            if len(c) > len(course):
                course = c
        base["course"] = course or base["course"]

        for i in items:
            if i["room"] not in ("—", ""):
                base["room"] = i["room"]
                break

        merged.append(base)

    merged.sort(key=lambda e: (DAY_ORDER.index(e["day"]) if e["day"] in DAY_ORDER else 9, e["slot"]))
    return merged


def extract_all(pdf_path: str | Path) -> list[dict]:
    doc = pymupdf.open(pdf_path)
    results = []
    print(f"Extracting {len(doc)} teacher pages (grid-based)...")

    for i in range(len(doc)):
        data = extract_page(doc[i], i + 1)
        results.append(data)
        if (i + 1) % 25 == 0 or i == 0 or i == len(doc) - 1:
            print(f"  [{i+1:3d}/{len(doc)}] {data['teacher']:<32} → {len(data['entries']):2d} classes")

    doc.close()
    return results


def main():
    if len(sys.argv) < 2:
        print("Usage: python faculty_extractor.py <Fall2026Teacherwise.pdf>")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)

    teachers = extract_all(pdf_path)

    out_dir = Path("data")
    out_dir.mkdir(exist_ok=True)
    out_file = out_dir / "faculty.json"

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(teachers, f, ensure_ascii=False, indent=2)

    total = sum(len(t["entries"]) for t in teachers)
    print(f"\nDone!")
    print(f"  Teachers : {len(teachers)}")
    print(f"  Classes  : {total}")
    print(f"  Output   : {out_file.resolve()}")


if __name__ == "__main__":
    main()
