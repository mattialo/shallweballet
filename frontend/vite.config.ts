import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    port: Number(process.env.PORT),
  },
  resolve: {
    alias: [
      // Bun maps react-dom/server → server.bun.js which lacks renderToPipeableStream
      // in some Bun versions. Point directly to server.node which has the full API.
      { find: /^react-dom\/server$/, replacement: "react-dom/server.node" },
    ],
  },
})
