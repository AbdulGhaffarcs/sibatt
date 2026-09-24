// frontend/app/layout.tsx
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SWRegister } from "@/components/ui/SWRegister"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sibatt — Sukkur IBA",
  description: "Search your timetable by section, teacher, or room. Mobile-first timetable search engine for Sukkur IBA University.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Sibatt — Sukkur IBA",
    description: "Search your timetable by section, teacher, or room.",
    siteName: "Sibatt",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Sibatt — Sukkur IBA",
    description: "Search your timetable by section, teacher, or room.",
  },
  robots:
    process.env.NEXT_PUBLIC_STAGING === "true"
      ? { index: false, follow: false, nocache: true }
      : undefined,
}

export const viewport: Viewport = {
  themeColor: "#f4f4f5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-50 min-h-screen`}>
        <SWRegister />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
