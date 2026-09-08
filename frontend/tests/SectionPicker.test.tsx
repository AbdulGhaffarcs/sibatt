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
  it("shows all departments and waits for a department before enabling semester", () => {
    render(<SectionPicker entries={mockEntries} onSelect={vi.fn()} />)
    expect(screen.getByRole("option", { name: "BSCS" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "BBA" })).toBeInTheDocument()
    expect(screen.getByLabelText("Semester")).toBeDisabled()
  })

  it("progressively filters semester and section choices", () => {
    render(<SectionPicker entries={mockEntries} onSelect={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "BSCS" } })
    expect(screen.getByRole("option", { name: "Semester III" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Semester I" })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Semester"), { target: { value: "3" } })
    expect(screen.getByRole("option", { name: "Section A" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Section B" })).not.toBeInTheDocument()
  })

  it("calls onSelect after all three filter values are selected", () => {
    const onSelect = vi.fn()
    render(<SectionPicker entries={mockEntries} onSelect={onSelect} />)
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "BSCS" } })
    fireEvent.change(screen.getByLabelText("Semester"), { target: { value: "3" } })
    fireEvent.change(screen.getByLabelText("Section"), { target: { value: "A" } })
    fireEvent.click(screen.getByRole("button", { name: "View timetable" }))
    expect(onSelect).toHaveBeenCalledWith({ program: "BSCS", semester: 3, section: "A" })
  })

  it("resets dependent choices after the department changes", () => {
    render(<SectionPicker entries={mockEntries} onSelect={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "BSCS" } })
    fireEvent.change(screen.getByLabelText("Semester"), { target: { value: "3" } })
    fireEvent.change(screen.getByLabelText("Section"), { target: { value: "A" } })
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "BBA" } })
    expect(screen.getByLabelText("Semester")).toHaveValue("")
    expect(screen.getByLabelText("Section")).toHaveValue("")
  })

  it("does not render a back action when it is the default page control", () => {
    render(<SectionPicker entries={mockEntries} onSelect={vi.fn()} />)
    expect(screen.queryByLabelText("Back")).not.toBeInTheDocument()
  })
})
