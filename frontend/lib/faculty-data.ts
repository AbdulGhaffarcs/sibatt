export type FacultyEntry = {
  day: string
  slot: number
  end_slot?: number
  start_time: string
  end_time: string
  course: string
  section: string
  room: string
}

export type FacultyTeacher = {
  teacher: string
  page?: number
  entries: FacultyEntry[]
}

export async function getFacultyData(): Promise<FacultyTeacher[]> {
  const url = process.env.FACULTY_BLOB_URL
  if (!url) throw new Error("FACULTY_BLOB_URL is not configured")
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error(`Faculty Blob request failed (${response.status})`)
  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new Error("Faculty Blob contains invalid data")
  return data as FacultyTeacher[]
}
