import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router"
import { CHARACTERS } from "@/lib/characters"
import { RaceScene } from "@/components/race/race-scene"
import { CountdownOverlay } from "@/components/race/countdown-overlay"
import { Scoreboard } from "@/components/race/scoreboard"
import { FinishModal } from "@/components/race/finish-modal"
import { type RacerSim } from "@/components/race/race-constants"
import { RaceProgressBar } from "@/components/race/race-progress-bar"
import { useRacePlayer } from "@/hooks/use-race-player"

export default function Race() {
  const location = useLocation()
  const navigate = useNavigate()
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
      }))
  )

  const ticksRef = useRef<Record<string, number>[]>([])
  const finishOrderRef = useRef<string[]>([])
  const runningRef = useRef(false)

  const { countdown, scoreboard, showModal, handleRaceOver } = useRacePlayer(
    simRef,
    ticksRef,
    runningRef
  )

  useEffect(() => {
    if (characterIds.length === 0) {
      navigate("/character-select", { replace: true })
      return
    }

    fetch(
      `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"}/api/race`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          racers: characterIds.map((id, i) => ({ id, lane: i })),
        }),
      }
    )
      .then((r) => r.json())
      .then(
        (data: { ticks: Record<string, number>[]; finishOrder: string[] }) => {
          ticksRef.current = data.ticks
          finishOrderRef.current = data.finishOrder
        }
      )
      .catch((err) => console.error("Failed to fetch race data:", err))
  }, [])

  if (characterIds.length === 0) return null

  return (
    <div className="h-svh w-screen overflow-hidden">
      <RaceScene
        simRef={simRef}
        runningRef={runningRef}
        onRaceOver={handleRaceOver}
        showModal={showModal}
      />
      {countdown !== null && <CountdownOverlay value={countdown} />}
      <Scoreboard scoreboard={scoreboard} />
      {countdown === null && !showModal && (
        <RaceProgressBar scoreboard={scoreboard} />
      )}
      {showModal && (
        <FinishModal
          scoreboard={scoreboard}
          finishOrder={finishOrderRef.current}
          onRaceAgain={() => navigate("/character-select")}
        />
      )}
    </div>
  )
}
