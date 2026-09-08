import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import ClassCard from "@/components/timetable/ClassCard"
import type { ClassEntry } from "@/components/timetable/ClassCard"

const mockEntry: ClassEntry = {
  id: 1,
  course: "Data Structures",
  teacher_code: "AK",
  teacher_name: "Dr. Khan",
  teacher_dept: "CS",
  room: "R-305",
  building: "B-II",
  section: "A",
  program: "BSCS",
  semester: 3,
  term: "Fall-2025",
  slot: 3,
  start_time: "11:10",
  end_time: "12:00",
  day: "Monday",
  is_online: false,
}

describe("ClassCard", () => {
  it("renders course name", () => {
    render(<ClassCard entry={mockEntry} />)
    expect(screen.getByText("Data Structures")).toBeInTheDocument()
  })

  it("renders teacher code", () => {
    render(<ClassCard entry={mockEntry} />)
    expect(screen.getByText("AK")).toBeInTheDocument()
  })

  it("renders room code", () => {
    render(<ClassCard entry={mockEntry} />)
    expect(screen.getByText("R-305")).toBeInTheDocument()
  })

  it("renders time range", () => {
    render(<ClassCard entry={mockEntry} />)
    expect(screen.getByText("11:10 AM")).toBeInTheDocument()
    expect(screen.getByText("12:00 PM")).toBeInTheDocument()
  })

  it("renders slot number", () => {
    render(<ClassCard entry={mockEntry} />)
    expect(screen.getByText("P3")).toBeInTheDocument()
  })

  it("shows Up next badge when isNext is true", () => {
    render(<ClassCard entry={mockEntry} isNext={true} />)
    expect(screen.getByText("Up next")).toBeInTheDocument()
  })

  it("highlights the current class with a gold border and badge", () => {
    const { container } = render(<ClassCard entry={mockEntry} isCurrent={true} />)
    expect(screen.getByText("Current")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("border-amber-400")
  })

  it("does not show Up next badge when isNext is false", () => {
    render(<ClassCard entry={mockEntry} isNext={false} />)
    expect(screen.queryByText("Up next")).not.toBeInTheDocument()
  })

  it("shows Online badge for online classes", () => {
    const onlineEntry = { ...mockEntry, is_online: true, room: "" }
    render(<ClassCard entry={onlineEntry} />)
    expect(screen.getByText("Online")).toBeInTheDocument()
  })

  it("does not show room for online classes", () => {
    const onlineEntry = { ...mockEntry, is_online: true, room: "" }
    render(<ClassCard entry={onlineEntry} />)
    expect(screen.queryByText("R-305")).not.toBeInTheDocument()
  })
})
