// frontend/components/search/TeacherSearch.tsx
// Search teachers by name or code — tap to see their full week schedule.

"use client"

import { useState, useMemo }     from "react"
import type { ClassEntry }        from "@/components/timetable/ClassCard"
import ClassCard                  from "@/components/timetable/ClassCard"
import DayTabs                    from "@/components/ui/DayTabs"
import { DAY_FULL_KEYS }               from "@/lib/constants"

export interface Teacher {
  code:    string
  name:    string
  entries: ClassEntry[]
}

interface TeacherSearchProps {
  teachers: Teacher[]
}

export default function TeacherSearch({ teachers }: TeacherSearchProps) {
  const [query,    setQuery]    = useState("")
  const [selected, setSelected] = useState<Teacher | null>(null)
  const [dayIdx,   setDayIdx]   = useState(() => {
    const d = new Date().getDay() - 1 // 0=Mon … 4=Fri; -1/5 on weekends
    return d >= 0 && d <= 4 ? d : 0
  })

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return teachers
    return teachers.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
    )
  }, [teachers, query])

  // ── schedule detail view ──────────────────────────────────────────────────
  if (selected) {
    const dayEntries = selected.entries
      .filter((e) => e.day === DAY_FULL_KEYS[dayIdx])
      .sort((a, b) => a.slot - b.slot)

    return (
      <div className="flex flex-col w-full max-w-sm gap-4">

        {/* back + teacher name */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500"
          >
            ←
          </button>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
              {selected.code}
            </div>
            <div className="text-[17px] font-semibold text-zinc-900">
              {selected.name || selected.code}
            </div>
          </div>
        </div>

        {/* day tabs */}
        <DayTabs dayIdx={dayIdx} onChange={setDayIdx} />

        {dayEntries.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-zinc-400">
            No classes on {DAY_FULL_KEYS[dayIdx]}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {dayEntries.map((e) => (
              <ClassCard key={e.id} entry={e} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── search list ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full max-w-sm gap-4">
      <h2 className="text-[17px] font-semibold text-zinc-900">Teachers</h2>

      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <svg className="h-4 w-4 flex-none text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="7" cy="7" r="4"/><path d="M11 11l2.5 2.5"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or code…"
          aria-label="Search teachers by name or code"
          className="flex-1 bg-transparent text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400"
          autoFocus
        />
      </div>

      <div className="flex flex-col divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-zinc-400">
            No teachers found
          </div>
        ) : (
          filtered.map((t) => (
            <button
              key={t.code}
              onClick={() => setSelected(t)}
              className="flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
            >
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-zinc-100 font-mono text-[12px] font-semibold text-zinc-700">
                {t.code.slice(0, 2)}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-medium text-zinc-900">
                  {t.name || t.code}
                </span>
                <span className="text-[12px] text-zinc-400">
                  {t.entries.length} slot{t.entries.length !== 1 ? "s" : ""}
                </span>
              </div>
              <svg className="ml-auto h-4 w-4 flex-none text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 4l4 4-4 4"/>
              </svg>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
