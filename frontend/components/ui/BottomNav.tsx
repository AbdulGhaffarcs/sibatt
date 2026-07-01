// frontend/components/ui/BottomNav.tsx
// Fixed bottom navigation — timetable, teachers, rooms.

"use client"

type View = "timetable" | "teachers" | "rooms"

interface BottomNavProps {
  active:   View
  onChange: (v: View) => void
}

const TABS: { key: View; label: string; icon: React.ReactNode }[] = [
  {
    key: "timetable",
    label: "Timetable",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <rect x="3" y="4" width="14" height="13" rx="2"/>
        <path d="M3 8h14M7 4V2M13 4V2"/>
      </svg>
    ),
  },
  {
    key: "teachers",
    label: "Teachers",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <circle cx="10" cy="7" r="3.5"/>
        <path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7"/>
      </svg>
    ),
  },
  {
    key: "rooms",
    label: "Rooms",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M3 18V6l7-4 7 4v12"/>
        <path d="M8 18v-5h4v5"/>
      </svg>
    ),
  },
]

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-zinc-200 bg-white/90 backdrop-blur-sm">
      {TABS.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-current={active === key ? "page" : undefined}
          className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
            active === key
              ? "text-zinc-900"
              : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          {icon}
          <span className={`text-[11px] ${active === key ? "font-medium" : ""}`}>
            {label}
          </span>
        </button>
      ))}
    </nav>
  )
}
