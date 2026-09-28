"use client"

import { useState, useEffect } from "react"
import { facultyLogin, getTeachers, getTeacherTimetable } from "@/lib/faculty"

interface FacultyEntry {
  day: string
  slot: number
  start_time: string
  end_time: string
  course: string
  section: string
  room: string
}

interface TeacherData {
  teacher: string
  entries: FacultyEntry[]
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const DAY_SHORT: Record<string, string> = {
  Monday: "Mo",
  Tuesday: "Tu",
  Wednesday: "We",
  Thursday: "Th",
  Friday: "Fr",
}

const SLOT_TIMES: Record<number, string> = {
  1: "09:00",
  2: "09:50",
  3: "11:10",
  4: "12:10",
  5: "14:00",
  6: "14:50",
  7: "16:10",
  8: "17:00",
  9: "17:50",
  10: "18:40",
}

function formatTime(t: string) {
  if (!t) return ""
  const [h, m] = t.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`
}

export default function FacultyPage() {
  const [password, setPassword] = useState("")
  const [token, setToken] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState("")
  const [teachers, setTeachers] = useState<string[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState("")
  const [data, setData] = useState<TeacherData | null>(null)
  const [activeDay, setActiveDay] = useState("Monday")
  const [view, setView] = useState<"day" | "week">("day")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("faculty_token")
    if (saved) {
      setToken(saved)
      getTeachers().then(setTeachers).catch(() => {
        localStorage.removeItem("faculty_token")
        setToken(null)
      })
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const t = await facultyLogin(password)
      setToken(t)
      localStorage.setItem("faculty_token", t)
      setTeachers(await getTeachers())
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  async function loadTeacher(name: string) {
    if (!token) return
    setLoading(true)
    setError("")
    try {
      const result = await getTeacherTimetable(name)
      setData(result)
      setSelectedTeacher(name)
      setActiveDay("Monday")
      setView("day")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    setToken(null)
    setData(null)
    setSelectedTeacher("")
    localStorage.removeItem("faculty_token")
  }

  // ---------- Login ----------
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 px-4">
        <form
          onSubmit={handleLogin}
          className="bg-white w-full max-w-sm rounded-2xl shadow-sm border p-6"
        >
          <h1 className="text-xl font-semibold text-center mb-1">Faculty Portal</h1>
          <p className="text-center text-zinc-500 text-sm mb-6">
            Enter the shared faculty password
          </p>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
            required
          />


          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    )
  }

  // ---------- Data helpers ----------
  const dayEntries = (data?.entries || [])
    .filter((e) => e.day === activeDay)
    .sort((a, b) => a.slot - b.slot)

  const totalPeriods = data?.entries.length || 0
  const uniqueCourses = new Set(data?.entries.map((e) => e.course)).size || 0
  const uniqueSections = new Set(data?.entries.map((e) => e.section)).size || 0

  // For Week view: group by slot
  const weekBySlot: Record<number, Record<string, FacultyEntry | null>> = {}
  for (let s = 1; s <= 10; s++) {
    weekBySlot[s] = {}
    for (const day of DAYS) {
      weekBySlot[s][day] =
        data?.entries.find((e) => e.day === day && e.slot === s) || null
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-lg mx-auto px-3 py-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              {selectedTeacher || "Select Teacher"}
            </h1>
            {selectedTeacher && (
              <p className="text-xs text-zinc-500">
                {selectedTeacher.toLowerCase().replace(/\s+/g, "-")}
              </p>
            )}
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setSelectedTeacher("")
                setData(null)
              }}
              className="text-xs px-2.5 py-1 rounded-full border bg-white"
            >
              Change
            </button>
            <button
              onClick={logout}
              className="text-xs px-2.5 py-1 rounded-full border text-red-600 bg-white"
            >
              Logout
            </button>
        </div>
        </div>

        {!selectedTeacher && (
          <div className="bg-white rounded-xl border p-4 mb-4">
            <label className="block text-xs font-medium mb-1.5 text-zinc-600">
              Search your name
            </label>
            <input
              type="search"
              placeholder="Type part of your name"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
            />
            {teacherName.trim() && (
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {teachers
                  .filter((name) => name.toLowerCase().includes(teacherName.trim().toLowerCase()))
                  .map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => loadTeacher(name)}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 border-b last:border-0"
                    >
                      {name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {selectedTeacher && data && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "PERIODS", value: totalPeriods },
                { label: "CONTACT", value: "—" },
                { label: "COURSES", value: uniqueCourses },
                { label: "SECTIONS", value: uniqueSections },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-lg border py-2 text-center"
                >
                  <div className="text-base font-semibold">{stat.value}</div>
                  <div className="text-[10px] text-zinc-500 tracking-wide">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Day / Week Toggle */}
            <div className="flex bg-zinc-200/80 rounded-full p-0.5 mb-3 w-fit">
              <button
                onClick={() => setView("day")}
                className={`px-4 py-1 rounded-full text-xs font-medium ${
                  view === "day" ? "bg-zinc-900 text-white" : "text-zinc-600"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-4 py-1 rounded-full text-xs font-medium ${
                  view === "week" ? "bg-zinc-900 text-white" : "text-zinc-600"
                }`}
              >
                Week
              </button>
            </div>

            {/* ========== DAY VIEW ========== */}
            {view === "day" && (
              <>
                <div className="flex gap-1.5 mb-4 overflow-x-auto">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        activeDay === day
                          ? "bg-zinc-900 text-white"
                          : "bg-white border text-zinc-600"
                      }`}
                    >
                      {DAY_SHORT[day]}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {dayEntries.length === 0 ? (
                    <div className="text-center text-zinc-400 py-10 text-sm">
                      No classes on {activeDay}
                    </div>
                  ) : (
                    dayEntries.map((entry, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-xl border px-3 py-2.5 flex gap-3"
                      >
                        <div className="w-16 shrink-0 text-xs">
                          <div className="font-medium">
                            {formatTime(entry.start_time)}
                          </div>
                          <div className="text-zinc-400">
                            Ends {formatTime(entry.end_time)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {entry.section}
                          </div>
                          <div className="mt-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] bg-zinc-100 text-zinc-700">
                              {entry.course}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {entry.room.split(",").map((r) => (
                              <span
                                key={r}
                                className="inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-50 border text-zinc-600"
                              >
                                {r.trim()}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-[10px] text-zinc-400 shrink-0">
                          P{entry.slot}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ========== WEEK VIEW ========== */}
            {view === "week" && (
              <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50">
                      <th className="p-2 border-b text-left font-medium text-zinc-500 w-14">
                        Time
                      </th>
                      {DAYS.map((d) => (
                        <th
                          key={d}
                          className="p-2 border-b text-center font-medium text-zinc-600"
                        >
                          {DAY_SHORT[d]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(weekBySlot).map(([slot, days]) => {
                      const hasAny = Object.values(days).some(Boolean)
                      if (!hasAny) return null

                      return (
                        <tr key={slot} className="border-b last:border-0">
                          <td className="p-1.5 text-zinc-500 align-top">
                            {SLOT_TIMES[Number(slot)] || slot}
                          </td>
                          {DAYS.map((day) => {
                            const entry = days[day]
                            return (
                              <td key={day} className="p-1 align-top">
                                {entry ? (
                                  <div className="bg-zinc-50 rounded-lg p-1.5 border">
                                    <div className="font-medium text-[11px] leading-tight line-clamp-2">
                                      {entry.course}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                                      {entry.section}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-0.5">
                                      {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 mt-0.5">
                                      {entry.room}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-10" />
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="text-red-600 text-sm mt-3 text-center">{error}</p>
        )}
      </div>
    </div>
  )
}