"""Validate and classify parsed timetable cells into structured entries.

Handles aSc Timetables export format:
  - Days (Mo,Tu,We,Th,Fr) as row labels in the left column
  - Time slots (1-10) as column headers in the top row
  - Each page = JKa section group (e.g., "BBA-I(A,B)")
  - Each cell = section_letter + course_name + room + teacher_code
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pymupdf

from backend.extractor.grid import LINE_TOLERANCE

_DAYS_FULL = {
    "Mo": "Monday", "Tu": "Tuesday", "We": "Wednesday",
    "Th": "Thursday", "Fr": "Friday",
}

_ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8}

_SLOT_MAP: dict[int, tuple[str, str]] = {}
_TIMESLOTS_JSON = Path(__file__).resolve().parents[2] / "shared" / "timeslots.json"
if _TIMESLOTS_JSON.exists():
    for _row in json.loads(_TIMESLOTS_JSON.read_text(encoding="utf-8")):
        _SLOT_MAP[_row["slot"]] = (_row["start"], _row["end"])

_SECTION_RE = re.compile(
    r"^([A-Z]+)"                         # program prefix
    r"-(?:[IVXLC]+)"                     # semester in Roman
    r"(?:\([^)]*\))?"                    # optional specialization
    r"\(([^)]+)\)",                      # sections inside parens, e.g. "A,B"
)

# Abbreviations that are NOT teacher codes (course-related)
_NOT_TEACHER = frozenset({
    "R", "B", "II", "III", "IV", "AM", "PM", "IT", "AI",
    "CS", "SE", "EE", "BS", "BA", "BBA", "MBA", "MS", "PHD",
    "THE", "AND", "FOR", "NOT", "BUT", "ALL", "CAN", "DID", "GET",
    "HAS", "HAD", "LET", "MAY", "NEW", "NOW", "OLD", "SEE", "WAY",
    "WHO", "BOY", "ITS", "PUT", "YES", "FAR", "OFF", "RUN",
    "TOP", "END", "BIG", "ASK", "MAN", "LAB", "USE",
})

# Text printed by aSc Timetables around the grid.  It is not course content,
# even when a PDF's vector grid happens to put it in a reconstructed cell.
_NON_COURSE_TEXT = frozenset({
    "sukkur iba university",
    "asc htimetables",
})

# Placeholder labels present in the exported source PDF. They are not real
# student sections and must never appear in the section picker.
_DUMMY_SECTIONS = frozenset({"X", "Y"})


@dataclass
class EntryData:
    program: str = ""
    semester: int = 0
    section: str = ""
    day: str = ""
    slot: int = 0
    start_time: str = ""
    end_time: str = ""
    course: str = ""
    teacher_code: str = ""
    room: str = ""
    building: str = ""
    is_online: bool = False
    term: str = ""


@dataclass
class FlaggedCell:
    raw_text: str
    cell_bbox: str
    flags: str
    page_no: int = 0


@dataclass
class ValidationResult:
    entries: list[EntryData] = field(default_factory=list)
    flagged: list[FlaggedCell] = field(default_factory=list)


# ── header parsing ────────────────────────────────────────────────────────────

def _parse_page_header(page: fitz.Page) -> tuple[str, list[str]]:
    """Extract section info from the page title.

    Titles are rendered at y < 0 (above the visible page) and may be
    split across multiple words (e.g. 'B.' 'Ed' '(A)' or 'BS' '(PE&SS)' '-VII').
    We join all words at the same y-position and try multiple patterns.

    Returns (program, list_of_section_letters).
    """
    words = page.get_text("words")

    # Build joined title text from words above the page (y < 0)
    title_words = sorted(
        [w for w in words if w[1] < 0],
        key=lambda w: (round(w[1], 0), w[0]),
    )
    if not title_words:
        # Also check y < 50 as fallback
        title_words = sorted(
            [w for w in words if w[1] < 50 and w[4].strip() not in ("Sukkur", "IBA", "University")],
            key=lambda w: (round(w[1], 0), w[0]),
        )

    # Group words by y-position (same line) and join each line
    lines: list[str] = []
    current_line_words: list[tuple] = []
    current_y: float | None = None
    for w in title_words:
        y_mid = (w[1] + w[3]) / 2
        if current_y is None or abs(y_mid - current_y) < 5:
            current_line_words.append(w)
            current_y = y_mid
        else:
            line_text = " ".join(wt[4].strip() for wt in sorted(current_line_words, key=lambda x: x[0]))
            lines.append(line_text)
            current_line_words = [w]
            current_y = y_mid
    if current_line_words:
        line_text = " ".join(wt[4].strip() for wt in sorted(current_line_words, key=lambda x: x[0]))
        lines.append(line_text)

    # Try each line against known patterns
    for title_text in lines:
        # Remove extra spaces
        title_text = re.sub(r"\s+", " ", title_text).strip()

        parsed = _parse_timetable_title(title_text)
        if parsed:
            return parsed

        # Pattern: BBA-I(A,B) or BS-VII(CS)-D
        m = _SECTION_RE.match(title_text)
        if m:
            program = m.group(1)
            secs_raw = m.group(2)
            sections = [s.strip() for s in re.split(r"[,&/\s]+", secs_raw) if s.strip()]
            return program, sections

        # Pattern: BS-V(CS)-E (section after specialization)
        m2 = re.match(r"^([A-Z]+)-[IVXLC]+\([^)]*\)-([A-Z][\w,&\s]*)$", title_text)
        if m2:
            return m2.group(1), [s.strip() for s in re.split(r"[,&/\s]+", m2.group(2)) if s.strip()]

        # Pattern: BBA-V(Agribusiness) (simple)
        m3 = re.match(r"^([A-Z]+)-[IVXLC]+\(([^)]+)\)$", title_text)
        if m3:
            return m3.group(1), [m3.group(2).strip()]

        # Pattern: B.Ed - I(A) (with periods and spaces)
        m4_spaced = re.match(r"^([A-Z]\.\s*[A-Za-z]+)\s*-\s*([IVXLC]+)\s*\(([^)]+)\)$", title_text)
        if m4_spaced:
            program = m4_spaced.group(1).replace(".", "").replace(" ", "").upper()
            sections = [s.strip() for s in re.split(r"[,&/\s]+", m4_spaced.group(3)) if s.strip()]
            return program, sections
        m4 = re.match(r"^([A-Z]+\.?[A-Za-z]*)\s*-\s*[IVXLC]*\s*\(([^)]+)\)$", title_text)
        if m4:
            program = m4.group(1).replace(".", "").strip()
            secs_raw = m4.group(2)
            sections = [s.strip() for s in re.split(r"[,&/\s]+", secs_raw) if s.strip()]
            return program, sections

        # Pattern: BS(PE&SS)-VII (no space before parenthesis)
        m5 = re.match(r"^([A-Z]+)\(([^)]+)\)-([IVXLC]+)$", title_text)
        if m5:
            return m5.group(1), []

        # Pattern: Ph.D-EE-II
        m6 = re.match(r"^([A-Za-z.]+)-([A-Z]+)-([IVXLC]+)(?:/[IVXLC]+)*$", title_text)
        if m6:
            return m6.group(1).replace(".", "").strip(), []

        # Pattern: Additional Course DOMM
        m7 = re.match(r"^Additional\s+Course\s+(.+)$", title_text)
        if m7:
            return "ADDITIONAL", []

        m8 = re.match(r"^([A-Za-z.]+)(?:\s*\(([^)]+)\)|-([A-Za-z]+))?\s*-?\s*([IVXLC]+)(?:\s*\(([^)]+)\))?$", title_text)
        if m8:
            base, specialization, dashed_name, _, sections_raw = m8.groups()
            program = "-".join(
                part.replace(".", "").strip().upper()
                for part in (base, specialization or dashed_name)
                if part
            )
            sections = [s.strip() for s in re.split(r"[,&/\s]+", sections_raw or "") if s.strip()]
            return program, sections

        if re.match(r"^Buffer\s+Batch\s*-\s*[IVXLC]+$", title_text, re.IGNORECASE):
            return "BUFFER", []

    return "", []


def _looks_like_section_group(value: str) -> bool:
    """True when a parenthesized value is section letters like A,B,C or CS,AI."""
    cleaned = value.strip()
    if not cleaned:
        return False

    if any(ch in cleaned for ch in (",", "&", "/")):
        return True

    tokens = [t for t in re.split(r"[\s,/&]+", cleaned) if t]
    if not tokens:
        return False

    if len(tokens) == 1:
        token = tokens[0]
        return bool(re.fullmatch(r"[A-Z](?:[A-Z0-9])?", token))

    return all(re.fullmatch(r"[A-Z](?:[A-Z0-9])?", t) for t in tokens)


def _split_section_codes(value: str) -> list[str]:
    """Split timetable section labels without treating a department as a section."""
    return [
        part.strip()
        for part in re.split(r"[,&/]", value.replace(" and ", ","))
        if part.strip()
    ]


def _parse_timetable_title(title: str) -> tuple[str, list[str]] | None:
    """Parse a timetable title while retaining department/specialisation identity.

    Examples:
      ``BBA-I(A,B)``          → (``BBA``, [``A``, ``B``])
      ``BS-III(CS,AI)-B``     → (``BS (CS, AI)``, [``B``])
      ``BS-I(A&F)-(A,B,C)``  → (``BS (A&F)``, [``A``, ``B``, ``C``])

    A previous parser interpreted ``CS`` or ``AI`` as the section.  That
    merged unrelated cohort pages and created conflicting entries.
    """
    if title.startswith("Additional Course "):
        return "ADDITIONAL", [title.removeprefix("Additional Course ").strip()]

    spaced_section = re.match(r"^([A-Za-z. ]+?)\s*-\s*([IVXLC]+)\s*\(([^)]+)\)$", title)
    if spaced_section:
        program = spaced_section.group(1).replace(".", "").strip()
        group_value = spaced_section.group(3).strip()
        if _looks_like_section_group(group_value):
            return program, _split_section_codes(group_value)
        return f"{program} ({group_value})", ["General"]

    # Titles where the department is before the semester, e.g. ``BE(CSE)-I``
    # and ``MS (CS,SE)-III``.  These pages describe one cohort, so use a
    # stable General section instead of inserting an empty section label.
    specialised = re.match(
        r"^([A-Za-z. ]+?)\s*\(([^)]+)\)\s*-\s*([IVXLC]+)(?:/[IVXLC]+)?$",
        title,
    )
    if specialised:
        program = specialised.group(1).replace(".", "").strip()
        speciality = re.sub(r"\s*,\s*", ", ", specialised.group(2).strip())
        return f"{program} ({speciality})", ["General"]

    single_specialization = re.match(r"^([A-Za-z. ]+?)\s*-\s*([IVXLC]+)\(([^)]+)\)$", title)
    if single_specialization:
        program = single_specialization.group(1).replace(".", "").strip()
        specialization = single_specialization.group(3).strip()
        return f"{program} ({specialization})", ["General"]

    # ``BS-Media-I`` and ``ME-EE-II`` encode the department between program
    # and semester.
    departmental = re.match(r"^([A-Za-z.]+)\s*-\s*([A-Za-z]+)\s*-\s*([IVXLC]+)(?:/[IVXLC]+)?$", title)
    if departmental:
        return f"{departmental.group(1).replace('.', '')} ({departmental.group(2)})", ["General"]

    departmental_spaced = re.match(r"^([A-Za-z.]+)\s*-\s*([A-Za-z]+)\s+([IVXLC]+)$", title)
    if departmental_spaced:
        return f"{departmental_spaced.group(1).replace('.', '')} ({departmental_spaced.group(2)})", ["General"]

    no_semester = re.match(r"^([A-Za-z.]+)(?:\s*-\s*|\s+)\(?([A-Za-z]+)\)?$", title)
    if no_semester:
        return f"{no_semester.group(1).replace('.', '')} ({no_semester.group(2)})", ["General"]

    # Plain single-cohort titles, such as ``B.Ed - VII`` or ``M.Phil-II``.
    plain = re.match(r"^([A-Za-z. ]+?)\s*-\s*([IVXLC]+)$", title)
    if plain:
        return plain.group(1).replace(".", "").strip(), ["General"]

    match = re.match(r"^([A-Za-z.]+)\s*-\s*([IVXLC]+)(.*)$", title)
    if not match:
        return None

    program = match.group(1).replace(".", "").strip()
    remainder = match.group(3).strip()
    groups = re.findall(r"\(([^)]+)\)", remainder)
    outside = re.sub(r"\([^)]*\)", "", remainder).strip(" -")

    specialization = ""
    sections: list[str] = []
    if outside:
        # A trailing code belongs to the section; preceding parenthesis groups
        # identify the department/specialisation.
        sections = _split_section_codes(outside)
        if groups:
            specialization = groups[0]
    elif len(groups) >= 2:
        # ``BS-I(A&F)-(A,B,C)``: first group is the department, final group
        # contains the section letters.
        specialization = groups[0]
        sections = _split_section_codes(groups[-1])
    elif groups:
        # ``BBA-I(A,B)`` and ``MBA-I(CS)`` are section groups.
        sections = _split_section_codes(groups[0])
    else:
        return None

    if specialization:
        specialization = re.sub(r"\s*,\s*", ", ", specialization.strip())
        program = f"{program} ({specialization})"
    return program, sections


def _extract_semester_from_page(page: fitz.Page) -> int:
    """Extract semester number from page title."""
    words = page.get_text("words")
    title_words = sorted(
        [w for w in words if w[1] < 0],
        key=lambda w: (round(w[1], 0), w[0]),
    )
    if not title_words:
        title_words = sorted(
            [w for w in words if w[1] < 50 and w[4].strip() not in ("Sukkur", "IBA", "University")],
            key=lambda w: (round(w[1], 0), w[0]),
        )

    title_text = " ".join(w[4].strip() for w in title_words)
    title_text = re.sub(r"\s+", " ", title_text).strip()

    # Try to find Roman numeral after a hyphen
    m = re.search(r"-([IVXLC]+)", title_text)
    if m:
        roman = m.group(1)
        return _ROMAN.get(roman, 0)

    # Try B.Ed format: look for standalone Roman numeral
    m2 = re.search(r"\b([IVXLC]+)\b", title_text)
    if m2:
        roman = m2.group(1)
        return _ROMAN.get(roman, 0)

    return 0


def _detect_slot_columns(page: fitz.Page) -> dict[int, tuple[float, float]]:
    """Map slot numbers to their x-coordinate ranges from the header row.

    Returns {slot_no: (x_left, x_right)}.
    """
    words = page.get_text("words")
    slot_x: dict[int, float] = {}

    for w in words:
        x0, y0, x1, y1 = w[0], w[1], w[2], w[3]
        text = w[4].strip()
        if y0 > 110:
            continue
        if text.isdigit():
            num = int(text)
            if 1 <= num <= 10:
                cx = (x0 + x1) / 2
                slot_x[num] = cx

    if not slot_x:
        return {}

    sorted_slots = sorted(slot_x.items(), key=lambda kv: kv[1])
    boundaries: list[float] = []
    for i, (slot, cx) in enumerate(sorted_slots):
        if i == 0:
            boundaries.append(max(cx - 50, 0))
        else:
            prev_cx = sorted_slots[i - 1][1]
            boundaries.append((prev_cx + cx) / 2)
    boundaries.append(sorted_slots[-1][1] + 50)

    result: dict[int, tuple[float, float]] = {}
    for i, (slot, cx) in enumerate(sorted_slots):
        result[slot] = (boundaries[i], boundaries[i + 1])
    return result


def _detect_day_rows(page: fitz.Page) -> dict[str, tuple[float, float]]:
    """Map day abbreviations to their y-coordinate ranges from the left column.

    Returns {"Monday": (y_top, y_bottom), ...}.
    """
    words = page.get_text("words")
    day_positions: dict[str, float] = {}

    for w in words:
        text = w[4].strip()
        if text in _DAYS_FULL and w[0] < 60:
            cy = (w[1] + w[3]) / 2
            day_positions[text] = cy

    if not day_positions:
        return {}

    sorted_days = sorted(day_positions.items(), key=lambda kv: kv[1])
    boundaries: list[float] = [0]
    for i in range(1, len(sorted_days)):
        prev_y = sorted_days[i - 1][1]
        cur_y = sorted_days[i][1]
        boundaries.append((prev_y + cur_y) / 2)
    boundaries.append(sorted_days[-1][1] + 80)

    result: dict[str, tuple[float, float]] = {}
    for i, (abbrev, cy) in enumerate(sorted_days):
        full_day = _DAYS_FULL[abbrev]
        result[full_day] = (boundaries[i], boundaries[i + 1])
    return result

def _slots_for_cell(
    cell: dict[str, float],
    slot_cols: dict[int, tuple[float, float]],
) -> list[int]:
    """Return every timetable slot whose header center lies inside the cell.

    aSc Timetables merges adjacent slot cells when one class occupies
    multiple consecutive periods. A merged PDF cell therefore represents
    multiple timetable slots, not one slot at its geometric center.
    """
    cell_left = float(cell["x0"])
    cell_right = float(cell["x1"])

    slot_centers = sorted(
        (
            slot_no,
            (float(x_left) + float(x_right)) / 2,
        )
        for slot_no, (x_left, x_right) in slot_cols.items()
    )

    matched = [
        slot_no
        for slot_no, center in slot_centers
        if cell_left - 1.0 <= center <= cell_right + 1.0
    ]

    if matched:
        return matched

    # Defensive fallback for unusual PDF geometry.
    cell_center = (cell_left + cell_right) / 2
    nearest_slot = min(
        slot_cols,
        key=lambda slot_no: abs(
            (
                float(slot_cols[slot_no][0])
                + float(slot_cols[slot_no][1])
            ) / 2
            - cell_center
        ),
    )
    return [nearest_slot]

# ── cell parsing ──────────────────────────────────────────────────────────────

def parse_room(text: str) -> tuple[str, str, bool]:
    """Extract room code, building, and online flag from cell text."""
    lower = text.lower()
    if "online" in lower or "zoom" in lower or "teams" in lower:
        return "", "", True

    # Special lab venue used by the education/biology schedules.
    if re.search(r"\bKC\b", text, re.IGNORECASE):
        return "KC", "", False

    # Try R-XXX pattern (2-4 digits)
    room_pat = re.compile(r"(R[-_]?\d{2,4})", re.IGNORECASE)
    m = room_pat.search(text)
    if m:
        room_code = m.group(1).upper().replace("_", "-")
        build_match = re.search(r"(B[-_]?(?:I{1,3}|IV|V)\b)", text, re.IGNORECASE)
        building = build_match.group(1).upper().replace("_", "-") if build_match else ""
        return room_code, building, False

    # Try R-X pattern (single digit — short room codes like R-3, R-5)
    room_pat_short = re.compile(r"\bR-(\d)\b", re.IGNORECASE)
    m2 = room_pat_short.search(text)
    if m2:
        room_code = "R-" + m2.group(1)
        build_match = re.search(r"(B[-_]?(?:I{1,3}|IV|V)\b)", text, re.IGNORECASE)
        building = build_match.group(1).upper().replace("_", "-") if build_match else ""
        return room_code, building, False

    # Try Room-XXX pattern
    room_pat2 = re.compile(r"(Room[-_]?\d{1,4})", re.IGNORECASE)
    m3 = room_pat2.search(text)
    if m3:
        room_code = m3.group(1).upper().replace("ROOM", "R").replace("_", "-")
        build_match = re.search(r"(B[-_]?(?:I{1,3}|IV|V)\b)", text, re.IGNORECASE)
        building = build_match.group(1).upper().replace("_", "-") if build_match else ""
        return room_code, building, False

    # Try Lab-X pattern
    lab_pat = re.compile(r"(Lab[-_]?\d{1,2})", re.IGNORECASE)
    m4 = lab_pat.search(text)
    if m4:
        room_code = m4.group(1).upper()
        build_match = re.search(r"(B[-_]?(?:I{1,3}|IV|V)\b)", text, re.IGNORECASE)
        building = build_match.group(1).upper().replace("_", "-") if build_match else ""
        return room_code, building, False

    return "", "", False


def parse_teacher_code(text: str) -> str:
    """Extract teacher code from timetable cell text.

    Handles:
    - Multi-letter codes with word boundary: 'PK', 'DGA', 'DSH'
    - Single-letter codes: 'A', 'D', 'Z'
    - Codes glued to words: 'FinanceDGA' → 'DGA'
    - Codes after room: 'R-108,B-II A' → 'A'
    """
    # 1. Multi-letter codes with word boundary
    matches = re.findall(r"\b([A-Z]{2,4})\b", text)
    for code in matches:
        if code not in _NOT_TEACHER:
            return code

    # 2. Trailing uppercase sequence glued to word: 'FinanceDGA' → 'DGA'
    m = re.search(r"[a-z]([A-Z]{2,4})\s*$", text)
    if m:
        code = m.group(1)
        if code not in _NOT_TEACHER:
            return code

    # 3. Uppercase code after building/room pattern (e.g., 'B-II PK' → 'PK')
    m = re.search(r"(?:B[-_]?(?:I{1,3}|IV|V)|R[-_]\d{2,4})[,\s]+([A-Z]{1,4})\s*$", text)
    if m:
        code = m.group(1)
        if code not in _NOT_TEACHER:
            return code

    # 4. Single letter at very end of text
    m = re.search(r"(?:^|\s)([A-Z])\s*$", text)
    if m:
        code = m.group(1)
        if code not in _NOT_TEACHER:
            return code

    # 5. Trailing single letter glued to word
    m = re.search(r"[a-z]([A-Z])\s*$", text)
    if m:
        code = m.group(1)
        if code not in _NOT_TEACHER:
            return code

    return ""


def _strip_teacher_code_from_name(match: re.Match) -> str:
    """Regex callback: returns empty string if a 2-4 uppercase match is a teacher code."""
    code = match.group(1)
    if code in _NOT_TEACHER:
        return code
    # Keep it — it's likely a teacher code embedded in course name
    return ""


def _strip_glued_code(match: re.Match) -> str:
    """Regex callback: strip uppercase code glued to a lowercase word if it's a teacher code."""
    letter = match.group(1)
    code = match.group(2)
    if code in _NOT_TEACHER:
        return letter + code
    return letter


