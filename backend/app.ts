import express from "express"
import cors from "cors"
import { CORS_ORIGIN } from "./config"
import statusRouter from "./routes/status"
import raceRouter from "./routes/race"
import statsRouter from "./routes/stats"
import historyRouter from "./routes/history"

const app = express()

app.use(cors({ origin: CORS_ORIGIN }))
app.use(express.json())

app.use("/api", statusRouter)
app.use("/api", raceRouter)
app.use("/api", statsRouter)
app.use("/api", historyRouter)

export default app
