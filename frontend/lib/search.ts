// frontend/lib/search.ts
// Client-side helpers: builds in-memory indexes from flat entry list.

import type { FullEntry } from "@/lib/db"
import type { Course }    from "@/components/search/CourseSearch"

export function normalizeCourseName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*B-(?:I{1,3}|IV|V)\b/gi, "")
    .replace(/\s*\(\s*Lab\s*\)/gi, " (Lab)")
    .replace(/[-\s]+Lab\b/gi, " (Lab)")
    .replace(/\s+([,.)])/g, "$1")
    .trim()
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]
      row[j] = a[i - 1] === b[j - 1] ? diagonal : 1 + Math.min(diagonal, above, row[j - 1])
      diagonal = above
    }
  }
  return row[b.length]
}

export function searchScore(value: string, query: string): number | null {
  const text = value.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim()
  const q = query.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim()
  if (!q || text.includes(q)) return q ? 0 : 0
  if (text.replace(/\s/g, "").includes(q.replace(/\s/g, ""))) return 1
  const words = text.split(" ").filter(Boolean)
  const matched = q.split(" ").every((token) => words.some((word) =>
    word.startsWith(token) || (token.length >= 4 && editDistance(word, token) <= (token.length >= 7 ? 2 : 1))
  ))
  return matched ? 2 : null
}

// Groups entries by course name → one Course object per unique course.
export function buildCourseIndex(entries: FullEntry[]): Course[] {
  const map = new Map<string, Course>()

  for (const entry of entries) {
    const name = normalizeCourseName(entry.course)
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
