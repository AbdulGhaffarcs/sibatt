export function formatTime12(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())

  if (!match) {
    return time
  }

  const hours = Number(match[1])
  const minutes = match[2]

  if (hours < 0 || hours > 23) {
    return time
  }

  const period = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12

  return `${displayHour}:${minutes} ${period}`
}