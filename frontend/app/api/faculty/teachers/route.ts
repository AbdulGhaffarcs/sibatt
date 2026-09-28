import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import fs from "fs"
import path from "path"

function isAuthenticated(req: NextRequest) {
  const token = req.cookies.get("faculty_token")?.value
  return !!token
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  }

  try {
    const filePath = path.resolve(process.cwd(), "..", "data", "faculty.json")
    const raw = fs.readFileSync(filePath, "utf-8")
    const data = JSON.parse(raw)

    const names = Array.from(new Set<string>(data.map((t: any) => t.teacher))).sort()
    return NextResponse.json({ teachers: names })
  } catch (err) {
    return NextResponse.json(
      { detail: "Faculty data not found. Run the extractor first." },
      { status: 500 }
    )
  }
}