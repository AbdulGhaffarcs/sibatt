// public/sw.js
// Minimal service worker: cache-first for static assets, network-first for navigation.

const CACHE_NAME = "sibatt-v5"
const STATIC_ASSETS = [
  "/",
  "/sql-wasm.wasm",
  "/favicon.svg",
  "/manifest.json",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== "GET") return

  // Timetable imports replace this file in place. Fetch it from the network on
  // every page load so an installed app never remains on a previous term.
  if (new URL(request.url).pathname === "/timetable.db") {
    event.respondWith(fetch(request, { cache: "no-store" }))
    return
  }

  // Next.js development chunks use stable URLs. Caching them can make a local
  // server display an older page even after its source has changed.
  if (new URL(request.url).pathname.startsWith("/_next/")) {
    event.respondWith(fetch(request, { cache: "no-store" }))
    return
  }

  // Navigation requests: network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    )
    return
  }

  // Other static assets are cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        // Cache successful responses for same-origin requests
        if (response.ok && request.url.startsWith(self.location.origin)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
    })
  )
})
