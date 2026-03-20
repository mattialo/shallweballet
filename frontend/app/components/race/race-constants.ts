// ---- Constants ----
export const RACE_LENGTH = 1500
export const MIN_SPEED = 50
export const MAX_SPEED = 100
export const SPEED_INTERVAL_MS = 1_000
export const TRACK_DISPLAY = 100
export const LANE_GAP = 1.125

export const LANE_COLORS = [
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#1abc9c",
  "#e91e63",
  "#ff5722",
  "#607d8b",
]

// ---- Types ----
export interface RacerSim {
  id: string
  name: string
  modelUrl: string
  position: number
  speed: number
  rank: number | null
  lane: number
}

// ---- Helpers ----
export function zOf(i: number, n: number): number {
  return (i - (n - 1) / 2) * LANE_GAP
}

export function rankTextClass(rank: number | null): string {
  if (rank === 1) return "text-yellow-500"
  if (rank === 2) return "text-slate-400"
  if (rank === 3) return "text-amber-600"
  return "text-muted-foreground"
}

export function rankText(rank: number): string {
  if (rank === 1) return "🥇 1st"
  if (rank === 2) return "🥈 2nd"
  if (rank === 3) return "🥉 3rd"
  return `${rank}th`
}
