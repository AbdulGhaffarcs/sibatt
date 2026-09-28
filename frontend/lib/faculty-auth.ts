import crypto from "crypto"

export const FACULTY_SESSION_COOKIE = "faculty_session"
const SESSION_LIFETIME_SECONDS = 60 * 60 * 12

type FacultyCredentials = Record<string, string>
type FacultySession = { teacher: string; expiresAt: number }

function credentials(): FacultyCredentials | null {
  const raw = process.env.FACULTY_CREDENTIALS
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      !Object.values(parsed).every((password) => typeof password === "string")
    ) return null
    return parsed as FacultyCredentials
  } catch {
    return null
  }
}

function sessionSecret() {
  return process.env.FACULTY_SESSION_SECRET || null
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url")
}

export function authenticateTeacher(name: string, password: string) {
  const configuredCredentials = credentials()
  if (!configuredCredentials || !sessionSecret()) return null

  const teacher = Object.keys(configuredCredentials).find(
    (candidate) => candidate.toLocaleLowerCase() === name.trim().toLocaleLowerCase()
  )
  if (!teacher) return null

  const passwordBuffer = Buffer.from(password)
  const expectedBuffer = Buffer.from(configuredCredentials[teacher])
  if (
    passwordBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(passwordBuffer, expectedBuffer)
  ) return null

  return teacher
}

export function createFacultySession(teacher: string) {
  const secret = sessionSecret()
  if (!secret) throw new Error("FACULTY_SESSION_SECRET is not configured")

  const payload = Buffer.from(JSON.stringify({
    teacher,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
  })).toString("base64url")
  return `${payload}.${sign(payload, secret)}`
}

export function readFacultySession(token: string | undefined): FacultySession | null {
  const secret = sessionSecret()
  if (!token || !secret) return null

  const [payload, signature, ...extra] = token.split(".")
  if (!payload || !signature || extra.length) return null

  const receivedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(sign(payload, secret))
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) return null

  try {
    const session: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (
      !session || typeof session !== "object" ||
      typeof (session as FacultySession).teacher !== "string" ||
      typeof (session as FacultySession).expiresAt !== "number" ||
      (session as FacultySession).expiresAt <= Math.floor(Date.now() / 1000)
    ) return null
    return session as FacultySession
  } catch {
    return null
  }
}

export const facultySessionMaxAge = SESSION_LIFETIME_SECONDS
