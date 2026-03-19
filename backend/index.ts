import { logger } from "./instrumentation"
import { SeverityNumber } from "@opentelemetry/api-logs"
import app from "./app"
import { PORT } from "./config"
import { initDB } from "./db"

await initDB()

app.listen(PORT, () => {
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body: "Server started",
    attributes: { port: PORT },
  })
})
