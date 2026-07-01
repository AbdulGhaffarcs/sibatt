import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import BottomNav from "@/components/ui/BottomNav"

describe("BottomNav", () => {
  it("renders all three tabs", () => {
    render(<BottomNav active="timetable" onChange={vi.fn()} />)
    expect(screen.getByText("Timetable")).toBeInTheDocument()
    expect(screen.getByText("Teachers")).toBeInTheDocument()
    expect(screen.getByText("Rooms")).toBeInTheDocument()
  })

  it("calls onChange when a tab is clicked", () => {
    const onChange = vi.fn()
    render(<BottomNav active="timetable" onChange={onChange} />)
    fireEvent.click(screen.getByText("Teachers"))
    expect(onChange).toHaveBeenCalledWith("teachers")
  })

  it("marks the active tab", () => {
    render(<BottomNav active="rooms" onChange={vi.fn()} />)
    const roomsTab = screen.getByText("Rooms").closest("button")
    expect(roomsTab).toHaveAttribute("aria-current", "page")
  })

  it("does not mark inactive tabs", () => {
    render(<BottomNav active="rooms" onChange={vi.fn()} />)
    const timetableTab = screen.getByText("Timetable").closest("button")
    expect(timetableTab).not.toHaveAttribute("aria-current")
  })
})
