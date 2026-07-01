// frontend/components/ui/DayTabs.tsx
// Reusable day-of-week tab row for schedule views.

"use client"

import { DAY_KEYS, DAY_FULL } from "@/lib/constants"

interface DayTabsProps {
  dayIdx: number
  onChange: (idx: number) => void
}

export type { DayTabsProps }

export default function DayTabs({ dayIdx, onChange }: DayTabsProps) {
  return (
    <div className="flex gap-1">
      {DAY_KEYS.map((key, i) => (
        <button
          key={key}
          onClick={() => onChange(i)}
          aria-pressed={dayIdx === i}
          className={`flex-1 rounded-lg border py-2 text-[12px] font-medium transition-colors ${
            dayIdx === i
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
          }`}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
