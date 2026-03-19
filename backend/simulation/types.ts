export interface Racer {
  id: string
  lane: number
}

export interface RaceResult {
  ticks: Array<Record<string, number>>
  finishOrder: string[]
}
