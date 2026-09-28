import { getFacultyData } from "@/lib/faculty-data"
import { NextRequest, NextResponse } from "next/server"

function isAuthenticated(req: NextRequest) {
  const token = req.cookies.get("faculty_token")?.value
  return !!token
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await getFacultyData()

    const names = Array.from(new Set(data.map((t) => t.teacher))).sort()
    return NextResponse.json({ teachers: names })
  } catch (err) {
    return NextResponse.json(
      { detail: "Faculty data not found. Run the extractor first." },
      { status: 500 }
    )
  }
}