def parse_cell_text(text: str) -> dict[str, str]:
    """Best-effort parse of a timetable cell.

    Format: section_letter course_name room_code teacher_code
    E.g.: "A Computer App to Business R-108,B-II A"
    """
    text = text.strip()
    if not text:
        return {"course": "", "teacher_code": "", "room": "", "building": "", "is_online": ""}

    room, building, is_online = parse_room(text)
    # Do not mistake the "LR" in a lab room (LR-107) for an instructor.
    teacher_text = re.sub(r"\bL?R[-_]?\d{1,4}\b", "", text, flags=re.IGNORECASE)
    teacher_text = re.sub(r"\bB[-_]?(?:I{1,3}|IV|V)\b", "", teacher_text, flags=re.IGNORECASE)
    teacher_code = parse_teacher_code(teacher_text)

    # Strip room from the text to get clean course name
    course_text = text
    if room:
        room_pat = re.compile(re.escape(room) + r"(?:,?\s*B[-_]?(?:I{1,3}|IV|V)\b)?", re.IGNORECASE)
        course_text = room_pat.sub("", course_text)

    # Strip building references
    course_text = re.sub(r"B[-_]?(?:I{1,3}|IV|V)\b", "", course_text, flags=re.IGNORECASE)

    # Strip Room-XXX patterns (e.g., 'Room-011', 'Room-010')
    course_text = re.sub(r"\bRoom[-_]?\d{1,4}\b", "", course_text, flags=re.IGNORECASE)

    # Strip Lab-X patterns (e.g., 'Lab-2', 'Lab-2, R-3')
    course_text = re.sub(r"\bLab[-_]?\d{1,2}\b", "", course_text, flags=re.IGNORECASE)

    # Strip 'English Lab' and similar named labs
    course_text = re.sub(r"\bEnglish\s+Lab\b", "", course_text, flags=re.IGNORECASE)
    course_text = re.sub(r"\w+\s+Lab\b", "", course_text, flags=re.IGNORECASE)

    # Strip short room codes R-X (single digit)
    course_text = re.sub(r"\bR-\d\b", "", course_text, flags=re.IGNORECASE)

    # Strip teacher code from end (handles glued codes like 'FinanceDGA')
    if teacher_code:
        course_text = re.sub(re.escape(teacher_code) + r"\s*$", "", course_text)
        # Also handle glued variant: lowercase letter immediately before code
        course_text = re.sub(r"[a-z](" + re.escape(teacher_code) + r")\s*$", "", course_text)

    # Strip embedded teacher codes between words (e.g., 'Digital MKT Marketing' → 'Digital Marketing')
    course_text = re.sub(r"\b([A-Z]{2,4})\b", _strip_teacher_code_from_name, course_text)

    # Strip teacher codes glued to words (e.g., 'InternationalFIN' → 'International')
    course_text = re.sub(r"([a-z])([A-Z]{2,4})\b", _strip_glued_code, course_text)

    # Clean up
    course_text = re.sub(r"(\w)-\s+([a-z])\b", r"\1-\2", course_text)
    course_text = re.sub(r"(-[A-Za-z]+)\s+([a-z])\b", r"\1\2", course_text)
    course_text = re.sub(r"\s+", " ", course_text).strip()
    course_text = course_text.strip(",- ")

    # Strip "Smart Class -" and "Smart Class" with trailing teacher codes
    course_text = re.sub(r"\s*Smart\s+Class\s*(?:[-–]\s*(?:[A-Z]{1,4}\s*)*)*$", "", course_text, flags=re.IGNORECASE)

    # Strip trailing punctuation artifacts
    course_text = re.sub(r"\s*/\s*$", "", course_text)
    course_text = re.sub(r"\s*[-–]\s*$", "", course_text)
    course_text = re.sub(r"\s*,\s*$", "", course_text)
    course_text = re.sub(r"\s*\.\s*$", "", course_text)

    # Strip "Group N" prefix patterns
    course_text = re.sub(r"^Group\s+\d+\s*", "", course_text, flags=re.IGNORECASE)

    # Strip trailing parenthesized content like "(Lab)" from course name if it's a room
    course_text = re.sub(r"\s*\(Lab\)\s*$", " Lab", course_text)

    # Strip trailing single uppercase letters that are teacher codes (e.g., "..., A")
    course_text = re.sub(r"\s*,\s*[A-Z]{1,4}\s*$", "", course_text)

    # Strip embedded section letters (e.g., "Business A Math" → "Business Math")
    course_text = _strip_embedded_section(course_text)

    # If still multi-line, take first meaningful line
    course_parts = []
    for line in course_text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if re.match(r"^R[-_]?\d", line, re.IGNORECASE):
            continue
        if re.match(r"^[A-Z]{2,4}$", line) and len(line) <= 4:
            continue
        if "online" in line.lower() or "zoom" in line.lower():
            continue
        course_parts.append(line)
    course_name = " ".join(course_parts).strip()
    course_name = re.sub(r"\bLa\s+b\b", "Lab", course_name, flags=re.IGNORECASE)

    if not course_name:
        course_name = text.split("\n")[0].strip()

    return {
        "course": _fix_word_splits(course_name),
        "teacher_code": teacher_code,
        "room": room,
        "building": building,
        "is_online": "1" if is_online else "0",
    }


