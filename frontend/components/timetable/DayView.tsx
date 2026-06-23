// frontend/components/timetable/DayView.tsx
// Weekly timetable for one section — day selector + class cards.

"use client"

import { useState, useMemo } from "react"
import type { ClassEntry }           from "@/components/timetable/ClassCard"
import type { Section }              from "@/app/page"
import ClassCard                     from "@/components/timetable/ClassCard"
import DaySelector, { type Day }     from "@/components/timetable/DaySelector"

// DaySelector keys → DB day strings
const DAY_FULL: Record<Day, string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
}

// Returns today's key, falling back to Mo on weekends
function todayKey(): Day {
  const keys: Day[] = ["Mo", "Tu", "We", "Th", "Fr"]
  return keys[new Date().getDay() - 1] ?? "Mo"
}

const SEM_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]

interface DayViewProps {
  section:         Section
  entries:         ClassEntry[]
  onChangeSection: () => void
}

export default function DayView({ section, entries, onChangeSection }: DayViewProps) {
  const [activeDay, setActiveDay] = useState<Day>(todayKey())

  const fullDay = DAY_FULL[activeDay]

  const dayEntries = useMemo(
    () =>
      entries
        .filter((e) => e.day === fullDay)
        .sort((a, b) => a.slot - b.slot),
    [entries, fullDay]
  )

  // "Up next" — first class whose start_time is still in the future
  const hhmm    = new Date().toTimeString().slice(0, 5)
  const nextIdx = dayEntries.findIndex((e) => e.start_time > hhmm)

  return (
    <div className="flex flex-col w-full max-w-sm gap-4">

      {/* section header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
            {section.program}
          </div>
          <div className="text-[18px] font-semibold leading-tight text-zinc-900">
            Sem {SEM_ROMAN[section.semester - 1] ?? section.semester} &mdash; Section {section.section}
          </div>
        </div>
        <button
          onClick={onChangeSection}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100"
        >
          Change
        </button>
      </div>

      {/* day selector */}
      <DaySelector active={activeDay} onChange={setActiveDay} />

      {/* class cards */}
      {dayEntries.length === 0 ? (
        <div className="py-12 text-center text-[13px] text-zinc-400">
          No classes on {fullDay}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {dayEntries.map((entry, i) => (
            <ClassCard key={entry.id} entry={entry} isNext={i === nextIdx} />
          ))}
        </div>
      )}
    </div>
  )
}
