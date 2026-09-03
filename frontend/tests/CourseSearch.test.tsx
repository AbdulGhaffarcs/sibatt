import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import CourseSearch from "@/components/search/CourseSearch"
import type { Course } from "@/components/search/CourseSearch"
import type { ClassEntry } from "@/components/timetable/ClassCard"

const baseEntry: ClassEntry = {
  id: 1, program: "BSCS", semester: 3, section: "A",
  course: "Data Structures", teacher_code: "AK", teacher_name: "Dr. Khan",
  teacher_dept: "CS", room: "R-305", building: "B-II",
  slot: 3, start_time: "11:10", end_time: "12:00",
  day: "Monday", is_online: false, term: "Fall-2025",
}

const mockCourses: Course[] = [
  { name: "Data Structures", entries: [baseEntry] },
  { name: "Algorithms", entries: [{ ...baseEntry, id: 2, course: "Algorithms" }] },
  { name: "Calculus", entries: [{ ...baseEntry, id: 3, course: "Calculus" }] },
]

describe("CourseSearch", () => {
  it("renders all courses", () => {
    render(<CourseSearch courses={mockCourses} />)
    expect(screen.getByText("Data Structures")).toBeInTheDocument()
    expect(screen.getByText("Algorithms")).toBeInTheDocument()
    expect(screen.getByText("Calculus")).toBeInTheDocument()
  })

  it("filters by course name", () => {
    render(<CourseSearch courses={mockCourses} />)
    const input = screen.getByPlaceholderText("Course name…")
    fireEvent.change(input, { target: { value: "Algo" } })
    expect(screen.getByText("Algorithms")).toBeInTheDocument()
    expect(screen.queryByText("Data Structures")).not.toBeInTheDocument()
  })

  it("shows empty state when no courses match", () => {
    render(<CourseSearch courses={mockCourses} />)
    const input = screen.getByPlaceholderText("Course name…")
    fireEvent.change(input, { target: { value: "ZZZZ" } })
    expect(screen.getByText("No courses found")).toBeInTheDocument()
  })

  it("navigates to detail view on course click", () => {
    render(<CourseSearch courses={mockCourses} />)
    fireEvent.click(screen.getByText("Algorithms"))
    expect(screen.getByText("←")).toBeInTheDocument()
    expect(screen.getByText("Algorithms")).toBeInTheDocument()
  })

  it("shows entry count per course", () => {
    render(<CourseSearch courses={mockCourses} />)
    expect(screen.getAllByText(/1 slot/)).toHaveLength(3)
  })
})
