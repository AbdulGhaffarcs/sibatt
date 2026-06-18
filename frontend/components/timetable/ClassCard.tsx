// components/timetable/ClassCard.tsx
// Single class entry card — used inside DayView

export interface ClassEntry {
  id: number
  course: string
  teacher_code: string
  room: string
  building: string
  section: string
  slot: number
  start_time: string
  end_time: string
  day: string
  is_online: boolean
}

interface ClassCardProps {
  entry: ClassEntry
  isNext?: boolean
}

export default function ClassCard({ entry, isNext = false }: ClassCardProps) {
  return (
    <div
      className={`flex gap-3 rounded-xl border bg-white p-3 transition-shadow ${
        isNext ? "border-blue-300 shadow-sm" : "border-zinc-200"
      }`}
    >
      {/* time column */}
      <div className="flex min-w-[48px] flex-col items-center">
        <span className="font-mono text-[12px] font-medium text-zinc-800">
          {entry.start_time}
        </span>
        <span className="font-mono text-[11px] text-zinc-400">
          {entry.end_time}
        </span>
      </div>

      {/* divider */}
      <div className="w-px bg-zinc-100" />

      {/* content */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-medium text-zinc-900 leading-tight">
            {entry.course}
          </span>
          {isNext && (
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              Up next
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {/* room or online badge */}
          {entry.is_online ? (
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
              Online
            </span>
          ) : (
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
              {entry.room}
            </span>
          )}

          {/* teacher */}
          <span className="text-[12px] text-zinc-500 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
            </svg>
            {entry.teacher_code}
          </span>

          {/* slot number */}
          <span className="ml-auto font-mono text-[11px] text-zinc-400">
            P{entry.slot}
          </span>
        </div>
      </div>
    </div>
  )
}