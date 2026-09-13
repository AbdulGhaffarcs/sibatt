// frontend/lib/filters.ts
// Canonical Department → Semester → Section filtering for timetable selection.

import type { ClassEntry } from "@/components/timetable/ClassCard"

export interface Section {
  department: string
  semester: number
  section: string
}

export interface SectionFilterOptions {
  departments: string[]
  semesters: number[]
  sections: string[]
}

export interface SectionFilterSelection {
  department: string
  semester: number | null
}

/**
 * Canonical department order shown to users.
 *
 * The raw PDF/program names are normalized into these categories.
 */
export const DEPARTMENT_ORDER = [
  "CS",
  "BBA",
  "A&F",
  "Economics",
  "Mathematics",
  "Media",
  "PE&SS",
  "BE",
  "B.Ed",
  "MBA",
  "ME",
  "MS",
  "MPhil",
  "PhD",
  "Buffer Batch",
] as const

export type Department = (typeof DEPARTMENT_ORDER)[number]

/**
 * Raw program names from the timetable → canonical UI department.
 *
 * The CS undergraduate family intentionally collapses into one "CS"
 * department. Sections then distinguish the cohorts.
 */
const PROGRAM_TO_DEPARTMENT: Record<string, Department> = {
  // ── Computer Science ─────────────────────────────────────────────────────
  BS: "CS",
  "BS (CS)": "CS",
  "BS (AI)": "CS",
  "BS (CS-AI)": "CS",
  "BS (SE)": "CS",

  // ── Other undergraduate programs ──────────────────────────────────────────
  "BS (A&F)": "A&F",
  "BS (Economics)": "Economics",
  "BS (Maths)": "Mathematics",
  "BS (Media)": "Media",
  "BS (PE&SS)": "PE&SS",

  // ── Business ──────────────────────────────────────────────────────────────
  BBA: "BBA",
  MBA: "MBA",

  // ── Engineering ──────────────────────────────────────────────────────────
  BE: "BE",
  "BE (CS)": "BE",
  "BE (CSE)": "BE",
  "BE (EE)": "BE",

  ME: "ME",
  "ME (EC)": "ME",
  "ME (EE)": "ME",

  // ── Education ─────────────────────────────────────────────────────────────
  "B Ed": "B.Ed",
  BEd: "B.Ed",

  // ── Postgraduate ─────────────────────────────────────────────────────────
  MS: "MS",
  "MS (AI)": "MS",
  "MS (CS)": "MS",
  "MS (Mgt)": "MS",

  MPhil: "MPhil",
  "MPhil (II)": "MPhil",

  PhD: "PhD",
  "PhD (CS, SE)": "PhD",
  "PhD (EE)": "PhD",
  "PhD (Mgt)": "PhD",

  // ── Special intake ───────────────────────────────────────────────────────
  "Buffer Batch": "Buffer Batch",
}

/**
 * Convert a raw timetable program into the canonical department used by the UI.
 *
 * Unknown values return null rather than being silently assigned to the
 * wrong department.
 */
export function normalizeDepartment(program: string): Department | null {
  return PROGRAM_TO_DEPARTMENT[program.trim()] ?? null
}

function uniqueSorted<T>(
  values: T[],
  compare: (a: T, b: T) => number,
): T[] {
  return Array.from(new Set(values)).sort(compare)
}

function departmentRank(department: string): number {
  const index = DEPARTMENT_ORDER.indexOf(
    department as Department,
  )

  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

/**
 * Return all timetable entries belonging to a canonical department.
 */
export function entriesForDepartment(
  entries: ClassEntry[],
  department: string,
): ClassEntry[] {
  return entries.filter(
    (entry) => normalizeDepartment(entry.program) === department,
  )
}

/**
 * Build the choices available to the progressive timetable picker.
 *
 * Department
 *     ↓
 * Semester
 *     ↓
 * Section
 *
 * Each level is constrained by the level before it.
 */
export function getSectionFilterOptions(
  entries: ClassEntry[],
  selection: SectionFilterSelection,
): SectionFilterOptions {
  const validEntries = entries.filter(
    (entry) =>
      entry.program &&
      entry.semester &&
      entry.section &&
      normalizeDepartment(entry.program) !== null,
  )

  const departmentEntries = selection.department
    ? validEntries.filter(
        (entry) =>
          normalizeDepartment(entry.program) === selection.department,
      )
    : validEntries

  const semesterEntries =
    selection.semester !== null
      ? departmentEntries.filter(
          (entry) => entry.semester === selection.semester,
        )
      : departmentEntries

  const departments = uniqueSorted(
    validEntries
      .map((entry) => normalizeDepartment(entry.program))
      .filter((value): value is Department => value !== null),
    (a, b) => departmentRank(a) - departmentRank(b),
  )

  const semesters = uniqueSorted(
    departmentEntries.map((entry) => entry.semester),
    (a, b) => a - b,
  )

  const sections = uniqueSorted(
    semesterEntries.map((entry) => entry.section),
    (a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
  )

  return {
    departments,
    semesters,
    sections,
  }
}