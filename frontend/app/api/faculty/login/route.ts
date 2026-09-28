import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import crypto from "crypto"

const FACULTY_PASSWORD = process.env.FACULTY_PASSWORD || "123"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { password } = body

  if (password !== FACULTY_PASSWORD) {
    return NextResponse.json({ detail: "Wrong password" }, { status: 401 })
  }

  // Simple token
  const token = crypto.randomBytes(32).toString("hex")

  const response = NextResponse.json({ token, message: "Login successful" })

  // Store token in httpOnly cookie (more secure)
  response.cookies.set("faculty_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12, // 12 hours
    path: "/",
  })

  return response
}