// frontend/components/timetable/DayView.tsx
// Weekly timetable for one section — day selector + class cards.

"use client"

import { useEffect, useMemo, useState } from "react"
import type { ClassEntry } from "@/components/timetable/ClassCard"
import type { Section } from "@/app/page"
import ClassCard from "@/components/timetable/ClassCard"
import DaySelector, { type Day } from "@/components/timetable/DaySelector"
import { SEM_ROMAN, DAY_FULL } from "@/lib/constants"

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

function canMergeEntries(a: ClassEntry, b: ClassEntry): boolean {
  return (
    a.day === b.day &&
    a.slot + 1 === b.slot &&
    a.end_time === b.start_time &&
    a.course === b.course &&
    a.teacher_code === b.teacher_code &&
    a.teacher_name === b.teacher_name &&
    a.teacher_dept === b.teacher_dept &&
    a.room === b.room &&
    a.building === b.building &&
    a.section === b.section &&
    a.program === b.program &&
    a.semester === b.semester &&
    a.term === b.term &&
    a.is_online === b.is_online
  )
}

function mergeConsecutiveEntries(entries: ClassEntry[]): ClassEntry[] {
  if (entries.length <= 1) {
    return entries
  }

  const merged: ClassEntry[] = []

  for (const entry of entries) {
    const previous = merged[merged.length - 1]

    if (previous && canMergeEntries(previous, entry)) {
      merged[merged.length - 1] = {
        ...previous,
        end_slot: entry.slot,
        end_time: entry.end_time,
      }
    } else {
      merged.push({
        ...entry,
        end_slot: entry.end_slot ?? entry.slot,
      })
    }
  }

  return merged
}

interface DayViewProps {
  section: Section
  entries: ClassEntry[]
}

export default function DayView({
  section,
  entries,
}: DayViewProps) {
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
        .filter((entry) => entry.day === fullDay)
        .sort((a, b) => a.slot - b.slot),
    [entries, fullDay]
  )

  // Merge the same class when consecutive slots are genuinely continuous.
  // For example:
  //   P1 09:00-09:50
  //   P2 09:50-10:40
  // becomes:
  //   P1-P2 09:00-10:40
  //
  // A real break prevents merging:
  //   P2 ends 10:40
  //   P3 starts 11:10
  const displayEntries = useMemo(
    () => mergeConsecutiveEntries(dayEntries),
    [dayEntries]
  )

  // Mark the next class only during the five minutes immediately before it
  // starts, and only when the user is viewing today's timetable.
  const isViewingToday = activeDay === todayKey()
  const nowMinutes = minutesSinceMidnight(now)

  const nextIdx = isViewingToday
    ? displayEntries.findIndex((entry) => {
        const startMinutes = timeToMinutes(entry.start_time)
        return (
          nowMinutes >= startMinutes - 5 &&
          nowMinutes < startMinutes
        )
      })
    : -1

  const currentIdx = isViewingToday
    ? displayEntries.findIndex((entry) => {
        const startMinutes = timeToMinutes(entry.start_time)
        const endMinutes = timeToMinutes(entry.end_time)
        return nowMinutes >= startMinutes && nowMinutes < endMinutes
      })
    : -1

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      {/* section header */}
      <div className="min-w-0">
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[11px] uppercase tracking-widest text-zinc-400">
            {section.program}
          </div>

          <div className="truncate text-[18px] font-semibold leading-tight text-zinc-900">
            Sem {SEM_ROMAN[section.semester - 1] ?? section.semester} &mdash;
            Section {section.section}
          </div>
        </div>
      </div>

      {/* day selector */}
      <DaySelector active={activeDay} onChange={setActiveDay} />

      {/* class cards */}
      {displayEntries.length === 0 ? (
        <div className="py-12 text-center text-[13px] text-zinc-400">
          No classes on {fullDay}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayEntries.map((entry, i) => (
            <ClassCard
              key={`${entry.id}-${entry.slot}`}
              entry={entry}
              isCurrent={i === currentIdx}
              isNext={i === nextIdx}
            />
          ))}
        </div>
      )}
    </div>
  )
}
