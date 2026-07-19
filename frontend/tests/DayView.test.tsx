import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import DayView from "@/components/timetable/DayView"
import type { ClassEntry } from "@/components/timetable/ClassCard"
import type { Section } from "@/app/page"

const mockSection: Section = { program: "BSCS", semester: 3, section: "A" }

const mockEntries: ClassEntry[] = [
  {
    id: 1, program: "BSCS", semester: 3, section: "A",
    course: "Data Structures", teacher_code: "AK", teacher_name: "Dr. Khan",
    teacher_dept: "CS", room: "R-305", building: "B-II",
    slot: 3, start_time: "11:10", end_time: "12:00",
    day: "Monday", is_online: false, term: "Fall-2025",
  },
  {
    id: 2, program: "BSCS", semester: 3, section: "A",
    course: "Algorithms", teacher_code: "AK", teacher_name: "Dr. Khan",
    teacher_dept: "CS", room: "R-306", building: "B-II",
    slot: 4, start_time: "12:10", end_time: "13:00",
    day: "Monday", is_online: false, term: "Fall-2025",
  },
  {
    id: 3, program: "BSCS", semester: 3, section: "A",
    course: "OS", teacher_code: "SZ", teacher_name: "Dr. Zaidi",
    teacher_dept: "CS", room: "R-201", building: "B-I",
    slot: 1, start_time: "09:00", end_time: "09:50",
    day: "Tuesday", is_online: false, term: "Fall-2025",
  },
]

describe("DayView", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2025-09-15T08:00:00")) // Monday
  })

  it("renders section header with program and semester", () => {
    render(<DayView section={mockSection} entries={mockEntries} onChangeSection={vi.fn()} />)
    expect(screen.getByText(/BSCS/)).toBeInTheDocument()
    expect(screen.getByText(/Sem III/)).toBeInTheDocument()
  })

  it("renders class cards for the active day (Monday)", () => {
    render(<DayView section={mockSection} entries={mockEntries} onChangeSection={vi.fn()} />)
    expect(screen.getByText("Data Structures")).toBeInTheDocument()
    expect(screen.getByText("Algorithms")).toBeInTheDocument()
  })

  it("does not show classes from other days", () => {
    render(<DayView section={mockSection} entries={mockEntries} onChangeSection={vi.fn()} />)
    expect(screen.queryByText("OS")).not.toBeInTheDocument()
  })

  it("shows empty state when no classes on the selected day", () => {
    const wedEntries = mockEntries.filter((e) => e.day === "Friday")
    render(<DayView section={mockSection} entries={wedEntries} onChangeSection={vi.fn()} />)
    expect(screen.getByText(/No classes/)).toBeInTheDocument()
  })

  it("calls onChangeSection when Change button is clicked", () => {
    const onChange = vi.fn()
    render(<DayView section={mockSection} entries={mockEntries} onChangeSection={onChange} />)
    screen.getByText("Change").click()
    expect(onChange).toHaveBeenCalled()
  })
})
