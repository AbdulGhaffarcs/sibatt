// frontend/lib/faculty.ts

export async function facultyLogin(password: string): Promise<string> {
  const res = await fetch("/api/faculty/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Login failed")
  }

  const data = await res.json()
  return data.token
}

export async function getTeachers(): Promise<string[]> {
  const res = await fetch("/api/faculty/teachers")
  if (!res.ok) throw new Error("Failed to load teachers")
  const data = await res.json()
  return data.teachers
}

export async function getTeacherTimetable(teacherName: string) {
  const res = await fetch(
    `/api/faculty/timetable/${encodeURIComponent(teacherName)}`
  )
  if (!res.ok) throw new Error("Failed to load timetable")
  return res.json()
}