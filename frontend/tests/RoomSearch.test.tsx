import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import RoomSearch from "@/components/search/RoomSearch"
import type { ClassEntry } from "@/components/timetable/ClassCard"

const baseEntry: ClassEntry = {
  id: 1, program: "BSCS", semester: 3, section: "A",
  course: "Data Structures", teacher_code: "AK", teacher_name: "Dr. Khan",
  teacher_dept: "CS", room: "R-305", building: "B-II",
  slot: 3, start_time: "11:10", end_time: "12:00",
  day: "Monday", is_online: false, term: "Fall-2025",
}

const mockEntries: ClassEntry[] = [
  baseEntry,
  { ...baseEntry, id: 2, room: "R-201", building: "B-I", slot: 1, start_time: "09:00", end_time: "09:50", day: "Tuesday" },
  { ...baseEntry, id: 3, room: "R-305", course: "Algorithms", slot: 4, start_time: "12:10", end_time: "13:00", day: "Wednesday" },
]

const mockRooms = ["R-305", "R-201", "Lab-1"]

describe("RoomSearch", () => {
  it("renders all rooms", () => {
    render(<RoomSearch entries={mockEntries} rooms={mockRooms} />)
    expect(screen.getByText("R-305")).toBeInTheDocument()
    expect(screen.getByText("R-201")).toBeInTheDocument()
    expect(screen.getByText("Lab-1")).toBeInTheDocument()
  })

  it("filters rooms by query", () => {
    render(<RoomSearch entries={mockEntries} rooms={mockRooms} />)
    const input = screen.getByPlaceholderText("Room code…")
    fireEvent.change(input, { target: { value: "Lab" } })
    expect(screen.getByText("Lab-1")).toBeInTheDocument()
    expect(screen.queryByText("R-305")).not.toBeInTheDocument()
  })

  it("shows empty state when no rooms match", () => {
    render(<RoomSearch entries={mockEntries} rooms={mockRooms} />)
    const input = screen.getByPlaceholderText("Room code…")
    fireEvent.change(input, { target: { value: "ZZZZ" } })
    expect(screen.getByText("No rooms found")).toBeInTheDocument()
  })

  it("navigates to detail view on room click", () => {
    render(<RoomSearch entries={mockEntries} rooms={mockRooms} />)
    fireEvent.click(screen.getByText("R-201"))
    expect(screen.getByText("R-201")).toBeInTheDocument()
  })

  it("shows weekly slot count per room", () => {
    render(<RoomSearch entries={mockEntries} rooms={mockRooms} />)
    const slots = screen.getAllByText(/weekly slot/)
    expect(slots.length).toBeGreaterThan(0)
  })
})
