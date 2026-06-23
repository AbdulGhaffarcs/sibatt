// frontend/lib/search.ts
// Client-side helpers: builds in-memory indexes from flat entry list.

import type { FullEntry } from "@/lib/db"
import type { Teacher }   from "@/components/search/TeacherSearch"

// Groups entries by teacher_code → one Teacher object per teacher.
export function buildTeacherIndex(entries: FullEntry[]): Teacher[] {
  const map = new Map<string, Teacher>()

  for (const entry of entries) {
    if (!map.has(entry.teacher_code)) {
      map.set(entry.teacher_code, {
        code:    entry.teacher_code,
        name:    entry.teacher_name,
        entries: [],
      })
    }
    map.get(entry.teacher_code)!.entries.push(entry)
  }

  return Array.from(map.values()).sort((a, b) =>
    a.code.localeCompare(b.code)
  )
}
