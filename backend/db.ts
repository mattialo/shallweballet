import { sql } from "bun";
import type { Racer } from "./simulation/types";

export async function initDB(retries = 10, delayMs = 2000) {
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
      console.warn(
        `DB not ready, retrying in ${delayMs}ms... (${i + 1}/${retries})`,
      );
      await Bun.sleep(delayMs);
    }
  }
}

export async function saveRace(
  racers: Racer[],
  finishOrder: string[],
  ticks: Array<Record<string, number>>,
) {
  const [{ id: raceId }] =
    await sql`INSERT INTO races (race_ticks) VALUES (${JSON.stringify(ticks)}) RETURNING id`;

  const participants = racers.map((racer) => ({
    race_id: raceId,
    racer_id: racer.id,
    lane: racer.lane,
    position: finishOrder.indexOf(racer.id) + 1,
  }));

  await sql`INSERT INTO race_participants ${sql(participants)}`;
}

export async function getRaceHistory(before?: string, limit = 20) {
  return sql`
    SELECT r.id, r.created_at, r.race_ticks IS NOT NULL AS has_ticks,
      json_agg(json_build_object('racer_id', rp.racer_id, 'position', rp.position, 'lane', rp.lane)
        ORDER BY rp.position ASC) AS participants
    FROM races r
    JOIN race_participants rp ON rp.race_id = r.id
    WHERE (${before ?? null}::text IS NULL OR r.created_at < ${before ?? null}::timestamptz)
    GROUP BY r.id ORDER BY r.created_at DESC LIMIT ${limit}
  ` as unknown as Promise<
    Array<{
      id: number;
      created_at: string;
      has_ticks: boolean;
      participants: Array<{ racer_id: string; position: number; lane: number }>;
    }>
  >;
}

export async function getRaceById(id: number) {
  const rows = (await sql`
    SELECT r.id, r.created_at, r.race_ticks,
      json_agg(json_build_object('racer_id', rp.racer_id, 'position', rp.position, 'lane', rp.lane)
        ORDER BY rp.position ASC) AS participants
    FROM races r
    JOIN race_participants rp ON rp.race_id = r.id
    WHERE r.id = ${id}
    GROUP BY r.id
  `) as unknown as Array<{
    id: number;
    created_at: string;
    race_ticks: Array<Record<string, number>> | null;
    participants: Array<{ racer_id: string; position: number; lane: number }>;
  }>;
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    race_ticks:
      typeof row.race_ticks === "string"
        ? JSON.parse(row.race_ticks)
        : row.race_ticks,
  };
}
