// frontend/app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SlotFinder — Sukkur IBA",
  description: "Search your timetable by section, teacher, or room.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-50 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
