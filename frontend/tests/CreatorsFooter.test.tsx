import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import CreatorsFooter from "@/components/ui/CreatorsFooter"

describe("CreatorsFooter", () => {
  it("renders the creator credit text and links", () => {
    render(<CreatorsFooter />)

    expect(screen.getByText("Made with love by")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Abdul" })).toHaveAttribute(
      "href",
      "https://github.com/AbdulGhaffarcs",
    )
    expect(screen.getByRole("link", { name: "Qasim" })).toHaveAttribute(
      "href",
      "https://github.com/qasimio",
    )
  })
})
