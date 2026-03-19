"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => handler
});
module.exports = __toCommonJS(index_exports);

// instrumentation.ts
var import_sdk_node = require("@opentelemetry/sdk-node");
var import_api = require("@opentelemetry/api");
var import_api_logs = require("@opentelemetry/api-logs");
var import_exporter_trace_otlp_http = require("@opentelemetry/exporter-trace-otlp-http");
var import_exporter_logs_otlp_http = require("@opentelemetry/exporter-logs-otlp-http");
var import_sdk_logs = require("@opentelemetry/sdk-logs");
var import_instrumentation_express = require("@opentelemetry/instrumentation-express");
var import_instrumentation_http = require("@opentelemetry/instrumentation-http");
var serviceName = process.env.OTEL_SERVICE_NAME ?? "pi-demo-backend";
var otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";
var sdk = new import_sdk_node.NodeSDK({
  serviceName,
  traceExporter: new import_exporter_trace_otlp_http.OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`
  }),
  logRecordProcessors: [
    new import_sdk_logs.SimpleLogRecordProcessor(
      new import_exporter_logs_otlp_http.OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` })
    )
  ],
  instrumentations: [new import_instrumentation_http.HttpInstrumentation(), new import_instrumentation_express.ExpressInstrumentation()]
});
sdk.start();
process.on("SIGTERM", () => sdk.shutdown());
process.on("SIGINT", () => sdk.shutdown());
var logger = import_api_logs.logs.getLogger(serviceName);
var tracer = import_api.trace.getTracer(serviceName);

