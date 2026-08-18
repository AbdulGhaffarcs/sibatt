// frontend/components/timetable/DayView.tsx
// Weekly timetable for one section — day selector + class cards.

"use client"

import { useEffect, useMemo, useState } from "react"
import type { ClassEntry }           from "@/components/timetable/ClassCard"
import type { Section }              from "@/app/page"
import ClassCard                     from "@/components/timetable/ClassCard"
import DaySelector, { type Day }     from "@/components/timetable/DaySelector"
import { SEM_ROMAN, DAY_FULL }       from "@/lib/constants"

// Returns today's key, falling back to Mo on weekends
function todayKey(): Day {
  const keys: Day[] = ["Mo", "Tu", "We", "Th", "Fr"]
  return keys[new Date().getDay() - 1] ?? "Mo"
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

interface DayViewProps {
  section:         Section
  entries:         ClassEntry[]
  onChangeSection: () => void
}

export default function DayView({ section, entries, onChangeSection }: DayViewProps) {
  const [activeDay, setActiveDay] = useState<Day>(todayKey())
  const [now, setNow] = useState(() => new Date())

  // Re-evaluate the five-minute "Up next" window even while the page stays open.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const fullDay = DAY_FULL[activeDay]

  const dayEntries = useMemo(
    () =>
      entries
        .filter((e) => e.day === fullDay)
        .sort((a, b) => a.slot - b.slot),
    [entries, fullDay]
  )

  // Mark the next class only during the five minutes immediately before it
  // starts, and only when the user is viewing today's timetable.
  const isViewingToday = activeDay === todayKey()
  const nowMinutes = minutesSinceMidnight(now)
  const nextIdx = isViewingToday
    ? dayEntries.findIndex((entry) => {
        const startMinutes = timeToMinutes(entry.start_time)
        return nowMinutes >= startMinutes - 5 && nowMinutes < startMinutes
      })
    : -1

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">

      {/* section header */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] uppercase tracking-widest text-zinc-400 truncate">
            {section.program}
          </div>
          <div className="text-[18px] font-semibold leading-tight text-zinc-900 truncate">
            Sem {SEM_ROMAN[section.semester - 1] ?? section.semester} &mdash; Section {section.section}
          </div>
        </div>
        <button
          onClick={onChangeSection}
          className="flex-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100"
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
