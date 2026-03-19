import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { useAuth, SignedIn, SignedOut, SignIn } from "@clerk/clerk-react"
import { CHARACTERS } from "@/lib/characters"
import { RaceScene } from "@/components/race/race-scene"
import { CountdownOverlay } from "@/components/race/countdown-overlay"
import { Scoreboard } from "@/components/race/scoreboard"
import { FinishModal } from "@/components/race/finish-modal"
import { type RacerSim, SPEED_INTERVAL_MS } from "@/components/race/race-constants"
import { RaceProgressBar } from "@/components/race/race-progress-bar"

export default function Race() {
  const location = useLocation()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const state = (location.state ?? {}) as { characterIds?: string[] }
  const characterIds = state.characterIds ?? []

  const simRef = useRef<RacerSim[]>(
    characterIds
      .map((id) => CHARACTERS.find((c) => c.id === id))
      .filter((c): c is (typeof CHARACTERS)[0] => c !== undefined)
      .map((c, i) => ({
        id: c.id,
        name: c.name,
        modelUrl: c.modelUrl,
        position: 0,
        speed: 0,
        rank: null,
        lane: i,
      })),
  )

  const ticksRef = useRef<Record<string, number>[]>([])
  const finishOrderRef = useRef<string[]>([])
  const currentTickRef = useRef(0)

  const runningRef = useRef(false)
  const [countdown, setCountdown] = useState<number | "GO!" | null>(3)
  const [scoreboard, setScoreboard] = useState<RacerSim[]>(() => [...simRef.current])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (characterIds.length === 0) {
      navigate("/character-select", { replace: true })
      return
    }

    getToken().then((token) =>
    fetch(`${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"}/api/race`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        racers: characterIds.map((id, i) => ({ id, lane: i })),
      }),
    }))
      .then((r) => r.json())
      .then((data: { ticks: Record<string, number>[]; finishOrder: string[] }) => {
        ticksRef.current = data.ticks
        finishOrderRef.current = data.finishOrder
      })
      .catch((err) => console.error("Failed to fetch race data:", err))

    const scoreboardInterval = setInterval(() => {
      setScoreboard(simRef.current.map((r) => ({ ...r })))
    }, 200)

    const speedInterval = setInterval(() => {
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
    }, SPEED_INTERVAL_MS)

    return () => {
      clearInterval(scoreboardInterval)
      clearInterval(speedInterval)
    }
  }, [])

  useEffect(() => {
    const steps: Array<number | "GO!" | null> = [3, 2, 1, "GO!", null]
    let i = 0
    const tick = () => {
      i++
      setCountdown(steps[i])
      if (steps[i] === null) {
        runningRef.current = true
      } else if (steps[i] === "GO!") {
        setTimeout(tick, 600)
      } else {
        setTimeout(tick, 1000)
      }
    }
    const id = setTimeout(tick, 1000)
    return () => clearTimeout(id)
  }, [])

  const handleRaceOver = useCallback(() => {
    setTimeout(() => setShowModal(true), 3000)
  }, [])

  if (characterIds.length === 0) return null

  return (
    <>
    <SignedOut>
      <div className="flex min-h-svh items-center justify-center">
        <SignIn routing="hash" />
      </div>
    </SignedOut>
    <SignedIn>
    <div className="h-svh w-screen overflow-hidden">
      <RaceScene simRef={simRef} runningRef={runningRef} onRaceOver={handleRaceOver} showModal={showModal} />
      {countdown !== null && <CountdownOverlay value={countdown} />}
      <Scoreboard scoreboard={scoreboard} />
      {countdown === null && !showModal && <RaceProgressBar scoreboard={scoreboard} />}
      {showModal && (
        <FinishModal
          scoreboard={scoreboard}
          finishOrder={finishOrderRef.current}
          onRaceAgain={() => navigate("/character-select")}
        />
      )}
    </div>
    </SignedIn>
    </>
  )
}
