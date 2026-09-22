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
  "CSE",
  "Electrical Engineering",
  "BBA",
  "A&F",
  "Economics",
  "Mathematics",
  "Media",
  "PE&SS",
  "B.Ed",
  "MBA",
  "ME",
  "MS",
  "MS Mathematics",
  "MPhil",
  "PhD",
  "Buffer Batch",
  "Additional",
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
  "BS (CS, AI)": "CS",
  "BS (CS, CS-AI)": "CS",
  "BS (SE)": "CS",
  "BS (CS, SE)": "CS",

  // ── Other undergraduate programs ──────────────────────────────────────────
  "BS (A&F)": "A&F",
  "BS (Economics)": "Economics",
  "BS (Maths)": "Mathematics",
  "BS (Media)": "Media",
  "BS (PE&SS)": "PE&SS",

  // ── Business ──────────────────────────────────────────────────────────────
  BBA: "BBA",
  "BBA (Agribusiness)": "BBA",
  MBA: "MBA",

  // ── Engineering ──────────────────────────────────────────────────────────
  BE: "Electrical Engineering",
  "BE (CS)": "CSE",
  "BE (CSE)": "CSE",
  "BE (EE)": "Electrical Engineering",
  "BE (Power)": "Electrical Engineering",
  "BE (Electronics)": "Electrical Engineering",

  ME: "ME",
  "ME (EC)": "ME",
  "ME (EE)": "ME",

  // ── Education ─────────────────────────────────────────────────────────────
  "B Ed": "B.Ed",
  "B eD": "B.Ed",
  BEd: "B.Ed",

  // ── Postgraduate ─────────────────────────────────────────────────────────
  MS: "MS",
  "MS (AI)": "MS",
  "MS (CS)": "MS",
  "MS (Mgt)": "MS",
  "MS (Maths)": "MS Mathematics",

  MPhil: "MPhil",
  "MPhil (II)": "MPhil",

  PhD: "PhD",
  "PhD (CS, SE)": "PhD",
  "PhD (EE)": "PhD",
  "PhD (Mgt)": "PhD",
  "PhD (Maths)": "PhD",
  "PhD (Education)": "PhD",

  // ── Special intake ───────────────────────────────────────────────────────
  "Buffer Batch": "Buffer Batch",
  ADDITIONAL: "Additional",
  Additional: "Additional",
}

/**
 * Convert a raw timetable program into the canonical department used by the UI.
 *
 * Unknown values return null rather than being silently assigned to the
 * wrong department.
 */
export function normalizeDepartment(
  program: string,
  _section?: string,
): Department | null {
  const trimmed = program.trim()

  if (!trimmed) return null

  const direct = PROGRAM_TO_DEPARTMENT[trimmed]
  if (direct) return direct

  const normalized = trimmed.replace(/\s+/g, " ")

  if (/^BE\b/i.test(normalized)) {
    if (/CSE|CS/i.test(normalized)) return "CSE"
    if (/EE|Power|Electronics|Electrical/i.test(normalized)) return "Electrical Engineering"
  }

  if (/^BS\b/i.test(normalized) && /CS|AI|SE/i.test(normalized)) return "CS"

  if (/^B\s*e?d\b/i.test(normalized)) return "B.Ed"

  return PROGRAM_TO_DEPARTMENT[normalized] ?? null
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
      entry.semester >= 0 &&
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