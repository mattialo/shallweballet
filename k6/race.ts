import http from "k6/http"
import { sleep } from "k6"
import type { Options } from "k6/options"

const BACKEND_URL = __ENV.BACKEND_URL || "http://localhost:3000"

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
] as const

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export const options: Options = {
  vus: 5,
  duration: "30s",
}

export default function race() {
  const count = Math.floor(Math.random() * 8) + 3 // 3–10 racers
  const racers = shuffle(ANIMAL_IDS)
    .slice(0, count)
    .map((id, lane) => ({ id, lane }))

  http.post(
    `${BACKEND_URL}/api/race`,
    JSON.stringify({ racers }),
    { headers: { "Content-Type": "application/json" } },
  )

  sleep(0.1) // 0.01s between races
}
