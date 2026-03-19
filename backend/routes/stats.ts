import { Router } from "express"
import { sql } from "../db"

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
]

interface AnimalStats {
  racer_id: string
  total_races: number
  wins: number
  losses: number
  win_rate: number
  win_streak: number
  loss_streak: number
}

const router = Router()

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
    `) as unknown as Array<{ racer_id: string; total_races: number; wins: number; losses: number }>

    const history = (await sql`
      SELECT rp.racer_id, rp.position, race_max.max_pos
      FROM race_participants rp
      JOIN races r ON rp.race_id = r.id
      JOIN (
        SELECT race_id, MAX(position) AS max_pos
        FROM race_participants GROUP BY race_id
      ) race_max ON rp.race_id = race_max.race_id
      ORDER BY rp.racer_id, r.created_at ASC
    `) as unknown as Array<{ racer_id: string; position: number; max_pos: number }>

    // Compute streaks per animal
    const streaks: Record<string, { win_streak: number; loss_streak: number }> = {}
    const grouped: Record<string, { position: number; max_pos: number }[]> = {}
    for (const row of history) {
      if (!grouped[row.racer_id]) grouped[row.racer_id] = []
      grouped[row.racer_id]!.push({ position: row.position, max_pos: row.max_pos })
    }
    for (const [racerId, races] of Object.entries(grouped)) {
      let currentWin = 0, currentLoss = 0, maxWin = 0, maxLoss = 0
      for (const { position, max_pos } of races) {
        const isWin = position < max_pos
        if (isWin) {
          currentWin++
          currentLoss = 0
          if (currentWin > maxWin) maxWin = currentWin
        } else {
          currentLoss++
          currentWin = 0
          if (currentLoss > maxLoss) maxLoss = currentLoss
        }
      }
      streaks[racerId] = { win_streak: maxWin, loss_streak: maxLoss }
    }

    // Build aggregate map
    const aggMap: Record<string, { total_races: number; wins: number; losses: number }> = {}
    for (const row of aggregates) {
      aggMap[row.racer_id] = {
        total_races: row.total_races,
        wins: row.wins,
        losses: row.losses,
      }
    }

    // Merge all 15 animals
    const animals: AnimalStats[] = ANIMAL_IDS.map((id) => {
      const agg = aggMap[id]
      const streak = streaks[id]
      if (!agg) {
        return { racer_id: id, total_races: 0, wins: 0, losses: 0, win_rate: 0, win_streak: 0, loss_streak: 0 }
      }
      return {
        racer_id: id,
        total_races: agg.total_races,
        wins: agg.wins,
        losses: agg.losses,
        win_rate: agg.total_races > 0 ? agg.wins / agg.total_races : 0,
        win_streak: streak?.win_streak ?? 0,
        loss_streak: streak?.loss_streak ?? 0,
      }
    })

    animals.sort((a, b) => b.win_rate - a.win_rate)

    const raced = animals.filter((a) => a.total_races >= 1)
    const luckiest = raced.length > 0 ? raced.reduce((best, a) => a.win_rate > best.win_rate ? a : best) : null
    const unluckiest = raced.length > 0 ? raced.reduce((worst, a) => a.win_rate < worst.win_rate ? a : worst) : null
    const win_streak_holder = raced.length > 0 ? raced.reduce((best, a) => a.win_streak > best.win_streak ? a : best) : null
    const loss_streak_holder = raced.length > 0 ? raced.reduce((worst, a) => a.loss_streak > worst.loss_streak ? a : worst) : null

    const totalResult = (await sql`
      SELECT COUNT(*)::int AS total_races_run FROM races
    `) as unknown as Array<{ total_races_run: number }>
    const total_races_run = totalResult[0]?.total_races_run ?? 0

    res.json({ animals, luckiest, unluckiest, win_streak_holder, loss_streak_holder, total_races_run })
  } catch (err) {
    console.error("stats error:", err)
    res.status(500).json({ error: "Failed to load stats" })
  }
})

export default router
