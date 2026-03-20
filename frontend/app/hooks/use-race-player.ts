import { useCallback, useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import {
  type RacerSim,
  SPEED_INTERVAL_MS,
} from "@/components/race/race-constants"

export function useRacePlayer(
  simRef: RefObject<RacerSim[]>,
  ticksRef: RefObject<Record<string, number>[]>,
  runningRef: RefObject<boolean>
) {
  const currentTickRef = useRef(0)
  const [countdown, setCountdown] = useState<number | "GO!" | null>(3)
  const [scoreboard, setScoreboard] = useState<RacerSim[]>(() => [
    ...simRef.current,
  ])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const scoreboardInterval = setInterval(() => {
      setScoreboard(simRef.current.map((r) => ({ ...r })))
    }, 200)
    return () => clearInterval(scoreboardInterval)
  }, [])

  useEffect(() => {
    const speedInterval = setInterval(() => {
      if (!runningRef.current) return
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
    return () => clearInterval(speedInterval)
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
    const timerId = setTimeout(tick, 1000)
    return () => clearTimeout(timerId)
  }, [])

  const handleRaceOver = useCallback(() => {
    setTimeout(() => setShowModal(true), 3000)
  }, [])

  return { countdown, scoreboard, showModal, handleRaceOver }
}
