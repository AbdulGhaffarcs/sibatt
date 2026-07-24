// frontend/app/page.tsx
// Root page — loads the SQLite bundle once, manages view state.
// All search is client-side against the loaded data.

"use client"

import { useEffect, useState } from "react"
import { loadDB, getAllEntries, getAllRooms } from "@/lib/db"
import { buildCourseIndex }                                  from "@/lib/search"
import DayView                                               from "@/components/timetable/DayView"
import CourseSearch                                          from "@/components/search/CourseSearch"
import RoomSearch                                            from "@/components/search/RoomSearch"
import SectionPicker                                         from "@/components/timetable/SectionPicker"
import BottomNav                                             from "@/components/ui/BottomNav"
import type { ClassEntry }                                   from "@/components/timetable/ClassCard"
import type { Course }                                       from "@/components/search/CourseSearch"

// Bump this whenever the generated SQLite bundle changes.  The query string
// prevents an installed service worker from serving an older timetable.
const TIMETABLE_DB_VERSION = "2025-fall-6"

// ── view states ──────────────────────────────────────────────────────────────
type View = "timetable" | "courses" | "rooms"

// ── section shape ────────────────────────────────────────────────────────────
export interface Section {
  program:  string
  semester: number
  section:  string
}

export default function Home() {
  // ── db state ───────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [entries,  setEntries]  = useState<ClassEntry[]>([])
  const [courses,  setCourses]  = useState<Course[]>([])
  const [rooms,    setRooms]    = useState<string[]>([])

  // ── ui state ───────────────────────────────────────────────────────────────
  const [view,           setView]           = useState<View>("timetable")
  const [section,        setSection]        = useState<Section | null>(null)
  const [pickingSection, setPickingSection] = useState(false)

  // ── load SQLite bundle on mount ────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        await loadDB(`/timetable.db?v=${TIMETABLE_DB_VERSION}`)
        const rawEntries = getAllEntries()
        setEntries(rawEntries)
        setCourses(buildCourseIndex(rawEntries))
        setRooms(getAllRooms())
      } catch (e) {
        setError("Could not load timetable data. Try refreshing.")
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // ── filter entries to selected section ────────────────────────────────────
  const sectionEntries: ClassEntry[] = section
    ? entries.filter(
        (e) =>
          e.program  === section.program  &&
          e.semester === section.semester &&
          e.section  === section.section
      )
    : []

  // ── loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
          <span className="text-sm text-zinc-500">Loading timetable…</span>
        </div>
      </main>
    )
  }

  // ── error screen ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center max-w-sm">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  // ── section picker overlay ─────────────────────────────────────────────────
  if (pickingSection) {
    return (
      <main className="flex min-h-screen items-start justify-center px-4 pt-6">
        <SectionPicker
          entries={entries}
          onSelect={(s) => {
            setSection(s)
            setPickingSection(false)
          }}
          onCancel={() => setPickingSection(false)}
        />
      </main>
    )
  }

  // ── main views ─────────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col items-center px-4 pt-6 pb-20">

      {/* timetable view */}
      {view === "timetable" && (
        section ? (
          <DayView
            section={section}
            entries={sectionEntries}
            onChangeSection={() => setPickingSection(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 mt-16 max-w-sm text-center">
            <div className="text-4xl">📅</div>
            <h1 className="text-xl font-semibold text-zinc-900">
              Find your timetable
            </h1>
            <p className="text-sm text-zinc-500">
              Pick your program, semester and section to get started.
            </p>
            <button
              onClick={() => setPickingSection(true)}
              className="mt-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white"
            >
              Select section
            </button>
          </div>
        )
      )}

      {/* course search view */}
      {view === "courses" && (
        <CourseSearch courses={courses} />
      )}

      {/* room search view */}
      {view === "rooms" && (
        <RoomSearch entries={entries} rooms={rooms} />
      )}

      {/* bottom nav */}
      <BottomNav active={view} onChange={setView} />
    </main>
  )
}
