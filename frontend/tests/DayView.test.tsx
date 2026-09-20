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
    render(<DayView section={mockSection} entries={mockEntries} />)
    expect(screen.getByText(/BSCS/)).toBeInTheDocument()
    expect(screen.getByText(/Sem III/)).toBeInTheDocument()
  })

  it("renders class cards for the active day (Monday)", () => {
    render(
      <DayView
        section={mockSection}
        entries={[
          ...mockEntries,
          { ...mockEntries[0], id: 10, course: "Late Lab", slot: 10, start_time: "18:40", end_time: "20:00" },
        ]}
      />,
    )
    expect(screen.getByText("Data Structures")).toBeInTheDocument()
    expect(screen.getByText("Algorithms")).toBeInTheDocument()
    expect(screen.getByText("Late Lab")).toBeInTheDocument()
  })

  it("renders duplicate source rows only once", () => {
    render(
      <DayView
        section={mockSection}
        entries={[mockEntries[0], { ...mockEntries[0], id: 99, program: "BS (CS-AI)" }]}
      />,
    )
    expect(screen.getAllByText("Data Structures")).toHaveLength(1)
  })

  it("does not show classes from other days", () => {
    render(<DayView section={mockSection} entries={mockEntries} />)
    expect(screen.queryByText("OS")).not.toBeInTheDocument()
  })

  it("renders both consecutive periods when the same course occupies two slots", () => {
    const fridayEntries: ClassEntry[] = [
      { ...mockEntries[0], id: 9, course: "Islamic Studies", day: "Friday", slot: 3, start_time: "11:10", end_time: "12:00" },
      { ...mockEntries[0], id: 12, course: "Islamic Studies", day: "Friday", slot: 4, start_time: "12:10", end_time: "13:00" },
    ]
    vi.setSystemTime(new Date("2025-09-19T08:00:00")) // Friday
    render(<DayView section={mockSection} entries={fridayEntries} />)
    expect(screen.getAllByText("Islamic Studies")).toHaveLength(2)
    expect(screen.getByText("11:10 AM")).toBeInTheDocument()
    expect(screen.getByText("12:10 PM")).toBeInTheDocument()
  })

  it("does not render empty timetable slots", () => {
    const wedEntries = mockEntries.filter((e) => e.day === "Friday")
    render(<DayView section={mockSection} entries={wedEntries} />)
    expect(screen.queryByText("P10")).not.toBeInTheDocument()
  })

  it("marks a class as up next only during the five minutes before it starts", () => {
    vi.setSystemTime(new Date("2025-09-15T11:06:00"))
    render(<DayView section={mockSection} entries={mockEntries} />)
    expect(screen.getByText("Up next")).toBeInTheDocument()
  })

  it("marks the class in progress as current", () => {
    vi.setSystemTime(new Date("2025-09-15T11:30:00"))
    render(<DayView section={mockSection} entries={mockEntries} />)
    expect(screen.getByText("Current")).toBeInTheDocument()
  })

  it("does not mark an upcoming class too early", () => {
    vi.setSystemTime(new Date("2025-09-15T10:30:00"))
    render(<DayView section={mockSection} entries={mockEntries} />)
    expect(screen.queryByText("Up next")).not.toBeInTheDocument()
  })

  it("does not render a redundant Change action", () => {
    render(<DayView section={mockSection} entries={mockEntries} />)
    expect(screen.queryByText("Change")).not.toBeInTheDocument()
  })
})
