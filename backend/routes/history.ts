import { Router } from "express";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { logger, tracer } from "../instrumentation";
import { getRaceHistory, getRaceById } from "../db";

const router = Router();

router.get("/races", async (req, res) => {
  tracer.startActiveSpan("history.list", async (span) => {
    try {
      const before =
        typeof req.query.before === "string" ? req.query.before : undefined;
      const limitParam = Number.parseInt(
        typeof req.query.limit === "string" ? req.query.limit : "20",
        10,
      );
      const limit = Math.min(Number.isNaN(limitParam) ? 20 : limitParam, 50);

      span.setAttribute("history.before", before ?? "");
      span.setAttribute("history.limit", limit);

      const races = await getRaceHistory(before, limit);

      logger.emit({
        severityNumber: SeverityNumber.INFO,
        body: "Race history fetched",
        attributes: { count: races.length, limit },
      });

      const next_cursor =
        races.length === limit ? (races.at(-1)?.created_at ?? null) : null;

      res.json({ races, next_cursor });
    } catch (err) {
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        body: "history list error",
        attributes: { error: String(err) },
      });
      res.status(500).json({ error: "Failed to load race history" });
    } finally {
      span.end();
    }
  });
});

router.get("/races/:id", async (req, res) => {
  tracer.startActiveSpan("history.get", async (span) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: "Invalid race id" });
        return;
      }

      span.setAttribute("history.race_id", id);

      const race = await getRaceById(id);
      if (!race) {
        res.status(404).json({ error: "Race not found" });
        return;
      }

      const finish_order = [...race.participants]
        .sort((a, b) => a.position - b.position)
        .map((p) => p.racer_id);

      logger.emit({
        severityNumber: SeverityNumber.INFO,
        body: "Race detail fetched",
        attributes: { raceId: id, hasTicks: race.race_ticks !== null },
      });

      res.json({
        id: race.id,
        created_at: race.created_at,
        has_ticks: race.race_ticks !== null,
        ticks: race.race_ticks ?? null,
        finish_order,
        participants: race.participants,
      });
    } catch (err) {
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        body: "history get error",
        attributes: { error: String(err) },
      });
      res.status(500).json({ error: "Failed to load race" });
    } finally {
      span.end();
    }
  });
});

export default router;
