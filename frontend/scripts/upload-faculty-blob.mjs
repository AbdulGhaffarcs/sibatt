import { readFile } from "node:fs/promises"
import path from "node:path"
import { put } from "@vercel/blob"

const file = process.argv[2] || path.resolve(process.cwd(), "..", "data", "faculty.json")
const body = await readFile(file)
const blob = await put("faculty.json", body, {
  access: "public",
  addRandomSuffix: false,
  contentType: "application/json",
  token: process.env.BLOB_READ_WRITE_TOKEN,
})

console.log(blob.url)