def _fix_word_splits(name: str) -> str:
    """Fix common word-split artifacts caused by PDF column boundaries.

    When aSc Timetables exports a PDF, words spanning cell boundaries get split
    into separate fragments with spaces between them. This function rejoins them.
    """
    if not name:
        return name

    # Known incomplete word prefixes that should merge with common suffixes
    _INCOMPLETE_PREFIXES = {
        "mathematic": "mathematics",
        "programmi": "programming",
        "algorithm": "algorithms",
        "manageme": "management",
        "managemen": "management",
        "developme": "development",
        "performanc": "performance",
        "microecono": "microeconomics",
        "internationa": "international",
        "entrepreneu": "entrepreneurship",
        "utilizatio": "utilization",
        "transmissio": "transmission",
        "constructio": "construction",
        "organizatio": "organizational",
        "intermediat": "intermediate",
        "fundamenta": "fundamentals",
        "informati": "information",
        "specializatio": "specialization",
        "automa": "automation",
        "accounti": "accounting",
        "orie": "oriented",
        "technolog": "technologies",
        "technologie": "technologies",
        "constitu": "constitution",
        "agribusines": "agribusiness",
        "statistic": "statistics",
    }

    # Quick check: does any word in the name look like it needs fixing?
    # Check for short lowercase fragments that could be split-off suffixes
    words_check = name.split()
    needs_fix = len(words_check) >= 2 and any(
        len(w) <= 5 and w.isalpha() and w[0].islower()
        for w in words_check[1:]
    )
    if not needs_fix:
        return name

    words = name.split()
    if len(words) < 2:
        return name

    result = [words[0]]
    for w in words[1:]:
        prev = result[-1]
        prev_lower = prev.lower()
        wl = w.lower()

        # Check known prefix→suffix merges
        merged = False
        for prefix, full_word in _INCOMPLETE_PREFIXES.items():
            if prev_lower.startswith(prefix) and wl and wl[0].islower():
                # Check if this suffix completes the word
                expected_suffix = full_word[len(prefix):]
                if expected_suffix and wl.startswith(expected_suffix[:len(wl)]):
                    result[-1] = prev + w
                    merged = True
                    break

        if merged:
            continue

        # Generic suffix merge for short lowercase fragments
        _SPLIT_SUFFIXES = {
            "ng", "ms", "nt", "ls", "ics", "ion", "tion", "sion",
            "ment", "ness", "ship", "ing", "ers", "ies", "ous",
            "ive", "ful", "ism", "ity", "ent", "ant", "ence",
            "ance", "tics", "mics", "rics", "ering", "ting", "ling",
            "ed", "er", "al", "ly", "able", "ible", "less", "ation",
        }
        if (
            len(w) <= 5
            and w.isalpha()
            and w[0].islower()
            and prev
            and prev[-1].islower()
            and prev[-1].isalpha()
            and wl in _SPLIT_SUFFIXES
            and len(prev) >= 4
        ):
            result[-1] = prev + w
        else:
            result.append(w)

    return " ".join(result)


