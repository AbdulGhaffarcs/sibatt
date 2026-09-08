import { beforeEach, describe, expect, it } from "vitest"
import {
  addRecentSection,
  loadRecentSections,
  MAX_RECENT_SECTIONS,
  RECENT_SECTIONS_KEY,
  saveRecentSections,
} from "@/lib/recent"
import type { Section } from "@/lib/filters"

const section = (program: string, semester: number, value: string): Section => ({
  program,
  semester,
  section: value,
})

describe("recent sections", () => {
  beforeEach(() => window.localStorage.clear())

  it("moves a revisited section to the front and limits the list", () => {
    const sections = Array.from({ length: MAX_RECENT_SECTIONS }, (_, index) =>
      section(`Program ${index}`, index + 1, "A"),
    )

    const updated = addRecentSection(sections, sections[2])
    expect(updated[0]).toEqual(sections[2])
    expect(updated).toHaveLength(MAX_RECENT_SECTIONS)
    expect(updated.filter((item) => item.program === sections[2].program)).toHaveLength(1)
  })

  it("persists and restores recent sections", () => {
    const sections = [section("BSCS", 3, "A")]
    saveRecentSections(sections)
    expect(window.localStorage.getItem(RECENT_SECTIONS_KEY)).not.toBeNull()
    expect(loadRecentSections()).toEqual(sections)
  })

  it("ignores malformed stored data", () => {
    window.localStorage.setItem(RECENT_SECTIONS_KEY, "not-json")
    expect(loadRecentSections()).toEqual([])
  })
})