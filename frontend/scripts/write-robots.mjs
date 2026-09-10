import { writeFile } from "node:fs/promises"

const staging = process.env.NEXT_PUBLIC_STAGING === "true"
const contents = staging
  ? "User-agent: *\nDisallow: /\n"
  : "User-agent: *\nAllow: /\n"

await writeFile("public/robots.txt", contents)