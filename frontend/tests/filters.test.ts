import { describe, expect, it } from "vitest"
import { getSectionFilterOptions } from "@/lib/filters"
import type { ClassEntry } from "@/components/timetable/ClassCard"

const entries: ClassEntry[] = [
  { id: 1, program: "BSCS", semester: 3, section: "B", course: "x", teacher_code: "x", teacher_name: "x", teacher_dept: "x", room: "x", building: "x", slot: 1, start_time: "09:00", end_time: "09:50", day: "Monday", is_online: false, term: "Fall-2026" },
  { id: 2, program: "BSCS", semester: 3, section: "A", course: "x", teacher_code: "x", teacher_name: "x", teacher_dept: "x", room: "x", building: "x", slot: 2, start_time: "09:50", end_time: "10:40", day: "Tuesday", is_online: false, term: "Fall-2026" },
  { id: 3, program: "BBA", semester: 1, section: "C", course: "x", teacher_code: "x", teacher_name: "x", teacher_dept: "x", room: "x", building: "x", slot: 1, start_time: "09:00", end_time: "09:50", day: "Monday", is_online: false, term: "Fall-2026" },
]

describe("getSectionFilterOptions", () => {
  it("returns deduplicated, sorted choices at each progressive step", () => {
    expect(getSectionFilterOptions(entries, { department: "", semester: null })).toEqual({
      departments: ["BBA", "BSCS"], semesters: [1, 3], sections: ["A", "B", "C"],
    })
    expect(getSectionFilterOptions(entries, { department: "BSCS", semester: null })).toEqual({
      departments: ["BBA", "BSCS"], semesters: [3], sections: ["A", "B"],
    })
    expect(getSectionFilterOptions(entries, { department: "BSCS", semester: 3 })).toEqual({
      departments: ["BBA", "BSCS"], semesters: [3], sections: ["A", "B"],
    })
  })
})
