// frontend/lib/search.ts
// Client-side helpers: builds in-memory indexes from flat entry list.

import type { FullEntry } from "@/lib/db"
import type { Course }    from "@/components/search/CourseSearch"

// Groups entries by course name → one Course object per unique course.
export function buildCourseIndex(entries: FullEntry[]): Course[] {
  const map = new Map<string, Course>()

  for (const entry of entries) {
    const name = entry.course
    if (!name) continue
    if (!map.has(name)) {
      map.set(name, { name, entries: [] })
    }
    map.get(name)!.entries.push(entry)
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}
