import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import DayView from "@/components/timetable/DayView"
import type { ClassEntry } from "@/components/timetable/ClassCard"
import type { Section } from "@/lib/filters"

const mockSection: Section = {
  department: "CS",
  semester: 3,
  section: "A",
}

const onChangeSection = vi.fn()

const mockEntries: ClassEntry[] = [
  {
    id: 1,
    program: "BS (CS)",
    semester: 3,
    section: "A",
    course: "Data Structures",
    teacher_code: "AK",
    teacher_name: "Dr. Khan",
    teacher_dept: "CS",
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
    program: "BS (CS)",
    semester: 3,
    section: "A",
    course: "Algorithms",
    teacher_code: "AK",
    teacher_name: "Dr. Khan",
    teacher_dept: "CS",
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
    program: "BS (CS)",
    semester: 3,
    section: "A",
    course: "OS",
    teacher_code: "SZ",
    teacher_name: "Dr. Zaidi",
    teacher_dept: "CS",
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

function renderDayView(entries = mockEntries) {
  return render(
    <DayView
      section={mockSection}
      entries={entries}
      onChangeSection={onChangeSection}
    />,
  )
}

describe("DayView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.setSystemTime(new Date("2025-09-15T08:00:00"))
  })

  it("renders the canonical department and semester", () => {
    renderDayView()

    expect(screen.getByText("CS")).toBeInTheDocument()
    expect(screen.getByText(/Sem III/)).toBeInTheDocument()
    expect(screen.getByText(/Section A/)).toBeInTheDocument()
  })

  it("renders class cards for the active day", () => {
    renderDayView([
      ...mockEntries,
      {
        ...mockEntries[0],
        id: 10,
        course: "Late Lab",
        slot: 10,
        start_time: "18:40",
        end_time: "20:00",
      },
    ])

    expect(screen.getByText("Data Structures")).toBeInTheDocument()
    expect(screen.getByText("Algorithms")).toBeInTheDocument()
    expect(screen.getByText("Late Lab")).toBeInTheDocument()
  })

  it("renders duplicate source rows only once", () => {
    renderDayView([
      mockEntries[0],
      {
        ...mockEntries[0],
        id: 99,
      },
    ])

    expect(screen.getAllByText("Data Structures")).toHaveLength(1)
  })

  it("does not show classes from other days", () => {
    renderDayView()

    expect(screen.queryByText("OS")).not.toBeInTheDocument()
  })

  it("renders both periods when a course appears in consecutive slots", () => {
    vi.setSystemTime(new Date("2025-09-19T08:00:00"))

    const fridayEntries: ClassEntry[] = [
      {
        ...mockEntries[0],
        id: 9,
        course: "Islamic Studies",
        day: "Friday",
        slot: 3,
        start_time: "11:10",
        end_time: "12:00",
      },
      {
        ...mockEntries[0],
        id: 12,
        course: "Islamic Studies",
        day: "Friday",
        slot: 4,
        start_time: "12:10",
        end_time: "13:00",
      },
    ]

    renderDayView(fridayEntries)

    expect(screen.getAllByText("Islamic Studies")).toHaveLength(2)
    expect(screen.getByText("11:10 AM")).toBeInTheDocument()
    expect(screen.getByText("12:10 PM")).toBeInTheDocument()
  })

  it("does not render empty timetable slots", () => {
    renderDayView([])

    expect(screen.queryByText("P10")).not.toBeInTheDocument()
  })

  it("marks a class as up next only during the five minutes before it starts", () => {
    vi.setSystemTime(new Date("2025-09-15T11:06:00"))

    renderDayView()

    expect(screen.getByText("Up next")).toBeInTheDocument()
  })

  it("marks the class in progress as current", () => {
    vi.setSystemTime(new Date("2025-09-15T11:30:00"))

    renderDayView()

    expect(screen.getByText("Current")).toBeInTheDocument()
  })

  it("does not mark an upcoming class too early", () => {
    vi.setSystemTime(new Date("2025-09-15T10:30:00"))

    renderDayView()

    expect(screen.queryByText("Up next")).not.toBeInTheDocument()
  })

  it("renders the Change action", () => {
    renderDayView()

    expect(
      screen.getByRole("button", { name: "Change" }),
    ).toBeInTheDocument()
  })

  it("calls onChangeSection when Change is clicked", () => {
    renderDayView()

    fireEvent.click(
      screen.getByRole("button", { name: "Change" }),
    )

    expect(onChangeSection).toHaveBeenCalledTimes(1)
  })
})