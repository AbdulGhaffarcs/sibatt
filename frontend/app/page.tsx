// Root page — SIBATT is a timetable-only application.

"use client"

import { useEffect, useState } from "react"
import { loadDB, getAllEntries } from "@/lib/db"
import DayView from "@/components/timetable/DayView"
import SectionPicker from "@/components/timetable/SectionPicker"
import CreatorsFooter from "@/components/ui/CreatorsFooter"
import FeedbackButton from "@/components/ui/FeedbackButton"
import type { ClassEntry } from "@/components/timetable/ClassCard"
import {
  normalizeDepartment,
  type Section,
} from "@/lib/filters"
import {
  readSessionState,
  writeSessionState,
} from "@/lib/session"
import type { Day } from "@/components/timetable/DaySelector"

export type { Section } from "@/lib/filters"

export default function Home() {
  const saved = readSessionState()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<ClassEntry[]>([])
  const [section, setSection] = useState<Section | null>(
    saved.section ?? null,
  )
  const [timetableDay, setTimetableDay] = useState<Day | null>(
    saved.timetableDay ?? null,
  )

  useEffect(() => {
    writeSessionState({
      view: "timetable",
      section,
      timetableDay,
      courseName: null,
      courseDay: 0,
      roomName: null,
      roomDay: 0,
    })
  }, [section, timetableDay])

  useEffect(() => {
    async function init() {
      try {
        await loadDB("/timetable.db")

        const rawEntries = getAllEntries()
        setEntries(rawEntries)
      } catch (e) {
        setError("Could not load timetable data. Try refreshing.")
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const sectionEntries: ClassEntry[] = section
    ? entries.filter(
        (entry) =>
          normalizeDepartment(entry.program) === section.department &&
          entry.semester === section.semester &&
          entry.section === section.section,
      )
    : []

  if (loading) {
    return (
      <>
        <main className="flex min-h-screen flex-col bg-zinc-50 px-4 pb-20">
          <div className="flex flex-1 items-center justify-center">
            <span className="text-sm text-zinc-500">
              Loading timetable…
            </span>
          </div>
        </main>

        <CreatorsFooter />
        <FeedbackButton />
      </>
    )
  }

  if (error) {
    return (
      <>
        <main className="flex min-h-screen flex-col bg-zinc-50 px-4 pb-20">
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </main>

        <CreatorsFooter />
        <FeedbackButton />
      </>
    )
  }

  return (
    <>
      <main className="flex min-h-screen flex-col bg-zinc-50 px-4 pb-20">
        <div className="flex w-full flex-1 flex-col items-center pt-8 sm:px-2 sm:pt-10">
          <div className="flex w-full max-w-3xl flex-col items-center gap-6">
            {section ? (
              <DayView
                section={section}
                entries={sectionEntries}
                onChangeSection={() => setSection(null)}
                activeDay={timetableDay ?? undefined}
                onChangeDay={setTimetableDay}
              />
            ) : (
              <SectionPicker
                entries={entries}
                onSelect={setSection}
              />
            )}
          </div>
        </div>
      </main>

      <CreatorsFooter />
      <FeedbackButton />
    </>
  )
}