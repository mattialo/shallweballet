import { cn } from "@/lib/utils"
import { type RacerSim, rankTextClass, LANE_COLORS } from "./race-constants"

export function Scoreboard({
  scoreboard,
}: Readonly<{ scoreboard: RacerSim[] }>) {
  const sorted = [...scoreboard].sort((a, b) => {
    if (a.rank === null && b.rank === null) return b.position - a.position
    if (a.rank === null) return -1
    if (b.rank === null) return 1
    return a.rank - b.rank
  })

  return (
    <div className="fixed top-4 right-4 z-[100] min-w-60 rounded-xl border border-border bg-background/90 p-3 text-foreground shadow-md backdrop-blur-sm">
      <p className="mb-2.5 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
        🏁 Leaderboard
      </p>
      {sorted.map((r, i) => (
        <div key={r.id} className="mb-1.5 flex items-center gap-2">
          <span
            className={cn(
              "w-5 shrink-0 text-right text-xs font-bold",
              rankTextClass(r.rank)
            )}
          >
            {i + 1}
          </span>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: LANE_COLORS[r.lane] }}
          />
          <span className="min-w-0 flex-1 truncate text-xs">{r.name}</span>
        </div>
      ))}
    </div>
  )
}
