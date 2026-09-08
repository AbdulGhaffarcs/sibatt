import { describe, expect, it } from "vitest"
import { formatTime12 } from "@/lib/time"

describe("formatTime12", () => {
  it("formats morning times", () => {
    expect(formatTime12("09:00")).toBe("9:00 AM")
    expect(formatTime12("09:50")).toBe("9:50 AM")
    expect(formatTime12("10:40")).toBe("10:40 AM")
  })

  it("formats noon and afternoon times", () => {
    expect(formatTime12("12:00")).toBe("12:00 PM")
    expect(formatTime12("13:00")).toBe("1:00 PM")
    expect(formatTime12("14:50")).toBe("2:50 PM")
    expect(formatTime12("16:10")).toBe("4:10 PM")
  })

  it("formats evening times", () => {
    expect(formatTime12("17:00")).toBe("5:00 PM")
    expect(formatTime12("18:40")).toBe("6:40 PM")
    expect(formatTime12("20:00")).toBe("8:00 PM")
  })

  it("handles midnight", () => {
    expect(formatTime12("00:00")).toBe("12:00 AM")
  })

  it("leaves invalid values unchanged", () => {
    expect(formatTime12("unknown")).toBe("unknown")
    expect(formatTime12("25:00")).toBe("25:00")
  })
})