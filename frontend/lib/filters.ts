// Helpers for the phase-one Department → Semester → Section timetable filter.

import type { ClassEntry } from "@/components/timetable/ClassCard"

export interface Section {
  program: string
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

function uniqueSorted<T>(values: T[], compare: (a: T, b: T) => number): T[] {
  return Array.from(new Set(values)).sort(compare)
}

/** Derive filter choices from the same active-term SQLite records as the UI. */
export function getSectionFilterOptions(
  entries: ClassEntry[],
  selection: SectionFilterSelection,
): SectionFilterOptions {
  const validEntries = entries.filter(
    (entry) => entry.program && entry.semester && entry.section,
  )
  const departmentEntries = selection.department
    ? validEntries.filter((entry) => entry.program === selection.department)
    : validEntries
  const semesterEntries = selection.semester !== null
    ? departmentEntries.filter((entry) => entry.semester === selection.semester)
    : departmentEntries

  return {
    departments: uniqueSorted(validEntries.map((entry) => entry.program), (a, b) => a.localeCompare(b)),
    semesters: uniqueSorted(departmentEntries.map((entry) => entry.semester), (a, b) => a - b),
    sections: uniqueSorted(semesterEntries.map((entry) => entry.section), (a, b) => a.localeCompare(b)),
  }
}
