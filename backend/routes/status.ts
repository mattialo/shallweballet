import { Router } from "express";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { logger } from "../instrumentation";

const router = Router();

router.get("/status", (_req, res) => {
  logger.emit({ severityNumber: SeverityNumber.DEBUG, body: "Status check" });
  res.json({ status: "OK" });
});

export default router;
