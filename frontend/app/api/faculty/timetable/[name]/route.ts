import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

function isAuthenticated(req: NextRequest) {
  const token = req.cookies.get("faculty_token")?.value
  return !!token
}

export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  }

  const teacherName = decodeURIComponent(params.name)

  try {
    const filePath = path.resolve(process.cwd(), "..", "data", "faculty.json")
    const raw = fs.readFileSync(filePath, "utf-8")
    const data = JSON.parse(raw)

    const normalizedName = teacherName.trim().toLowerCase()
    const teacher = data.find(
      (t: any) => t.teacher.toLowerCase() === normalizedName
    ) || data.find(
      (t: any) => t.teacher.toLowerCase().includes(normalizedName)
    )

    if (!teacher) {
      return NextResponse.json({ detail: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json({
      teacher: teacher.teacher,
      entries: teacher.entries || [],
    })
  } catch (err) {
    return NextResponse.json(
      { detail: "Faculty data not found" },
      { status: 500 }
    )
  }
}