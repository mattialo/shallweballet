import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { CHARACTERS } from "@/lib/characters"
import { RaceScene } from "@/components/race/race-scene"
import { CountdownOverlay } from "@/components/race/countdown-overlay"
import { Scoreboard } from "@/components/race/scoreboard"
import { FinishModal } from "@/components/race/finish-modal"
import { type RacerSim, SPEED_INTERVAL_MS } from "@/components/race/race-constants"
import { RaceProgressBar } from "@/components/race/race-progress-bar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"

interface RaceDetail {
  id: number
  created_at: string
  has_ticks: boolean
  ticks: Array<Record<string, number>> | null
  finish_order: string[]
  participants: Array<{ racer_id: string; position: number; lane: number }>
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"]

export default function RaceReplay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [raceData, setRaceData] = useState<RaceDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/races/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: RaceDetail) => setRaceData(data))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Card className="w-80">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-9 w-28 rounded-md" />
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Card className="w-80">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => navigate("/races")}>
              ← Back to History
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!raceData) return null

  if (!raceData.has_ticks) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Race #{raceData.id} Result</CardTitle>
            <p className="text-sm text-muted-foreground">Replay data not available for this race.</p>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <ol className="space-y-2">
              {raceData.finish_order.map((racerId, i) => {
                const character = CHARACTERS.find((c) => c.id === racerId)
                return (
                  <li key={racerId} className="flex items-center gap-3">
                    <Badge variant={i === 0 ? "default" : "secondary"} className="w-8 justify-center">
                      {RANK_MEDALS[i] ?? `${i + 1}`}
                    </Badge>
                    <span className="text-sm font-medium">{character?.name ?? racerId}</span>
                  </li>
                )
              })}
            </ol>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate("/races")}>
              ← Back to History
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <ReplayPlayer raceData={raceData} />
}

function ReplayPlayer({ raceData }: { raceData: RaceDetail }) {
  const navigate = useNavigate()

  const simRef = useRef<RacerSim[]>(
    raceData.participants
      .map((p): RacerSim | null => {
        const character = CHARACTERS.find((c) => c.id === p.racer_id)
        if (!character) return null
        return {
          id: character.id,
          name: character.name,
          modelUrl: character.modelUrl,
          position: 0,
          speed: 0,
          rank: null,
          lane: p.lane,
        }
      })
      .filter((r): r is RacerSim => r !== null),
  )

  const ticksRef = useRef<Record<string, number>[]>(raceData.ticks ?? [])
  const finishOrderRef = useRef<string[]>(raceData.finish_order)
  const currentTickRef = useRef(0)
  const runningRef = useRef(false)

  const [countdown, setCountdown] = useState<number | "GO!" | null>(3)
  const [scoreboard, setScoreboard] = useState<RacerSim[]>(() => [...simRef.current])
  const [showModal, setShowModal] = useState(false)
  const [raceStarted, setRaceStarted] = useState(false)

  useEffect(() => {
    const scoreboardInterval = setInterval(() => {
      setScoreboard(simRef.current.map((r) => ({ ...r })))
    }, 200)
    return () => clearInterval(scoreboardInterval)
  }, [])

  useEffect(() => {
    const steps: Array<number | "GO!" | null> = [3, 2, 1, "GO!", null]
    let i = 0
    const tick = () => {
      i++
      setCountdown(steps[i])
      if (steps[i] === null) {
        runningRef.current = true
        setRaceStarted(true)
      } else if (steps[i] === "GO!") {
        setTimeout(tick, 600)
      } else {
        setTimeout(tick, 1000)
      }
    }
    const timerId = setTimeout(tick, 1000)
    return () => clearTimeout(timerId)
  }, [])

  useEffect(() => {
    if (!raceStarted) return

    const applyTick = () => {
      const tickSpeeds = ticksRef.current[currentTickRef.current]
      if (!tickSpeeds) return

      for (const racer of simRef.current) {
        if (racer.rank !== null) continue
        const speed = tickSpeeds[racer.id]
        if (speed !== undefined) {
          racer.speed = speed
        }
      }

      currentTickRef.current++
    }

    applyTick()
    const speedInterval = setInterval(applyTick, SPEED_INTERVAL_MS)
    return () => clearInterval(speedInterval)
  }, [raceStarted])

  const handleRaceOver = useCallback(() => {
    setTimeout(() => setShowModal(true), 3000)
  }, [])

  return (
    <div className="h-svh w-screen overflow-hidden">
      <RaceScene simRef={simRef} runningRef={runningRef} onRaceOver={handleRaceOver} showModal={showModal} />
      {countdown !== null && <CountdownOverlay value={countdown} />}
      <Scoreboard scoreboard={scoreboard} />
      {countdown === null && !showModal && <RaceProgressBar scoreboard={scoreboard} />}
      {showModal && (
        <FinishModal
          scoreboard={scoreboard}
          finishOrder={finishOrderRef.current}
          onRaceAgain={() => navigate("/races")}
        />
      )}
    </div>
  )
}
