import { describe, expect, it, beforeEach } from "vitest"
import { readSessionState, writeSessionState } from "@/lib/session"

describe("session cookie", () => {
  beforeEach(() => {
    document.cookie = "slotfinder-session=; max-age=0; path=/"
  })

  it("round-trips the last visited view and selections", () => {
    writeSessionState({
      view: "courses",
      section: {
        department: "MS Mathematics",
        semester: 2,
        section: "A",
      },
      timetableDay: "Th",
      courseName: "Calculus",
      courseDay: 3,
      roomName: "R-201",
      roomDay: 1,
    })

    expect(readSessionState()).toEqual({
      view: "courses",
      section: {
        department: "MS Mathematics",
        semester: 2,
        section: "A",
      },
      timetableDay: "Th",
      courseName: "Calculus",
      courseDay: 3,
      roomName: "R-201",
      roomDay: 1,
    })
  })
})