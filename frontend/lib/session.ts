import type { Day } from "@/components/timetable/DaySelector"
import type { Section } from "@/lib/filters"

export type SessionView = "timetable" | "courses" | "rooms"

export interface SessionState {
  view: SessionView
  section: Section | null
  timetableDay: Day | null
  courseName: string | null
  courseDay: number
  roomName: string | null
  roomDay: number
}

const COOKIE_NAME = "slotfinder-session"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function readSessionState(): Partial<SessionState> {
  if (typeof document === "undefined") return {}

  const cookie = document.cookie
    .split("; ")
    .find((value) => value.startsWith(`${COOKIE_NAME}=`))

  if (!cookie) return {}

  try {
    return JSON.parse(decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1)))
  } catch {
    return {}
  }
}

export function writeSessionState(state: SessionState): void {
  if (typeof document === "undefined") return

  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(state))}; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`
}