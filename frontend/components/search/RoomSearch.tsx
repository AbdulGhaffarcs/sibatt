// frontend/components/search/RoomSearch.tsx
// Search rooms by code — tap to see what's booked and what's free.

"use client"

import { useState, useMemo } from "react"
import type { ClassEntry }    from "@/components/timetable/ClassCard"
import ClassCard              from "@/components/timetable/ClassCard"
import DayTabs                from "@/components/ui/DayTabs"
import { DAY_FULL_KEYS }      from "@/lib/constants"

interface RoomSearchProps {
  entries: ClassEntry[]
  rooms:   string[]
}

export default function RoomSearch({ entries, rooms }: RoomSearchProps) {
  const [query,    setQuery]    = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [dayIdx,   setDayIdx]   = useState(() => {
    const d = new Date().getDay() - 1
    return d >= 0 && d <= 4 ? d : 0
  })

  const filteredRooms = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return rooms
    return rooms.filter((r) => r.toLowerCase().includes(q))
  }, [rooms, query])

  const roomCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    entries.forEach((e) => {
      counts[e.room] = (counts[e.room] ?? 0) + 1
    })
    return counts
  }, [entries])

  // ── room schedule view ────────────────────────────────────────────────────
  if (selected) {
    const dayEntries = entries
      .filter((e) => e.room === selected && e.day === DAY_FULL_KEYS[dayIdx])
      .sort((a, b) => a.slot - b.slot)

    return (
      <div className="flex flex-col w-full max-w-sm gap-4">

        {/* back + room name */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500"
          >
            ←
          </button>
          <div className="text-[17px] font-semibold text-zinc-900">
            {selected}
          </div>
        </div>

        {/* day tabs */}
        <DayTabs dayIdx={dayIdx} onChange={setDayIdx} />

        {dayEntries.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-zinc-400">
            Room is free all day on {DAY_FULL_KEYS[dayIdx]}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {dayEntries.map((e) => (
              <ClassCard key={e.id} entry={e} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── room list ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full max-w-sm gap-4">
      <h2 className="text-[17px] font-semibold text-zinc-900">Rooms</h2>

      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <svg className="h-4 w-4 flex-none text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="7" cy="7" r="4"/><path d="M11 11l2.5 2.5"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Room code…"
          aria-label="Search rooms by code"
          className="flex-1 bg-transparent text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400"
          autoFocus
        />
      </div>

      <div className="flex flex-col divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {filteredRooms.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-zinc-400">
            No rooms found
          </div>
        ) : (
          filteredRooms.map((room) => {
            const count = roomCounts[room] ?? 0
            return (
              <button
                key={room}
                onClick={() => setSelected(room)}
                className="flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
              >
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-zinc-100">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-zinc-600">
                    <path d="M3 18V6l7-4 7 4v12"/><path d="M8 18v-5h4v5"/>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-medium text-zinc-900">{room}</span>
                  <span className="text-[12px] text-zinc-400">
                    {count} weekly slot{count !== 1 ? "s" : ""}
                  </span>
                </div>
                <svg className="ml-auto h-4 w-4 flex-none text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 4l4 4-4 4"/>
                </svg>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
