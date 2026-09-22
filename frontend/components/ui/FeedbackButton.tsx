// frontend/components/ui/FeedbackButton.tsx
// Floating feedback button for SIBATT.

"use client"

import { FormEvent, useState } from "react"
import emailjs from "@emailjs/browser"

const EMAILJS_SERVICE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID

const EMAILJS_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID

const EMAILJS_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle")

  async function submit(event: FormEvent) {
    event.preventDefault()

    if (!message.trim()) {
      return
    }

    setStatus("sending")

    try {
      if (
        !EMAILJS_SERVICE_ID ||
        !EMAILJS_TEMPLATE_ID ||
        !EMAILJS_PUBLIC_KEY
      ) {
        throw new Error("EmailJS is not configured")
      }

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          message: message.trim(),
          email: email.trim() || "Not provided",
          user_agent: window.navigator.userAgent,
        },
        EMAILJS_PUBLIC_KEY,
      )

      setMessage("")
      setEmail("")
      setStatus("success")
    } catch {
      setStatus("error")
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Send feedback"
        onClick={() => {
          setOpen(true)
          setStatus("idle")
        }}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 sm:bottom-5 sm:right-5"
      >
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-900/20 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="feedback-title"
                  className="text-base font-semibold text-zinc-900"
                >
                  Share feedback
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Tell us what would make SIBATT better.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close feedback"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-xl leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={submit}
              className="mt-4 space-y-3"
            >
              <textarea
                required
                autoFocus
                maxLength={2000}
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="What should we improve?"
                className="min-h-28 w-full resize-y rounded-xl border border-zinc-300 p-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900"
              />

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Email for a reply (optional)"
                className="h-10 w-full rounded-xl border border-zinc-300 px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900"
              />

              {status === "success" && (
                <p className="text-sm text-emerald-600">
                  Thanks, your feedback was received.
                </p>
              )}

              {status === "error" && (
                <p className="text-sm text-red-600">
                  Could not send feedback. Please try again.
                </p>
              )}

              <button
                type="submit"
                disabled={
                  status === "sending" || !message.trim()
                }
                className="h-10 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {status === "sending"
                  ? "Sending..."
                  : "Send feedback"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}