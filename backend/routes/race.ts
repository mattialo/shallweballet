import { Router } from "express";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { logger, tracer } from "../instrumentation";
import { simulateRace } from "../simulation/engine";
import type { Racer } from "../simulation/types";
import { saveRace } from "../db";

const router = Router();

router.post("/race", (req, res) => {
  const { racers } = req.body as { racers: Racer[] };

  tracer.startActiveSpan("race.handle", (span) => {
    span.setAttribute("race.racer_count", racers.length);

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      body: "Race request received",
      attributes: { racerCount: racers.length },
    });

    const result = simulateRace(racers);

    span.setAttribute("race.tick_count", result.ticks.length);
    span.setAttribute("race.winner", result.finishOrder[0] ?? "none");
    span.setAttribute("race.finish_order", result.finishOrder.join(","));

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      body: "Race completed",
      attributes: {
        racerCount: racers.length,
        tickCount: result.ticks.length,
        winner: result.finishOrder[0] ?? null,
        finishOrder: result.finishOrder.join(","),
      },
    });

    span.end();
    res.json(result);
    saveRace(racers, result.finishOrder, result.ticks).catch((err) =>
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        body: "saveRace failed",
        attributes: { error: String(err) },
      }),
    );
  });
});

export default router;
