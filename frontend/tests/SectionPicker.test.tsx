import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import SectionPicker from "@/components/timetable/SectionPicker"
import type { ClassEntry } from "@/components/timetable/ClassCard"

const mockEntries: ClassEntry[] = [
  {
    id: 1, program: "BSCS", semester: 3, section: "A",
    course: "Data Structures", teacher_code: "AK", teacher_name: "Dr. Khan",
    teacher_dept: "CS", room: "R-305", building: "B-II",
    slot: 3, start_time: "11:10", end_time: "12:00",
    day: "Monday", is_online: false, term: "Fall-2025",
  },
  {
    id: 2, program: "BBA", semester: 1, section: "B",
    course: "Accounting", teacher_code: "SZ", teacher_name: "Dr. Zaidi",
    teacher_dept: "Business", room: "R-201", building: "B-I",
    slot: 1, start_time: "09:00", end_time: "09:50",
    day: "Tuesday", is_online: false, term: "Fall-2025",
  },
]

describe("SectionPicker", () => {
  it("renders sections grouped by program", () => {
    render(<SectionPicker entries={mockEntries} onSelect={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText("BSCS")).toBeInTheDocument()
    expect(screen.getByText("BBA")).toBeInTheDocument()
  })

  it("filters sections by query", () => {
    render(<SectionPicker entries={mockEntries} onSelect={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByPlaceholderText("BSCS, BBA, semester…")
    fireEvent.change(input, { target: { value: "BBA" } })
    expect(screen.getByText("BBA")).toBeInTheDocument()
    expect(screen.queryByText("BSCS")).not.toBeInTheDocument()
  })

  it("calls onSelect when a section is clicked", () => {
    const onSelect = vi.fn()
    render(<SectionPicker entries={mockEntries} onSelect={onSelect} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText("Section A"))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ program: "BSCS", semester: 3, section: "A" })
    )
  })

  it("shows empty state when no sections match", () => {
    render(<SectionPicker entries={mockEntries} onSelect={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByPlaceholderText("BSCS, BBA, semester…")
    fireEvent.change(input, { target: { value: "ZZZZZ" } })
    expect(screen.getByText("No sections found")).toBeInTheDocument()
  })

  it("calls onCancel when back button is clicked", () => {
    const onCancel = vi.fn()
    render(<SectionPicker entries={mockEntries} onSelect={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText("←"))
    expect(onCancel).toHaveBeenCalled()
  })
})
