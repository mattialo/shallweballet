import { Canvas } from "@react-three/fiber"
import { Suspense, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { useAuth } from "@clerk/clerk-react"
import { SpinningCharacter, StreakBadge } from "@/components/CharacterCard"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CHARACTERS } from "@/lib/characters"
import { rankTextClass } from "@/components/race/race-constants"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"

interface AnimalStats {
  racer_id: string
  total_races: number
  wins: number
  losses: number
  win_rate: number
  win_streak: number
  loss_streak: number
  current_win_streak: number
  current_loss_streak: number
}

interface StatsResponse {
  animals: AnimalStats[]
  luckiest: AnimalStats | null
  unluckiest: AnimalStats | null
  win_streak_holder: AnimalStats | null
  loss_streak_holder: AnimalStats | null
  total_races_run: number
}

function getCharacter(racerId: string) {
  return CHARACTERS.find((c) => c.id === racerId)
}

function HeroCard({
  label,
  animal,
  stat,
  headerClass,
  statClass,
}: {
  label: string
  animal: AnimalStats | null
  stat: string
  headerClass: string
  statClass: string
}) {
  const character = animal ? getCharacter(animal.racer_id) : null
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-background/80">
      <div
        className={`px-3 py-2 text-center text-xs font-semibold tracking-widest uppercase ${headerClass}`}
      >
        {label}
      </div>
      {character && animal ? (
        <>
          <div className="h-40 w-full bg-foreground/5">
            <Canvas camera={{ position: [0, 0, 3.5], fov: 55 }}>
              <ambientLight intensity={1.2} />
              <directionalLight position={[5, 10, 5]} intensity={1.5} />
              <Suspense fallback={null}>
                <SpinningCharacter
                  modelUrl={character.modelUrl}
                  animationName="walk"
                  frozen={false}
                />
              </Suspense>
            </Canvas>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 text-center">
            <p className="text-sm font-bold">{character.name}</p>
            <p className={`text-base font-semibold ${statClass}`}>{stat}</p>
          </div>
        </>
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-foreground/40">
          No data yet
        </div>
      )}
    </div>
  )
}

export default function Stats() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  async function loadStats() {
    const token = await getToken()
    fetch(`${BACKEND_URL}/api/stats`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: StatsResponse) => setStats(data))
      .catch((err) => setError(String(err)))
  }

  useEffect(() => {
    loadStats()
  }, [])

  async function handleReset() {
    if (!confirm("Reset all race history? This cannot be undone.")) return
    setResetting(true)
    try {
      const token = await getToken()
      const r = await fetch(`${BACKEND_URL}/api/stats`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setStats(null)
      loadStats()
    } catch (err) {
      setError(String(err))
    } finally {
      setResetting(false)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (stats.total_races_run === 0) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-5xl">🏁</p>
        <h2 className="text-2xl font-bold">No Races Yet</h2>
        <p className="text-foreground/60">
          Run some races to build the Hall of Fame.
        </p>
        <Button onClick={() => navigate("/character-select")}>
          Start Racing
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">Hall of Fame</h1>
          <span className="text-sm text-foreground/50">
            {stats.total_races_run} race{stats.total_races_run !== 1 ? "s" : ""}{" "}
            run
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-destructive hover:text-destructive"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? "Resetting…" : "Reset Stats"}
          </Button>
        </div>

        {/* Hero cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <HeroCard
            label="Luckiest Animal"
            animal={stats.luckiest}
            stat={
              stats.luckiest
                ? `${(stats.luckiest.win_rate * 100).toFixed(1)}% win rate`
                : ""
            }
            headerClass="bg-emerald-500/10 text-emerald-600"
            statClass="text-emerald-600"
          />
          <HeroCard
            label="Unluckiest Animal"
            animal={stats.unluckiest}
            stat={
              stats.unluckiest
                ? `${(stats.unluckiest.win_rate * 100).toFixed(1)}% win rate`
                : ""
            }
            headerClass="bg-rose-500/10 text-rose-600"
            statClass="text-rose-600"
          />
          <HeroCard
            label="Win Streak"
            animal={stats.win_streak_holder}
            stat={
              stats.win_streak_holder
                ? `${stats.win_streak_holder.win_streak} in a row`
                : ""
            }
            headerClass="bg-yellow-500/10 text-yellow-600"
            statClass="text-yellow-600"
          />
          <HeroCard
            label="Loss Streak"
            animal={stats.loss_streak_holder}
            stat={
              stats.loss_streak_holder
                ? `${stats.loss_streak_holder.loss_streak} in a row`
                : ""
            }
            headerClass="bg-sky-500/10 text-sky-600"
            statClass="text-sky-600"
          />
        </div>

        {/* Leaderboard */}
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-foreground/5 text-xs font-semibold tracking-widest text-foreground/50 uppercase">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Animal</th>
                <th className="px-4 py-3 text-center">Races</th>
                <th className="px-4 py-3 text-center">Wins</th>
                <th className="px-4 py-3 text-center">Losses</th>
                <th className="px-4 py-3 text-left">Win Rate</th>
                <th className="px-4 py-3 text-left">Participation</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const maxRaces = Math.max(
                  ...stats.animals.map((a) => a.total_races)
                )
                return stats.animals.map((animal, i) => {
                  const character = getCharacter(animal.racer_id)
                  const participationPct =
                    maxRaces > 0 ? (animal.total_races / maxRaces) * 100 : 0
                  return (
                    <tr
                      key={animal.racer_id}
                      className="border-b border-border/30 last:border-0 hover:bg-foreground/5"
                    >
                      <td
                        className={`px-4 py-3 font-bold ${rankTextClass(i + 1)}`}
                      >
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <TooltipProvider>
                          <span className="flex items-center gap-1.5">
                            {character?.name ?? animal.racer_id}
                            <StreakBadge
                              winStreak={animal.current_win_streak}
                              lossStreak={animal.current_loss_streak}
                            />
                          </span>
                        </TooltipProvider>
                      </td>
                      <td className="px-4 py-3 text-center text-foreground/60">
                        {animal.total_races}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground/60">
                        {animal.wins}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground/60">
                        {animal.losses}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`font-semibold ${animal.win_rate >= 0.5 ? "text-emerald-600" : "text-orange-500"}`}
                          >
                            {(animal.win_rate * 100).toFixed(1)}%
                          </span>
                          <div className="h-1.5 w-24 rounded-full bg-muted">
                            <div
                              className={`h-1.5 rounded-full transition-all ${animal.win_rate >= 0.5 ? "bg-emerald-500" : "bg-orange-400"}`}
                              style={{ width: `${animal.win_rate * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-semibold text-sky-500">
                            {participationPct.toFixed(1)}%
                          </span>
                          <div className="h-1.5 w-24 rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-sky-400 transition-all"
                              style={{ width: `${participationPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
