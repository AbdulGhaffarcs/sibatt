"""Grid reconstruction from vector lines in a PDF page."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterable

import fitz


LINE_TOLERANCE = 1.0
MIN_LINE_LENGTH = 2.0


def _cluster_values(values: Iterable[float], tolerance: float = LINE_TOLERANCE) -> list[float]:
    sorted_values = sorted(values)
    clusters: list[list[float]] = []

    for value in sorted_values:
        if not clusters or abs(value - clusters[-1][-1]) > tolerance:
            clusters.append([value])
        else:
            clusters[-1].append(value)

    return [round(sum(cluster) / len(cluster), 3) for cluster in clusters]


def _snap(value: float, clustered_values: list[float]) -> float:
    return min(clustered_values, key=lambda candidate: abs(candidate - value))


def _extract_lines(page: fitz.Page) -> tuple[list[tuple[float, float, float]], list[tuple[float, float, float]]]:
    horizontal: list[tuple[float, float, float]] = []
    vertical: list[tuple[float, float, float]] = []

    def add_line(x0: float, y0: float, x1: float, y1: float) -> None:
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
                rect = item[1]
                add_line(float(rect.x0), float(rect.y0), float(rect.x1), float(rect.y0))
                add_line(float(rect.x0), float(rect.y1), float(rect.x1), float(rect.y1))
                add_line(float(rect.x0), float(rect.y0), float(rect.x0), float(rect.y1))
                add_line(float(rect.x1), float(rect.y0), float(rect.x1), float(rect.y1))

    if not horizontal or not vertical:
        return [], []

    xs = _cluster_values([line[0] for line in vertical])
    ys = _cluster_values([line[0] for line in horizontal])

    snapped_horizontal = [
        (_snap(y, ys), min(_snap(x0, xs), _snap(x1, xs)), max(_snap(x0, xs), _snap(x1, xs)))
        for y, x0, x1 in horizontal
    ]
    snapped_vertical = [
        (_snap(x, xs), min(_snap(y0, ys), _snap(y1, ys)), max(_snap(y0, ys), _snap(y1, ys)))
        for x, y0, y1 in vertical
    ]

    return snapped_horizontal, snapped_vertical


def _covers(intervals: list[tuple[float, float]], start: float, end: float) -> bool:
    relevant = sorted((max(a, start), min(b, end)) for a, b in intervals if b >= start and a <= end)
    if not relevant:
        return False

    covered_until = start
    for a, b in relevant:
        if a > covered_until + LINE_TOLERANCE:
            return False
        covered_until = max(covered_until, b)
        if covered_until >= end - LINE_TOLERANCE:
            return True

    return False


def extract_grid(page: fitz.Page) -> list[dict]:
    """Reconstruct cell bounding boxes from intersecting horizontal and vertical lines."""
    horizontal, vertical = _extract_lines(page)
    if not horizontal or not vertical:
        return []

    xs = sorted({x for x, _, _ in vertical})
    ys = sorted({y for y, _, _ in horizontal})
    horizontal_by_y: dict[float, list[tuple[float, float]]] = {y: [] for y in ys}
    vertical_by_x: dict[float, list[tuple[float, float]]] = {x: [] for x in xs}

    for y, x0, x1 in horizontal:
        horizontal_by_y.setdefault(y, []).append((x0, x1))
    for x, y0, y1 in vertical:
        vertical_by_x.setdefault(x, []).append((y0, y1))

    cells: list[dict] = []
    for x0, x1 in zip(xs, xs[1:]):
        for y0, y1 in zip(ys, ys[1:]):
            if (
                _covers(horizontal_by_y.get(y0, []), x0, x1)
                and _covers(horizontal_by_y.get(y1, []), x0, x1)
                and _covers(vertical_by_x.get(x0, []), y0, y1)
                and _covers(vertical_by_x.get(x1, []), y0, y1)
            ):
                cells.append({"x0": float(x0), "y0": float(y0), "x1": float(x1), "y1": float(y1)})

    return cells


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python backend/extractor/grid.py <pdf-path>")
        raise SystemExit(1)

    doc = fitz.open(Path(sys.argv[1]))
    page = doc[0]
    cells = extract_grid(page)
    print(f"Page 1 cells: {len(cells)}")
    for cell in cells[:5]:
        print(cell)
    doc.close()
