// components/timetable/DaySelector.tsx
// Five-day pill row — highlights active day

export type Day = "Mo" | "Tu" | "We" | "Th" | "Fr"

const DAYS: { key: Day; label: string }[] = [
  { key: "Mo", label: "Mo" },
  { key: "Tu", label: "Tu" },
  { key: "We", label: "We" },
  { key: "Th", label: "Th" },
  { key: "Fr", label: "Fr" },
]

interface DaySelectorProps {
  active: Day
  onChange: (day: Day) => void
}

export default function DaySelector({ active, onChange }: DaySelectorProps) {
  return (
    <div className="flex gap-1.5">
      {DAYS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={active === key}
          className={`flex-1 rounded-lg border py-2 text-[13px] font-medium transition-colors ${
            active === key
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-transparent text-zinc-500 hover:bg-zinc-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}