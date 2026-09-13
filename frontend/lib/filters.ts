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
 * Canonical department names shown to users.
 *
 * The timetable parser intentionally preserves the original program strings.
 * This layer converts those source-specific names into stable UI categories.
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
 * Maps timetable parser program names to the canonical department shown
 * in the UI.
 *
 * Keep this mapping in one place. Do not duplicate it in page.tsx,
 * SectionPicker.tsx, db.ts, or the backend.
 */
const PROGRAM_TO_DEPARTMENT: Record<string, Department> = {
  // Computer Science family
  BS: "CS",
  "BS (CS)": "CS",
  "BS (AI)": "CS",
  "BS (CS-AI)": "CS",
  "BS (SE)": "CS",

  // Accounting & Finance
  "BS (A&F)": "A&F",

  // Other BS departments
  "BS (Economics)": "Economics",
  "BS (Maths)": "Mathematics",
  "BS (Media)": "Media",
  "BS (PE&SS)": "PE&SS",

  // Business
  BBA: "BBA",
  MBA: "MBA",

  // Engineering
  BE: "BE",
  "BE (CS)": "BE",
  "BE (CSE)": "BE",
  "BE (EE)": "BE",

  ME: "ME",
  "ME (EC)": "ME",
  "ME (EE)": "ME",

  // Education
  "B Ed": "B.Ed",
  BEd: "B.Ed",

  // Postgraduate
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

  // Special intake
  "Buffer Batch": "Buffer Batch",
}

/**
 * Convert a raw timetable program into the canonical user-facing department.
 *
 * Unknown programs are intentionally omitted instead of silently assigning
 * them to a wrong department.
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
 * Return entries belonging to a canonical department.
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
 * Derive filter choices from the same active-term SQLite records used by
 * the timetable.
 *
 * Filtering is cumulative:
 *
 * Department
 *     ↓
 * Semester
 *     ↓
 * Section
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
    (a, b) => {
      const numericA = Number(a)
      const numericB = Number(b)

      if (!Number.isNaN(numericA) && !Number.isNaN(numericB)) {
        return numericA - numericB
      }

      return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    },
  )

  return {
    departments,
    semesters,
    sections,
  }
}