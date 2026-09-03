"use client"

import { useEffect } from "react"

export function SWRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        // Check immediately so existing installs receive the new timetable
        // caching policy without waiting for the browser's update interval.
        void registration.update()
      }).catch(() => {
        // Service worker registration failed silently
      })
    }
  }, [])

  return null
}
