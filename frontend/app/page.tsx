// frontend/app/page.tsx
// Root page — loads the SQLite bundle once and manages application view state.

"use client"

import { useEffect, useState } from "react"
import { loadDB, getAllEntries, getAllRooms } from "@/lib/db"
import { buildCourseIndex } from "@/lib/search"
import DayView from "@/components/timetable/DayView"
import CourseSearch from "@/components/search/CourseSearch"
import RoomSearch from "@/components/search/RoomSearch"
import SectionPicker from "@/components/timetable/SectionPicker"
import BottomNav from "@/components/ui/BottomNav"
import CreatorsFooter from "@/components/ui/CreatorsFooter"
import FeedbackButton from "@/components/ui/FeedbackButton"
import type { ClassEntry } from "@/components/timetable/ClassCard"
import type { Course } from "@/components/search/CourseSearch"
import {
  normalizeDepartment,
  type Section,
} from "@/lib/filters"
import {
  readSessionState,
  writeSessionState,
  type SessionView,
} from "@/lib/session"
import type { Day } from "@/components/timetable/DaySelector"

type View = SessionView

export type { Section } from "@/lib/filters"

export default function Home() {
  const saved = readSessionState()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [entries, setEntries] = useState<ClassEntry[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [rooms, setRooms] = useState<string[]>([])

  const [view, setView] = useState<View>(saved.view ?? "timetable")
  const [section, setSection] = useState<Section | null>(saved.section ?? null)
  const [timetableDay, setTimetableDay] = useState<Day | null>(saved.timetableDay ?? null)
  const [courseName, setCourseName] = useState<string | null>(saved.courseName ?? null)
  const [courseDay, setCourseDay] = useState(saved.courseDay ?? 0)
  const [roomName, setRoomName] = useState<string | null>(saved.roomName ?? null)
  const [roomDay, setRoomDay] = useState(saved.roomDay ?? 0)

  useEffect(() => {
    writeSessionState({
      view,
      section,
      timetableDay,
      courseName,
      courseDay,
      roomName,
      roomDay,
    })
  }, [view, section, timetableDay, courseName, courseDay, roomName, roomDay])

  useEffect(() => {
    async function init() {
      try {
        await loadDB("/timetable.db")

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

  /*
   * A canonical department can represent multiple raw program values.
   *
   * Example:
   *
   * BS
   * BS (CS)
   * BS (AI)
   * BS (CS-AI)
   * BS (SE)
   *
   * all resolve to:
   *
   * CS
   */
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
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />

          <span className="text-sm text-zinc-500">
            Loading timetable…
          </span>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">
            {error}
          </p>

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

  return (
    <main className="flex min-h-screen flex-col items-center px-3 pt-4 pb-28 sm:px-6 sm:pt-6">
      {view === "timetable" &&
        (section ? (
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
        ))}

      {view === "courses" && (
        <CourseSearch
          courses={courses}
          selectedCourseName={courseName}
          onSelectCourse={setCourseName}
          dayIdx={courseDay}
          onChangeDay={setCourseDay}
        />
      )}

      {view === "rooms" && (
        <RoomSearch
          entries={entries}
          rooms={rooms}
          selectedRoomName={roomName}
          onSelectRoom={setRoomName}
          dayIdx={roomDay}
          onChangeDay={setRoomDay}
        />
      )}

      <BottomNav
        active={view}
        onChange={setView}
      />

      <CreatorsFooter />
      <FeedbackButton />
    </main>
  )
}