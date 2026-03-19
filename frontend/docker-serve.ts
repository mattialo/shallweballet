import { join } from "path"

const dir = "./build/client"
const PORT = parseInt(process.env.PORT ?? "8080")

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname
    const file = Bun.file(join(dir, pathname))

    if (await file.exists()) {
      return new Response(file)
    }

    // SPA fallback — serve index.html for all unmatched routes
    return new Response(Bun.file(join(dir, "index.html")))
  },
})

console.log(`Serving ${dir} on http://localhost:${PORT}`)
