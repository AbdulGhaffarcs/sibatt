import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import DaySelector from "@/components/timetable/DaySelector"

describe("DaySelector", () => {
  it("renders all five days", () => {
    render(<DaySelector active="Mo" onChange={vi.fn()} />)
    expect(screen.getByText("Mo")).toBeInTheDocument()
    expect(screen.getByText("Tu")).toBeInTheDocument()
    expect(screen.getByText("We")).toBeInTheDocument()
    expect(screen.getByText("Th")).toBeInTheDocument()
    expect(screen.getByText("Fr")).toBeInTheDocument()
  })

  it("calls onChange when a day is clicked", () => {
    const onChange = vi.fn()
    render(<DaySelector active="Mo" onChange={onChange} />)
    fireEvent.click(screen.getByText("We"))
    expect(onChange).toHaveBeenCalledWith("We")
  })

  it("highlights the active day", () => {
    render(<DaySelector active="Tu" onChange={vi.fn()} />)
    const tuesday = screen.getByText("Tu")
    expect(tuesday).toHaveAttribute("aria-pressed", "true")
  })

  it("marks inactive days as not pressed", () => {
    render(<DaySelector active="Tu" onChange={vi.fn()} />)
    const monday = screen.getByText("Mo")
    expect(monday).toHaveAttribute("aria-pressed", "false")
  })
})
