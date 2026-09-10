// components/timetable/ClassCard.tsx
// Single class entry card — used inside DayView

import { formatTime12 } from "@/lib/time"

export interface ClassEntry {
  id: number
  course: string
  teacher_code: string
  teacher_name: string
  teacher_dept: string
  room: string
  building: string
  section: string
  program: string
  semester: number
  term: string
  slot: number
  end_slot?: number
  start_time: string
  end_time: string
  day: string
  is_online: boolean
}

interface ClassCardProps {
  entry: ClassEntry
  isCurrent?: boolean
  isNext?: boolean
}

export default function ClassCard({
  entry,
  isCurrent = false,
  isNext = false,
}: ClassCardProps) {
  const periodLabel =
    entry.end_slot && entry.end_slot !== entry.slot
      ? `P${entry.slot}–P${entry.end_slot}`
      : `P${entry.slot}`

  return (
    <div
      className={`flex gap-3 rounded-xl border bg-white p-3 transition-shadow ${
        isCurrent
          ? "animate-current-class border-amber-400 shadow-sm"
          : isNext
            ? "animate-upcoming-class border-blue-300 shadow-sm"
            : "border-zinc-200"
      }`}
    >
      {/* time column */}
      <div className="flex min-w-[64px] flex-col items-center sm:min-w-[68px]">
        <span className="whitespace-nowrap font-mono text-[12px] font-medium text-zinc-800">
          {formatTime12(entry.start_time)}
        </span>

        <span className="whitespace-nowrap font-mono text-[11px] text-zinc-400">
          {formatTime12(entry.end_time)}
        </span>
      </div>

      {/* divider */}
      <div className="w-px bg-zinc-100" />

      {/* content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-medium leading-tight text-zinc-900">
            {entry.course}
          </span>

          {isNext && (
            <span className="animate-status-badge flex-none rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              Up next
            </span>
          )}

          {isCurrent && (
            <span className="animate-status-badge flex-none rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Current
            </span>
          )}
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          {/* room or online badge */}
          {entry.is_online ? (
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
              Online
            </span>
          ) : (
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
              {entry.room || "Room TBA"}
            </span>
          )}

          {/* teacher */}
          <span className="flex items-center gap-1 text-[12px] text-zinc-500">
            <svg
              className="h-3 w-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="8" cy="5" r="3" />
              <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            </svg>
            {entry.teacher_code}
          </span>

          {/* slot / merged slot range */}
          <span className="ml-auto whitespace-nowrap font-mono text-[11px] text-zinc-400">
            {periodLabel}
          </span>
        </div>
      </div>
    </div>
  )
}
