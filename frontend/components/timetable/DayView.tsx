// frontend/components/timetable/DayView.tsx
// Weekly timetable for one selected department/semester/section.

"use client"

import { useEffect, useMemo, useState } from "react"
import type { ClassEntry } from "@/components/timetable/ClassCard"
import type { Section } from "@/lib/filters"
import ClassCard from "@/components/timetable/ClassCard"
import DaySelector, { type Day } from "@/components/timetable/DaySelector"
import {
  ACTIVE_TERM,
  DAY_FULL,
  SEM_ROMAN,
} from "@/lib/constants"

function todayKey(): Day | null {
  const keys: Array<Day | null> = [null, "Mo", "Tu", "We", "Th", "Fr", null]
  return keys[new Date().getDay()]
}

function initialDay(): Day {
  return todayKey() ?? "Mo"
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function deduplicateEntries<T extends ClassEntry>(
  entries: T[],
): T[] {
  const seen = new Set<string>()

  return entries.filter((entry) => {
    const key = [
      entry.day,
      entry.slot,
      entry.start_time,
      entry.end_time,
      entry.course,
      entry.teacher_code,
      entry.teacher_name,
      entry.teacher_dept,
      entry.room,
      entry.building,
      entry.section,
      entry.semester,
      entry.term,
      entry.is_online,
    ].join("\u001f")

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function canMergeEntries(
  a: ClassEntry,
  b: ClassEntry,
): boolean {
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

function mergeConsecutiveEntries(
  entries: ClassEntry[],
): ClassEntry[] {
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
  onChangeSection: () => void
  activeDay?: Day
  onChangeDay?: (day: Day) => void
}

export default function DayView({
  section,
  entries,
  onChangeSection,
  activeDay: controlledDay,
  onChangeDay,
}: DayViewProps) {
  const [localDay, setLocalDay] = useState<Day>(initialDay())

  const activeDay = controlledDay ?? localDay
  const setActiveDay = onChangeDay ?? setLocalDay

  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 30_000)

    return () => window.clearInterval(timer)
  }, [])

  const fullDay = DAY_FULL[activeDay]

  const dayEntries = useMemo(
    () =>
      deduplicateEntries(
        entries
          .filter((entry) => entry.day === fullDay)
          .sort((a, b) => a.slot - b.slot),
      ),
    [entries, fullDay],
  )

  const displayEntries = useMemo(
    () => mergeConsecutiveEntries(dayEntries),
    [dayEntries],
  )

  const currentDay = todayKey()
  const isViewingToday = currentDay !== null && activeDay === currentDay
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

        return (
          nowMinutes >= startMinutes &&
          nowMinutes < endMinutes
        )
      })
    : -1

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-mono text-[11px] uppercase tracking-widest text-zinc-400">
            {section.department}
          </div>

          <div className="text-[11px] text-zinc-500">
            {ACTIVE_TERM}
          </div>

          <div className="truncate text-[18px] font-semibold leading-tight text-zinc-900">
            {section.semester === 0
              ? "Additional"
              : `Sem ${
                  SEM_ROMAN[section.semester - 1] ??
                  section.semester
                }`}
            {" "}— Section {section.section}
          </div>
        </div>

        <button
          type="button"
          onClick={onChangeSection}
          className="flex-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] text-zinc-600 transition-colors hover:bg-zinc-100"
        >
          Change
        </button>
      </div>

      <DaySelector
        active={activeDay}
        onChange={setActiveDay}
      />

      <div className="flex flex-col gap-2">
        {displayEntries.map((entry, index) => (
          <ClassCard
            key={`${entry.id}-${entry.slot}`}
            entry={entry}
            isCurrent={index === currentIdx}
            isNext={index === nextIdx}
          />
        ))}
      </div>
    </div>
  )
}