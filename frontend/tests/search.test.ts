import { describe, it, expect } from "vitest"
import { buildTeacherIndex } from "@/lib/search"
import type { FullEntry } from "@/lib/db"

const mockEntries: FullEntry[] = [
  {
    id: 1,
    program: "BSCS",
    semester: 3,
    section: "A",
    course: "Data Structures",
    teacher_code: "AK",
    teacher_name: "Dr. Khan",
    room: "R-305",
    building: "B-II",
    slot: 3,
    start_time: "11:10",
    end_time: "12:00",
    day: "Monday",
    is_online: false,
    term: "Fall-2025",
  },
  {
    id: 2,
    program: "BSCS",
    semester: 3,
    section: "A",
    course: "Algorithms",
    teacher_code: "AK",
    teacher_name: "Dr. Khan",
    room: "R-306",
    building: "B-II",
    slot: 4,
    start_time: "12:10",
    end_time: "13:00",
    day: "Monday",
    is_online: false,
    term: "Fall-2025",
  },
  {
    id: 3,
    program: "BSCS",
    semester: 5,
    section: "B",
    course: "OS",
    teacher_code: "SZ",
    teacher_name: "Dr. Zaidi",
    room: "R-201",
    building: "B-I",
    slot: 1,
    start_time: "09:00",
    end_time: "09:50",
    day: "Tuesday",
    is_online: false,
    term: "Fall-2025",
  },
]

describe("buildTeacherIndex", () => {
  it("groups entries by teacher code", () => {
    const teachers = buildTeacherIndex(mockEntries)
    expect(teachers).toHaveLength(2)
  })

  it("creates correct teacher objects", () => {
    const teachers = buildTeacherIndex(mockEntries)
    const ak = teachers.find((t) => t.code === "AK")
    expect(ak).toBeDefined()
    expect(ak!.name).toBe("Dr. Khan")
    expect(ak!.entries).toHaveLength(2)
  })

  it("sorts teachers by code", () => {
    const teachers = buildTeacherIndex(mockEntries)
    expect(teachers[0].code).toBe("AK")
    expect(teachers[1].code).toBe("SZ")
  })

  it("returns empty array for empty input", () => {
    const teachers = buildTeacherIndex([])
    expect(teachers).toHaveLength(0)
  })
})
