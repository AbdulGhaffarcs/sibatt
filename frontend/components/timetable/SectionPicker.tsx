// frontend/components/timetable/SectionPicker.tsx
// Groups all sections from entries data and lets student pick one.

"use client"

import { useMemo, useState } from "react"
import type { ClassEntry }   from "@/components/timetable/ClassCard"
import type { Section }      from "@/app/page"
import { SEM_ROMAN }         from "@/lib/constants"

interface SectionPickerProps {
  entries:  ClassEntry[]
  onSelect: (s: Section) => void
  onCancel: () => void
}

export default function SectionPicker({
  entries,
  onSelect,
  onCancel,
}: SectionPickerProps) {
  const [query, setQuery] = useState("")

  // ── build unique section list from entries ────────────────────────────────
  const sections: Section[] = useMemo(() => {
    const seen = new Set<string>()
    const list: Section[] = []

    entries.forEach((e) => {
      const program  = e.program
      const semester = e.semester
      const section  = e.section

      if (!program || !semester || !section) return

      const key = `${program}-${semester}-${section}`
      if (seen.has(key)) return
      seen.add(key)
      list.push({ program, semester, section })
    })

    // sort: program → semester → section
    return list.sort((a, b) => {
      if (a.program  !== b.program)  return a.program.localeCompare(b.program)
      if (a.semester !== b.semester) return a.semester - b.semester
      return a.section.localeCompare(b.section)
    })
  }, [entries])

  // ── filter by query ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return sections
    return sections.filter(
      (s) =>
        s.program.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q) ||
        String(s.semester).includes(q)
    )
  }, [sections, query])

  // ── group by program ──────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, Section[]> = {}
    filtered.forEach((s) => {
      ;(map[s.program] = map[s.program] ?? []).push(s)
    })
    return Object.entries(map)
  }, [filtered])

  return (
    <div className="flex flex-col w-full max-w-sm rounded-2xl border border-zinc-200 bg-white overflow-hidden">

      {/* header */}
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <button
          onClick={onCancel}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 text-sm"
        >
          ←
        </button>
        <span className="text-[15px] font-medium text-zinc-900">
          Select section
        </span>
      </div>

      {/* search */}
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <svg className="h-4 w-4 flex-none text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4"/><path d="M11 11l2.5 2.5"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BSCS, BBA, semester…"
            aria-label="Search sections by program, semester, or section"
            className="flex-1 bg-transparent text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400"
            autoFocus
          />
        </div>
      </div>

      {/* list */}
      <div className="max-h-[60vh] overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-zinc-400">
            No sections found
          </div>
        ) : (
          grouped.map(([program, secs], gi) => (
            <div key={program}>
              {gi > 0 && <div className="mx-4 h-px bg-zinc-100" />}
              <div className="px-4 pt-4 pb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {program}
              </div>
              {secs.map((s, i) => (
                <div key={`${program}-${s.semester}-${s.section}`}>
                  <button
                    onClick={() => onSelect(s)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-zinc-100 font-mono text-[11px] font-medium text-zinc-700">
                        {s.section.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-zinc-900 truncate">
                          {program} — Semester {SEM_ROMAN[(s.semester - 1)] ?? s.semester}
                        </div>
                        <div className="text-[12px] text-zinc-500 truncate">
                          Section {s.section}
                        </div>
                      </div>
                    </div>
                    <svg className="h-4 w-4 flex-none text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M6 4l4 4-4 4"/>
                    </svg>
                  </button>
                  {i < secs.length - 1 && (
                    <div className="mx-4 h-px bg-zinc-100" />
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
