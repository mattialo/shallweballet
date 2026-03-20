import { Router } from "express";
import { sql } from "bun";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { logger } from "../instrumentation";

const ANIMAL_IDS = [
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
  "animal-tiger",
];

interface AnimalStats {
  racer_id: string;
  total_races: number;
  wins: number;
  losses: number;
  win_rate: number;
  win_streak: number;
  loss_streak: number;
  current_win_streak: number;
  current_loss_streak: number;
}

function findBy<K extends keyof AnimalStats>(
  animals: AnimalStats[],
  key: K,
  order: "max" | "min",
): AnimalStats | null {
  if (animals.length === 0) return null;
  return animals.reduce((acc, a) => {
    if (order === "max") return a[key] > acc[key] ? a : acc;
    return a[key] < acc[key] ? a : acc;
  }, animals[0]!);
}

function racerStreaks(races: Array<{ position: number; max_pos: number }>): {
  win_streak: number;
  loss_streak: number;
  current_win_streak: number;
  current_loss_streak: number;
} {
  let currentWin = 0,
    currentLoss = 0,
    maxWin = 0,
    maxLoss = 0;
  for (const { position, max_pos } of races) {
    const won = position < max_pos;
    currentWin = won ? currentWin + 1 : 0;
    currentLoss = won ? 0 : currentLoss + 1;
    maxWin = Math.max(maxWin, currentWin);
    maxLoss = Math.max(maxLoss, currentLoss);
  }
  return {
    win_streak: maxWin,
    loss_streak: maxLoss,
    current_win_streak: currentWin,
    current_loss_streak: currentLoss,
  };
}

function computeStreaks(
  history: Array<{ racer_id: string; position: number; max_pos: number }>,
): Record<
  string,
  {
    win_streak: number;
    loss_streak: number;
    current_win_streak: number;
    current_loss_streak: number;
  }
> {
  const grouped: Record<string, { position: number; max_pos: number }[]> = {};
  for (const row of history) {
    grouped[row.racer_id] ??= [];
    grouped[row.racer_id]!.push({
      position: row.position,
      max_pos: row.max_pos,
    });
  }
  return Object.fromEntries(
    Object.entries(grouped).map(([id, races]) => [id, racerStreaks(races)]),
  );
}

function buildAggMap(
  aggregates: Array<{
    racer_id: string;
    total_races: number;
    wins: number;
    losses: number;
  }>,
): Record<string, { total_races: number; wins: number; losses: number }> {
  const aggMap: Record<
    string,
    { total_races: number; wins: number; losses: number }
  > = {};
  for (const row of aggregates) {
    aggMap[row.racer_id] = {
      total_races: row.total_races,
      wins: row.wins,
      losses: row.losses,
    };
  }
  return aggMap;
}

const router = Router();

router.delete("/stats", async (_req, res) => {
  try {
    await sql`DELETE FROM race_participants`;
    await sql`DELETE FROM races`;
    logger.emit({
      severityNumber: SeverityNumber.INFO,
      body: "stats reset: all races deleted",
    });
    res.json({ ok: true });
  } catch (err) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: "stats reset error",
      attributes: { error: String(err) },
    });
    res.status(500).json({ error: "Failed to reset stats" });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const aggregates = (await sql`
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
    `) as unknown as Array<{
      racer_id: string;
      total_races: number;
      wins: number;
      losses: number;
    }>;

    const history = (await sql`
      SELECT rp.racer_id, rp.position, race_max.max_pos
      FROM race_participants rp
      JOIN races r ON rp.race_id = r.id
      JOIN (
        SELECT race_id, MAX(position) AS max_pos
        FROM race_participants GROUP BY race_id
      ) race_max ON rp.race_id = race_max.race_id
      ORDER BY rp.racer_id, r.created_at ASC
    `) as unknown as Array<{
      racer_id: string;
      position: number;
      max_pos: number;
    }>;

    const streaks = computeStreaks(history);
    const aggMap = buildAggMap(aggregates);

    // Merge all 15 animals
    const animals: AnimalStats[] = ANIMAL_IDS.map((id) => {
      const agg = aggMap[id];
      const streak = streaks[id];
      if (!agg) {
        return {
          racer_id: id,
          total_races: 0,
          wins: 0,
          losses: 0,
          win_rate: 0,
          win_streak: 0,
          loss_streak: 0,
          current_win_streak: 0,
          current_loss_streak: 0,
        };
      }
      return {
        racer_id: id,
        total_races: agg.total_races,
        wins: agg.wins,
        losses: agg.losses,
        win_rate: agg.total_races > 0 ? agg.wins / agg.total_races : 0,
        win_streak: streak?.win_streak ?? 0,
        loss_streak: streak?.loss_streak ?? 0,
        current_win_streak: streak?.current_win_streak ?? 0,
        current_loss_streak: streak?.current_loss_streak ?? 0,
      };
    });

    animals.sort((a, b) => b.win_rate - a.win_rate);

    const raced = animals.filter((a) => a.total_races >= 1);
    const luckiest = findBy(raced, "win_rate", "max");
    const unluckiest = findBy(raced, "win_rate", "min");
    const win_streak_holder = findBy(raced, "win_streak", "max");
    const loss_streak_holder = findBy(raced, "loss_streak", "max");

    const totalResult = (await sql`
      SELECT COUNT(*)::int AS total_races_run FROM races
    `) as unknown as Array<{ total_races_run: number }>;
    const total_races_run = totalResult[0]?.total_races_run ?? 0;

    res.json({
      animals,
      luckiest,
      unluckiest,
      win_streak_holder,
      loss_streak_holder,
      total_races_run,
    });
  } catch (err) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: "stats error",
      attributes: { error: String(err) },
    });
    res.status(500).json({ error: "Failed to load stats" });
  }
});

export default router;