def _extract_section_letter(text: str) -> str:
    """Extract the leading section letter from a cell.

    Cells like 'A Computer App to Business R-108,B-II A' start with the section letter.
    """
    first_word = text.split()[0] if text.strip() else ""
    if len(first_word) <= 2 and first_word.isalpha() and first_word.isupper():
        return first_word
    return ""


def _strip_section_letter(text: str) -> str:
    """Remove the leading section letter from cell text."""
    parts = text.split(None, 1)
    if parts and len(parts[0]) <= 2 and parts[0].isalpha() and parts[0].isupper():
        return parts[1] if len(parts) > 1 else ""
    return text


def _strip_embedded_section(text: str) -> str:
    """Remove single uppercase section letters embedded in course names.

    E.g., 'Business A Mathematics' → 'Business Mathematics'
    Only strips single uppercase letters that are likely section labels.
    Preserves Roman numerals (I, II, III, IV, V, VI) which are part of course names.
    """
    ROMAN_NUMERALS = {"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"}
    words = text.split()
    if len(words) <= 2:
        return text
    result = []
    for w in words:
        if len(w) == 1 and w.isupper() and w not in ROMAN_NUMERALS:
            continue
        result.append(w)
    return " ".join(result)


# ── main classification ───────────────────────────────────────────────────────

