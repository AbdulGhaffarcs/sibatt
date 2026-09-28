// frontend/lib/constants.ts
// Shared constants used across components.

/** Only timetables from this academic year are shown. */
export const ACTIVE_YEAR = 2026
export const ACTIVE_TERM = "Fall 2026"


export const SEM_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const

export const DAY_KEYS = ["Mo", "Tu", "We", "Th", "Fr"] as const
export type DayKey = (typeof DAY_KEYS)[number]

export const DAY_FULL: Record<DayKey, string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
}

/** Array of full day names indexed 0=Mon..4=Fri */
export const DAY_FULL_KEYS: string[] = Object.values(DAY_FULL)

export const TIMESLOTS = [
  { slot: 1, start: "09:00", end: "09:50" },
  { slot: 2, start: "09:50", end: "10:40" },
  { slot: 3, start: "11:10", end: "12:00" },
  { slot: 4, start: "12:10", end: "13:00" },
  { slot: 5, start: "14:00", end: "14:50" },
  { slot: 6, start: "14:50", end: "15:40" },
  { slot: 7, start: "16:10", end: "17:00" },
  { slot: 8, start: "17:00", end: "17:50" },
  { slot: 9, start: "17:50", end: "18:40" },
  { slot: 10, start: "18:40", end: "20:00" },
] as const

