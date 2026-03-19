import { RACE_LENGTH, type RacerSim } from "./race-constants"

export function RaceProgressBar({ scoreboard }: Readonly<{ scoreboard: RacerSim[] }>) {
  const avg = scoreboard.length
    ? scoreboard.reduce((sum, r) => sum + r.position, 0) / scoreboard.length
    : 0
  const pct = Math.min((avg / RACE_LENGTH) * 100, 100)

  return (
    <div className="fixed bottom-6 left-1/2 z-[100] w-80 -translate-x-1/2 rounded-xl border border-border bg-background/90 p-3 shadow-md backdrop-blur-sm">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Group Progress
      </p>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-[11px] text-muted-foreground">{Math.round(pct)}%</p>
    </div>
  )
}
