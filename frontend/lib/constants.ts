// frontend/lib/constants.ts
// Shared constants used across components.

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

