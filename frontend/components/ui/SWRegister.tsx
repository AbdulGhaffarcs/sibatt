"use client"

import { useEffect } from "react"

export function SWRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Service worker registration failed silently
      })
    }
  }, [])

  return null
}