def classify_cells(
    records: list[dict[str, Any]],
    page: fitz.Page | None = None,
    page_no: int = 0,
    program_override: str = "",
    semester_override: int = 0,
    section_override: str = "",
    term: str = "",
) -> ValidationResult:
    """Classify raw parser output into EntryData and flagged cells.

    Parameters
    ----------
    records : list of ``{"cell": {x0,y0,x1,y1}, "text": str}``
    page : the fitz.Page object for header/position detection
    page_no : page index for flagged cell tracking
    program_override, semester_override, section_override : override auto-detected metadata
    term : e.g. "Fall-2025"
    """
    if not records:
        return ValidationResult()

    slot_cols: dict[int, tuple[float, float]] = {}
    day_rows: dict[str, tuple[float, float]] = {}
    program = program_override
    semester = semester_override
    sections_from_header: list[str] = []

    if page is not None:
        detected_program, sections_from_header = _parse_page_header(page)
        program = detected_program or program_override
        semester = _extract_semester_from_page(page) or semester_override
        slot_cols = _detect_slot_columns(page)
        day_rows = _detect_day_rows(page)

    if not slot_cols or not day_rows:
        return ValidationResult(
            flagged=[
                FlaggedCell(
                    raw_text="no grid detected",
                    cell_bbox="{}",
                    flags="missing_grid",
                    page_no=page_no,
                )
            ]
        )

    result = ValidationResult()

    for rec in records:
        cell = rec["cell"]
        text = rec["text"].strip()
        cx = (cell["x0"] + cell["x1"]) / 2
        cy = (cell["y0"] + cell["y1"]) / 2

        if not text:
            continue

        normalized_text = re.sub(r"\s+", " ", text).strip().lower()
        if (
            normalized_text in _NON_COURSE_TEXT
            or normalized_text.startswith("timetable generated:")
            or normalized_text.startswith("lunch & prayer break")
            or normalized_text.endswith("break")
        ):
            continue

        is_header_row = any(
            text.startswith(str(s)) or text.startswith("Break")
            for s in range(1, 11)
        )
        if is_header_row and cy < 110:
            continue

        # Skip cells in the day-label column (left of all slot columns)
        min_slot_x = min(x_left for x_left, _ in slot_cols.values()) if slot_cols else 100
        if cx < min_slot_x:
            continue

        # Skip day label text (Mo, Tu, We, Th, Fr, Monday, etc.)
        if text in _DAYS_FULL or text in _DAYS_FULL.values():
            continue

        assigned_day = ""
        for day_name, (y_top, y_bottom) in day_rows.items():
            if y_top <= cy <= y_bottom:
                assigned_day = day_name
                break

        assigned_slots = _slots_for_cell(cell, slot_cols)

        lower_text = text.lower()
        if (
            ("sukkur" in lower_text and ("university" in lower_text or "iba" in lower_text))
            or "timetable generated" in lower_text
            or "asc timetables" in lower_text
        ):
            continue

        marker_section = str(rec.get("section_marker") or "").strip()
        text_section = _extract_section_letter(text)
        section_letter = marker_section or text_section

        if section_letter in _DUMMY_SECTIONS:
            continue

        if sections_from_header:
            # A course title can begin with an uppercase abbreviation (such
            # as HR or OB), which the loose cell parser can mistake for a
            # section. The page heading is authoritative when it declares
            # sections, so retain only labels that appear there. The parser's
            # marker can be polluted by teacher codes, so prefer the explicit
            # cell label when that marker is not one of the declared sections.
            section_letter = (
                section_letter
                if section_letter in sections_from_header
                else text_section
                if text_section in sections_from_header
                else sections_from_header[0]
            )
        else:
            # Some valid timetable pages (for example MS, Media, and Buffer
            # Batch schedules) have no per-cell section letter. Keep those
            # courses visible under one explicit section instead of inventing
            # sections from uppercase words at the beginning of course names.
            section_letter = section_override or "General"

        # Only remove a leading token from the course when it is a confirmed
        # section label. For schedules without explicit sections, abbreviations
        # such as HR belong to the course title.
        content_text = (
            _strip_section_letter(text)
            if sections_from_header and _extract_section_letter(text) in sections_from_header
            else text
        )

        if not assigned_day or not assigned_slots:
            result.flagged.append(FlaggedCell(
                raw_text=text,
                cell_bbox=json.dumps(cell),
                flags=f"day={assigned_day or '?'} slot={assigned_slots or '?'}",
                page_no=page_no,
            ))
            continue

        parsed = parse_cell_text(content_text)
        # Never create a display entry from page furniture or a cell whose
        # content could not be interpreted as a course.
        if not parsed["course"] or parsed["course"].lower() in _NON_COURSE_TEXT:
            continue

        # Keep the class visible, but make incomplete source cells reviewable
        # through the admin flagged-cells endpoint instead of inventing a room.
        if not parsed["room"] and parsed["is_online"] != "1":
            result.flagged.append(FlaggedCell(
                raw_text=text,
                cell_bbox=json.dumps(cell),
                flags="missing_room",
                page_no=page_no,
            ))

        # A single PDF cell can span multiple timetable slots.
        # Create one timetable entry for every slot covered by the cell.
        for assigned_slot in assigned_slots:
            start_time, end_time = _SLOT_MAP.get(
                assigned_slot,
                ("", ""),
            )

            entry = EntryData(
                program=program,
                semester=semester,
                section=section_letter,
                day=assigned_day,
                slot=assigned_slot,
                start_time=start_time,
                end_time=end_time,
                course=parsed["course"],
                teacher_code=parsed["teacher_code"],
                room=parsed["room"],
                building=parsed["building"],
                is_online=parsed["is_online"] == "1",
                term=term,
            )
            result.entries.append(entry)

    return result