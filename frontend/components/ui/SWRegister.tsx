"use client"

import { useEffect } from "react"

export function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    // A service worker must not control localhost development: Next's dev
    // chunks have stable URLs and an old cache can otherwise hide UI changes.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        void Promise.all(registrations.map((registration) => registration.unregister()))
      })
      return
    }

    navigator.serviceWorker.register("/sw.js").then((registration) => {
        // Check immediately so existing installs receive the new timetable
        // caching policy without waiting for the browser's update interval.
        void registration.update()
    }).catch(() => {
      // Service worker registration failed silently
    })
  }, [])

  return null
}
