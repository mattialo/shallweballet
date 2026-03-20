import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import statusRouter from "./routes/status";
import raceRouter from "./routes/race";
import statsRouter from "./routes/stats";
import historyRouter from "./routes/history";

const app = express();

app.use(express.json());
app.use(clerkMiddleware());

// Public routes
app.use("/api", statusRouter);

// Protected routes
app.use("/api", requireAuth(), raceRouter);
app.use("/api", requireAuth(), statsRouter);
app.use("/api", requireAuth(), historyRouter);

export default app;
