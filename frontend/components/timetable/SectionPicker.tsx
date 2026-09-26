// frontend/components/timetable/SectionPicker.tsx
// Progressive Department → Semester → Section timetable selector.

"use client"

import { useMemo, useState } from "react"
import type { ClassEntry } from "@/components/timetable/ClassCard"
import {
  getSectionFilterOptions,
  type Section,
} from "@/lib/filters"
import {
  ACTIVE_TERM,
  SEM_ROMAN,
  TERM_START_DATE,
} from "@/lib/constants"

interface SectionPickerProps {
  entries: ClassEntry[]
  onSelect: (section: Section) => void
}

export default function SectionPicker({
  entries,
  onSelect,
}: SectionPickerProps) {
  const [department, setDepartment] = useState("")
  const [semester, setSemester] = useState<number | null>(null)
  const [section, setSection] = useState("")

  const options = useMemo(
    () =>
      getSectionFilterOptions(entries, {
        department,
        semester,
      }),
    [entries, department, semester],
  )

  function chooseDepartment(value: string) {
    setDepartment(value)
    setSemester(null)
    setSection("")
  }

  function chooseSemester(value: string) {
    setSemester(value ? Number(value) : null)
    setSection("")
  }

  function handleConfirm() {
    if (!section || !department || semester === null) {
      return
    }

    onSelect({
      department,
      semester,
      section,
    })
  }

  return (
    <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-medium text-zinc-900">
            Select timetable
          </span>
          <span className="text-right text-[11px] text-zinc-500">
            {ACTIVE_TERM} · {TERM_START_DATE}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-3">
        {/* Department */}
        <label className="flex flex-col gap-2 text-[13px] font-medium text-zinc-700">
          Department

          <select
            aria-label="Department"
            value={department}
            onChange={(event) => chooseDepartment(event.target.value)}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-[14px] font-normal text-zinc-900 outline-none focus:border-zinc-900"
          >
            <option value="">Select department</option>

            {options.departments.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        {/* Semester */}
        <label className="flex flex-col gap-2 text-[13px] font-medium text-zinc-700">
          Semester

          <select
            aria-label="Semester"
            value={semester ?? ""}
            onChange={(event) => chooseSemester(event.target.value)}
            disabled={!department}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-[14px] font-normal text-zinc-900 outline-none focus:border-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            <option value="">Select semester</option>

            {options.semesters.map((value) => (
              <option key={value} value={value}>
                {value === 0
                  ? "Additional"
                  : `Semester ${SEM_ROMAN[value - 1] ?? value}`}
              </option>
            ))}
          </select>
        </label>

        {/* Section */}
        <label className="flex flex-col gap-2 text-[13px] font-medium text-zinc-700">
          Section

          <select
            aria-label="Section"
            value={section}
            onChange={(event) => setSection(event.target.value)}
            disabled={semester === null}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-[14px] font-normal text-zinc-900 outline-none focus:border-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            <option value="">Select section</option>

            {options.sections.map((value) => (
              <option key={value} value={value}>
                Section {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex justify-end border-t border-zinc-100 px-4 py-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!section || !department || semester === null}
          className="h-11 rounded-lg bg-zinc-900 px-5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}