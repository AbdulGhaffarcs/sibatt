// frontend/lib/db.ts
// Loads timetable.db via sql.js and exposes typed query helpers.
//
// Setup (run once after npm install):
//   node -e "require('fs').copyFileSync('node_modules/sql.js/dist/sql-wasm.wasm','public/sql-wasm.wasm')"
// Or just run `npm install` — postinstall in package.json does it automatically.

import type { ClassEntry } from "@/components/timetable/ClassCard"

// Full entry — ClassEntry display fields + extra fields used for section filtering
export interface FullEntry extends ClassEntry {
  program:      string
  semester:     number
  term:         string
  teacher_name: string
  teacher_dept: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null

export async function loadDB(path: string): Promise<void> {
  // Dynamic import keeps sql.js out of the SSR bundle
  const initSqlJs = (await import("sql.js")).default
  const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" })
  const buf = await fetch(path).then((r) => r.arrayBuffer())
  db = new SQL.Database(new Uint8Array(buf))
}

// Generic row helper — maps sql.js columnar result to plain objects
function rows<T>(sql: string): T[] {
  if (!db) throw new Error("DB not loaded — call loadDB() first")
  const result = db.exec(sql) as { columns: string[]; values: unknown[][] }[]
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map((row) => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => { obj[col] = row[i] })
    return obj as T
  })
}

// ── public API ───────────────────────────────────────────────────────────────

export function getAllEntries(): FullEntry[] {
  const raw = rows<Record<string, unknown>>(`
    SELECT
      e.id,
      p.name        AS program,
      s.semester,
      s.section,
      c.name        AS course,
      t.code        AS teacher_code,
      t.name        AS teacher_name,
      t.dept        AS teacher_dept,
      r.code        AS room,
      r.building,
      ts.slot_no    AS slot,
      ts.start_time,
      ts.end_time,
      e.day,
      e.is_online,
      (CAST(te.year AS TEXT) || ' ' || te.semester) AS term
    FROM   entries   e
    JOIN   sections  s  ON e.section_id  = s.id
    JOIN   programs  p  ON s.program_id  = p.id
    JOIN   courses   c  ON e.course_id   = c.id
    JOIN   teachers  t  ON e.teacher_id  = t.id
    JOIN   rooms     r  ON e.room_id     = r.id
    JOIN   timeslots ts ON e.timeslot_id = ts.id
    JOIN   terms     te ON e.term_id     = te.id
    ORDER  BY e.day, ts.slot_no
  `)

  return raw.map((r) => ({
    id:           r.id           as number,
    program:      r.program      as string,
    semester:     r.semester     as number,
    section:      r.section      as string,
    course:       r.course       as string,
    teacher_code: r.teacher_code as string,
    teacher_name: r.teacher_name as string,
    teacher_dept: r.teacher_dept as string,
    room:         r.room         as string,
    building:     r.building     as string,
    slot:         r.slot         as number,
    start_time:   r.start_time   as string,
    end_time:     r.end_time     as string,
    day:          r.day          as string,
    is_online:    Boolean(r.is_online),
    term:         r.term         as string,
  }))
}

// Teacher metadata — code, name, dept. Useful for autocomplete / admin UIs.
export function getAllTeachers(): { code: string; name: string; dept: string }[] {
  return rows<{ code: string; name: string; dept: string }>(
    `SELECT code, name, dept FROM teachers ORDER BY name`
  )
}

export function getAllRooms(): string[] {
  return rows<{ code: string }>(
    `SELECT DISTINCT code FROM rooms ORDER BY code`
  ).map((r) => r.code)
}
