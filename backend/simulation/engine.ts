import { RACE_LENGTH, MIN_SPEED, MAX_SPEED, MAX_TICKS } from "../config";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { logger, tracer } from "../instrumentation";
import type { Racer, RaceResult } from "./types";

function randomSpeed(): number {
  return MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
}

export function simulateRace(racers: Racer[]): RaceResult {
  return tracer.startActiveSpan("race.simulate", (span) => {
    const startMs = Date.now();
    span.setAttribute("race.racer_count", racers.length);

    logger.emit({
      severityNumber: SeverityNumber.DEBUG,
      body: "Simulation started",
      attributes: { racerCount: racers.length },
    });

    const positions: Record<string, number> = {};
    const finished = new Set<string>();
    const finishOrder: string[] = [];
    const ticks: Array<Record<string, number>> = [];

    for (const r of racers) {
      positions[r.id] = 0;
    }

    for (let tick = 0; tick < MAX_TICKS; tick++) {
      const tickSpeeds: Record<string, number> = {};

      for (const r of racers) {
        if (finished.has(r.id)) continue;
        const speed = randomSpeed();
        tickSpeeds[r.id] = speed;
        const pos = (positions[r.id] ?? 0) + speed;
        positions[r.id] = pos;
        if (pos >= RACE_LENGTH) {
          finished.add(r.id);
          finishOrder.push(r.id);
        }
      }

      ticks.push(tickSpeeds);

      if (finished.size === racers.length) break;
    }

    const durationMs = Date.now() - startMs;
    span.setAttribute("race.winner", finishOrder[0] ?? "none");
    span.setAttribute("race.coffee_payer", finishOrder.at(-1) ?? "none");
    span.setAttribute("race.total_ticks", ticks.length);
    span.setAttribute("race.duration_ms", durationMs);

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      body: "Simulation ended",
      attributes: {
        racerCount: racers.length,
        durationMs,
        winner: finishOrder[0] ?? null,
        totalTicks: ticks.length,
      },
    });

    span.end();
    return { ticks, finishOrder };
  });
}
