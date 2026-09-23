// frontend/tests/SectionPicker.test.tsx

import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import SectionPicker from "@/components/timetable/SectionPicker"
import type { ClassEntry } from "@/components/timetable/ClassCard"

const mockEntries: ClassEntry[] = [
  {
    id: 1,
    day: "Monday",
    slot: 1,
    start_time: "09:00",
    end_time: "10:00",
    course: "Data Structures",
    teacher_code: "ABC",
    teacher_name: "Test Teacher",
    teacher_dept: "CS",
    room: "101",
    building: "Main",
    section: "A",
    program: "BS (CS)",
    semester: 3,
    term: "Fall",
    is_online: false,
  },
  {
    id: 2,
    day: "Monday",
    slot: 1,
    start_time: "09:00",
    end_time: "10:00",
    course: "Accounting",
    teacher_code: "XYZ",
    teacher_name: "Another Teacher",
    teacher_dept: "A&F",
    room: "102",
    building: "Main",
    section: "B",
    program: "BBA",
    semester: 1,
    term: "Fall",
    is_online: false,
  },
]

describe("SectionPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the three progressive selectors", () => {
    render(
      <SectionPicker
        entries={mockEntries}
        onSelect={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("combobox", { name: "Department" }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole("combobox", { name: "Semester" }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole("combobox", { name: "Section" }),
    ).toBeInTheDocument()
  })

  it("shows all departments initially", () => {
    render(
      <SectionPicker
        entries={mockEntries}
        onSelect={vi.fn()}
      />,
    )

    const departmentSelect = screen.getByRole("combobox", {
      name: "Department",
    })

    expect(
      screen.getByRole("option", { name: "CS" }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole("option", { name: "BBA" }),
    ).toBeInTheDocument()

    expect(departmentSelect).toHaveValue("")
  })

  it("progressively filters semesters by department", () => {
    render(
      <SectionPicker
        entries={mockEntries}
        onSelect={vi.fn()}
      />,
    )

    const departmentSelect = screen.getByRole("combobox", {
      name: "Department",
    })

    const semesterSelect = screen.getByRole("combobox", {
      name: "Semester",
    })

    expect(semesterSelect).toBeDisabled()

    fireEvent.change(departmentSelect, {
      target: { value: "CS" },
    })

    expect(semesterSelect).not.toBeDisabled()

    expect(
      screen.getByRole("option", { name: "Semester III" }),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole("option", { name: "Semester I" }),
    ).not.toBeInTheDocument()
  })

  it("progressively filters sections by department and semester", () => {
    render(
      <SectionPicker
        entries={mockEntries}
        onSelect={vi.fn()}
      />,
    )

    const departmentSelect = screen.getByRole("combobox", {
      name: "Department",
    })

    const semesterSelect = screen.getByRole("combobox", {
      name: "Semester",
    })

    const sectionSelect = screen.getByRole("combobox", {
      name: "Section",
    })

    fireEvent.change(departmentSelect, {
      target: { value: "CS" },
    })

    fireEvent.change(semesterSelect, {
      target: { value: "3" },
    })

    expect(sectionSelect).not.toBeDisabled()

    expect(
      screen.getByRole("option", { name: "Section A" }),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole("option", { name: "Section B" }),
    ).not.toBeInTheDocument()
  })

  it("selecting a section immediately calls onSelect", () => {
    const onSelect = vi.fn()

    render(
      <SectionPicker
        entries={mockEntries}
        onSelect={onSelect}
      />,
    )

    const departmentSelect = screen.getByRole("combobox", {
      name: "Department",
    })

    const semesterSelect = screen.getByRole("combobox", {
      name: "Semester",
    })

    const sectionSelect = screen.getByRole("combobox", {
      name: "Section",
    })

    fireEvent.change(departmentSelect, {
      target: { value: "CS" },
    })

    fireEvent.change(semesterSelect, {
      target: { value: "3" },
    })

    fireEvent.change(sectionSelect, {
      target: { value: "A" },
    })

    expect(onSelect).toHaveBeenCalledTimes(1)

    expect(onSelect).toHaveBeenCalledWith({
      department: "CS",
      semester: 3,
      section: "A",
    })
  })

  it("resets the semester when the department changes", () => {
    const onSelect = vi.fn()

    render(
      <SectionPicker
        entries={mockEntries}
        onSelect={onSelect}
      />,
    )

    const departmentSelect = screen.getByRole("combobox", {
      name: "Department",
    })

    const semesterSelect = screen.getByRole("combobox", {
      name: "Semester",
    })

    fireEvent.change(departmentSelect, {
      target: { value: "CS" },
    })

    fireEvent.change(semesterSelect, {
      target: { value: "3" },
    })

    expect(semesterSelect).toHaveValue("3")

    fireEvent.change(departmentSelect, {
      target: { value: "BBA" },
    })

    expect(semesterSelect).toHaveValue("")

    expect(
      screen.getByRole("option", { name: "Semester I" }),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole("option", { name: "Semester III" }),
    ).not.toBeInTheDocument()
  })

  it("does not render a separate View timetable action", () => {
    render(
      <SectionPicker
        entries={mockEntries}
        onSelect={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole("button", { name: /view timetable/i }),
    ).not.toBeInTheDocument()
  })
})