// db.ts
var import_postgres = __toESM(require("postgres"));
var sql = (0, import_postgres.default)(process.env.DATABASE_URL ?? "postgres://localhost:5432/pi_demo", {
  ssl: process.env.DATABASE_URL ? "require" : false
});
async function initDB(retries = 10, delayMs = 2e3) {
  for (let i = 0; i < retries; i++) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS races (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS race_participants (
          id SERIAL PRIMARY KEY,
          race_id INT NOT NULL REFERENCES races(id),
          racer_id TEXT NOT NULL,
          lane INT NOT NULL,
          position INT NOT NULL
        )
      `;
      await sql`ALTER TABLE races ADD COLUMN IF NOT EXISTS race_ticks JSONB`;
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`DB not ready, retrying in ${delayMs}ms... (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
async function saveRace(racers, finishOrder, ticks) {
  const result = await sql`INSERT INTO races (race_ticks) VALUES (${JSON.stringify(ticks)}::jsonb) RETURNING id`;
  const raceId = result[0].id;
  const participants = racers.map((racer) => ({
    race_id: raceId,
    racer_id: racer.id,
    lane: racer.lane,
    position: finishOrder.indexOf(racer.id) + 1
  }));
  await sql`INSERT INTO race_participants ${sql(participants)}`;
}
async function getRaceHistory(before, limit = 20) {
  return sql`
    SELECT r.id, r.created_at, r.race_ticks IS NOT NULL AS has_ticks,
      json_agg(json_build_object('racer_id', rp.racer_id, 'position', rp.position, 'lane', rp.lane)
        ORDER BY rp.position ASC) AS participants
    FROM races r
    JOIN race_participants rp ON rp.race_id = r.id
    WHERE (${before ?? null}::text IS NULL OR r.created_at < ${before ?? null}::timestamptz)
    GROUP BY r.id ORDER BY r.created_at DESC LIMIT ${limit}
  `;
}
async function getRaceById(id) {
  const rows = await sql`
    SELECT r.id, r.created_at, r.race_ticks,
      json_agg(json_build_object('racer_id', rp.racer_id, 'position', rp.position, 'lane', rp.lane)
        ORDER BY rp.position ASC) AS participants
    FROM races r
    JOIN race_participants rp ON rp.race_id = r.id
    WHERE r.id = ${id}
    GROUP BY r.id
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    race_ticks: typeof row.race_ticks === "string" ? JSON.parse(row.race_ticks) : row.race_ticks
  };
}

// app.ts
var import_express5 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));

// config.ts
var PORT = Number.parseInt(process.env.PORT ?? "3000");
var CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
var RACE_LENGTH = 1500;
var MIN_SPEED = 50;
var MAX_SPEED = 100;
var MAX_TICKS = 100;

// routes/status.ts
var import_express = require("express");
var import_api_logs2 = require("@opentelemetry/api-logs");
var router = (0, import_express.Router)();
router.get("/status", (_req, res) => {
  logger.emit({ severityNumber: import_api_logs2.SeverityNumber.DEBUG, body: "Status check" });
  res.json({ status: "OK" });
});
var status_default = router;

// routes/race.ts
var import_express2 = require("express");
var import_api_logs4 = require("@opentelemetry/api-logs");

// simulation/engine.ts
var import_api_logs3 = require("@opentelemetry/api-logs");
function randomSpeed() {
  return MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
}
function simulateRace(racers) {
  return tracer.startActiveSpan("race.simulate", (span) => {
    const startMs = Date.now();
    span.setAttribute("race.racer_count", racers.length);
    logger.emit({
      severityNumber: import_api_logs3.SeverityNumber.DEBUG,
      body: "Simulation started",
      attributes: { racerCount: racers.length }
    });
    const positions = {};
    const finished = /* @__PURE__ */ new Set();
    const finishOrder = [];
    const ticks = [];
    for (const r of racers) {
      positions[r.id] = 0;
    }
    for (let tick = 0; tick < MAX_TICKS; tick++) {
      const tickSpeeds = {};
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
      severityNumber: import_api_logs3.SeverityNumber.INFO,
      body: "Simulation ended",
      attributes: {
        racerCount: racers.length,
        durationMs,
        winner: finishOrder[0] ?? null,
        totalTicks: ticks.length
      }
    });
    span.end();
    return { ticks, finishOrder };
  });
}

// routes/race.ts
var router2 = (0, import_express2.Router)();
router2.post("/race", (req, res) => {
  const { racers } = req.body;
  tracer.startActiveSpan("race.handle", (span) => {
    span.setAttribute("race.racer_count", racers.length);
    logger.emit({
      severityNumber: import_api_logs4.SeverityNumber.INFO,
      body: "Race request received",
      attributes: { racerCount: racers.length }
    });
    const result = simulateRace(racers);
    span.setAttribute("race.tick_count", result.ticks.length);
    span.setAttribute("race.winner", result.finishOrder[0] ?? "none");
    span.setAttribute("race.finish_order", result.finishOrder.join(","));
    logger.emit({
      severityNumber: import_api_logs4.SeverityNumber.INFO,
      body: "Race completed",
      attributes: {
        racerCount: racers.length,
        tickCount: result.ticks.length,
        winner: result.finishOrder[0] ?? null,
        finishOrder: result.finishOrder.join(",")
      }
    });
    span.end();
    res.json(result);
    saveRace(racers, result.finishOrder, result.ticks).catch(
      (err) => console.error("saveRace failed:", err)
    );
  });
});
var race_default = router2;

// routes/stats.ts
var import_express3 = require("express");
var ANIMAL_IDS = [
  "animal-bunny",
  "animal-cat",
  "animal-caterpillar",
  "animal-chick",
  "animal-cow",
  "animal-dog",
  "animal-elephant",
  "animal-fish",
  "animal-giraffe",
  "animal-hog",
  "animal-lion",
  "animal-monkey",
  "animal-parrot",
  "animal-pig",
  "animal-tiger"
];
var router3 = (0, import_express3.Router)();
router3.get("/stats", async (_req, res) => {
  try {
    const aggregates = await sql`
      SELECT
        rp.racer_id,
        COUNT(*)::int AS total_races,
        COUNT(*) FILTER (WHERE rp.position < race_max.max_pos)::int AS wins,
        COUNT(*) FILTER (WHERE rp.position = race_max.max_pos)::int AS losses
      FROM race_participants rp
      JOIN (
        SELECT race_id, MAX(position) AS max_pos
        FROM race_participants GROUP BY race_id
      ) race_max ON rp.race_id = race_max.race_id
      GROUP BY rp.racer_id
    `;
    const history = await sql`
      SELECT rp.racer_id, rp.position, race_max.max_pos
      FROM race_participants rp
      JOIN races r ON rp.race_id = r.id
      JOIN (
        SELECT race_id, MAX(position) AS max_pos
        FROM race_participants GROUP BY race_id
      ) race_max ON rp.race_id = race_max.race_id
      ORDER BY rp.racer_id, r.created_at ASC
    `;
    const streaks = {};
    const grouped = {};
    for (const row of history) {
      if (!grouped[row.racer_id]) grouped[row.racer_id] = [];
      grouped[row.racer_id].push({ position: row.position, max_pos: row.max_pos });
    }
    for (const [racerId, races] of Object.entries(grouped)) {
      let currentWin = 0, currentLoss = 0, maxWin = 0, maxLoss = 0;
      for (const { position, max_pos } of races) {
        const isWin = position < max_pos;
        if (isWin) {
          currentWin++;
          currentLoss = 0;
          if (currentWin > maxWin) maxWin = currentWin;
        } else {
          currentLoss++;
          currentWin = 0;
          if (currentLoss > maxLoss) maxLoss = currentLoss;
        }
      }
      streaks[racerId] = { win_streak: maxWin, loss_streak: maxLoss };
    }
    const aggMap = {};
    for (const row of aggregates) {
      aggMap[row.racer_id] = {
        total_races: row.total_races,
        wins: row.wins,
        losses: row.losses
      };
    }
    const animals = ANIMAL_IDS.map((id) => {
      const agg = aggMap[id];
      const streak = streaks[id];
      if (!agg) {
        return { racer_id: id, total_races: 0, wins: 0, losses: 0, win_rate: 0, win_streak: 0, loss_streak: 0 };
      }
      return {
        racer_id: id,
        total_races: agg.total_races,
        wins: agg.wins,
        losses: agg.losses,
        win_rate: agg.total_races > 0 ? agg.wins / agg.total_races : 0,
        win_streak: streak?.win_streak ?? 0,
        loss_streak: streak?.loss_streak ?? 0
      };
    });
    animals.sort((a, b) => b.win_rate - a.win_rate);
    const raced = animals.filter((a) => a.total_races >= 1);
    const luckiest = raced.length > 0 ? raced.reduce((best, a) => a.win_rate > best.win_rate ? a : best) : null;
    const unluckiest = raced.length > 0 ? raced.reduce((worst, a) => a.win_rate < worst.win_rate ? a : worst) : null;
    const win_streak_holder = raced.length > 0 ? raced.reduce((best, a) => a.win_streak > best.win_streak ? a : best) : null;
    const loss_streak_holder = raced.length > 0 ? raced.reduce((worst, a) => a.loss_streak > worst.loss_streak ? a : worst) : null;
    const totalResult = await sql`
      SELECT COUNT(*)::int AS total_races_run FROM races
    `;
    const total_races_run = totalResult[0]?.total_races_run ?? 0;
    res.json({ animals, luckiest, unluckiest, win_streak_holder, loss_streak_holder, total_races_run });
  } catch (err) {
    console.error("stats error:", err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});
var stats_default = router3;

// routes/history.ts
var import_express4 = require("express");
var import_api_logs5 = require("@opentelemetry/api-logs");
var router4 = (0, import_express4.Router)();
router4.get("/races", async (req, res) => {
  tracer.startActiveSpan("history.list", async (span) => {
    try {
      const before = typeof req.query.before === "string" ? req.query.before : void 0;
      const limitParam = parseInt(String(req.query.limit ?? "20"), 10);
      const limit = Math.min(isNaN(limitParam) ? 20 : limitParam, 50);
      span.setAttribute("history.before", before ?? "");
      span.setAttribute("history.limit", limit);
      const races = await getRaceHistory(before, limit);
      logger.emit({
        severityNumber: import_api_logs5.SeverityNumber.INFO,
        body: "Race history fetched",
        attributes: { count: races.length, limit }
      });
      const next_cursor = races.length === limit ? races[races.length - 1]?.created_at ?? null : null;
      span.end();
      res.json({ races, next_cursor });
    } catch (err) {
      span.end();
      console.error("history list error:", err);
      res.status(500).json({ error: "Failed to load race history" });
    }
  });
});
router4.get("/races/:id", async (req, res) => {
  tracer.startActiveSpan("history.get", async (span) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        span.end();
        res.status(400).json({ error: "Invalid race id" });
        return;
      }
      span.setAttribute("history.race_id", id);
      const race = await getRaceById(id);
      if (!race) {
        span.end();
        res.status(404).json({ error: "Race not found" });
        return;
      }
      const finish_order = [...race.participants].sort((a, b) => a.position - b.position).map((p) => p.racer_id);
      logger.emit({
        severityNumber: import_api_logs5.SeverityNumber.INFO,
        body: "Race detail fetched",
        attributes: { raceId: id, hasTicks: race.race_ticks !== null }
      });
      span.end();
      res.json({
        id: race.id,
        created_at: race.created_at,
        has_ticks: race.race_ticks !== null,
        ticks: race.race_ticks ?? null,
        finish_order,
        participants: race.participants
      });
    } catch (err) {
      span.end();
      console.error("history get error:", err);
      res.status(500).json({ error: "Failed to load race" });
    }
  });
});
var history_default = router4;

// app.ts
var app = (0, import_express5.default)();
app.use((0, import_cors.default)({ origin: CORS_ORIGIN }));
app.use(import_express5.default.json());
app.use("/api", status_default);
app.use("/api", race_default);
app.use("/api", stats_default);
app.use("/api", history_default);
var app_default = app;

// api/index.ts
var dbReady = null;
function ensureDB() {
  if (!dbReady) dbReady = initDB(3, 1e3);
  return dbReady;
}
async function handler(req, res) {
  await ensureDB();
  app_default(req, res);
}
