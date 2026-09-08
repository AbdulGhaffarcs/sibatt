import type { Section } from "@/lib/filters"

export const RECENT_SECTIONS_KEY = "slotfinder.recent-sections"
export const MAX_RECENT_SECTIONS = 5

function sameSection(left: Section, right: Section): boolean {
  return (
    left.program === right.program &&
    left.semester === right.semester &&
    left.section === right.section
  )
}

export function addRecentSection(
  recent: Section[],
  section: Section,
): Section[] {
  return [
    section,
    ...recent.filter((item) => !sameSection(item, section)),
  ].slice(0, MAX_RECENT_SECTIONS)
}

export function loadRecentSections(): Section[] {
  try {
    const value = window.localStorage.getItem(RECENT_SECTIONS_KEY)
    if (!value) return []

    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is Section =>
        typeof item === "object" &&
        item !== null &&
        typeof item.program === "string" &&
        typeof item.semester === "number" &&
        typeof item.section === "string",
    ).slice(0, MAX_RECENT_SECTIONS)
  } catch {
    return []
  }
}

export function saveRecentSections(recent: Section[]): void {
  try {
    window.localStorage.setItem(
      RECENT_SECTIONS_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT_SECTIONS)),
    )
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}