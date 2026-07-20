import { describe, it, expect } from "vitest"
import { buildCourseIndex } from "@/lib/search"
import type { FullEntry } from "@/lib/db"

const mockEntries: FullEntry[] = [
  {
    id: 1, program: "BSCS", semester: 3, section: "A",
    course: "Data Structures", teacher_code: "AK", teacher_name: "Dr. Khan",
    teacher_dept: "CS", room: "R-305", building: "B-II",
    slot: 3, start_time: "11:10", end_time: "12:00",
    day: "Monday", is_online: false, term: "Fall-2025",
  },
  {
    id: 2, program: "BSCS", semester: 3, section: "A",
    course: "Data Structures", teacher_code: "AK", teacher_name: "Dr. Khan",
    teacher_dept: "CS", room: "R-306", building: "B-II",
    slot: 4, start_time: "12:10", end_time: "13:00",
    day: "Monday", is_online: false, term: "Fall-2025",
  },
  {
    id: 3, program: "BSCS", semester: 5, section: "B",
    course: "Operating Systems", teacher_code: "SZ", teacher_name: "Dr. Zaidi",
    teacher_dept: "CS", room: "R-201", building: "B-I",
    slot: 1, start_time: "09:00", end_time: "09:50",
    day: "Tuesday", is_online: false, term: "Fall-2025",
  },
]

describe("buildCourseIndex", () => {
  it("groups entries by course name", () => {
    const courses = buildCourseIndex(mockEntries)
    expect(courses).toHaveLength(2)
  })

  it("creates correct course objects", () => {
    const courses = buildCourseIndex(mockEntries)
    const ds = courses.find((c) => c.name === "Data Structures")
    expect(ds).toBeDefined()
    expect(ds!.entries).toHaveLength(2)
  })

  it("sorts courses alphabetically", () => {
    const courses = buildCourseIndex(mockEntries)
    expect(courses[0].name).toBe("Data Structures")
    expect(courses[1].name).toBe("Operating Systems")
  })

  it("returns empty array for empty input", () => {
    const courses = buildCourseIndex([])
    expect(courses).toHaveLength(0)
  })
})
