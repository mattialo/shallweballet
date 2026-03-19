import "../instrumentation"
import { initDB } from "../db"
import app from "../app"

// Initialize DB on cold start
let dbReady: Promise<void> | null = null
function ensureDB() {
  if (!dbReady) dbReady = initDB(3, 1000)
  return dbReady
}

// Vercel serverless handler — ensure DB is ready before handling requests
export default async function handler(req: any, res: any) {
  await ensureDB()
  app(req, res)
}
