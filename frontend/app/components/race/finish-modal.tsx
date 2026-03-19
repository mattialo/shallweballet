import { cn } from "@/lib/utils"
import { type RacerSim, rankTextClass, rankText } from "./race-constants"

export function FinishModal({
  scoreboard,
  finishOrder,
  onRaceAgain,
}: Readonly<{
  scoreboard: RacerSim[]
  finishOrder: string[]
  onRaceAgain: () => void
}>) {
  const sorted =
    finishOrder.length > 0
      ? finishOrder
          .map((id) => scoreboard.find((r) => r.id === id))
          .filter((r): r is RacerSim => r !== undefined)
      : [...scoreboard].sort((a, b) => {
          if (a.rank === null && b.rank === null) return b.position - a.position
          if (a.rank === null) return 1
          if (b.rank === null) return -1
          return a.rank - b.rank
        })

  const winner = sorted[0]

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="min-w-80 max-w-md rounded-2xl border border-border bg-background p-9 text-center text-foreground shadow-2xl ring-2 ring-yellow-400/40">
        <div className="mb-2 text-4xl">🏆</div>
        <h2 className="mb-1 text-2xl font-extrabold tracking-tight">We Have a Winner!</h2>
        <p className="mb-6 text-base font-semibold text-primary">{winner?.name ?? ""}</p>

        <div className="mb-6 overflow-hidden rounded-xl border border-border text-left">
          {sorted.map((r, i) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 border-b border-border/50 px-3 py-2 last:border-b-0",
                i === 0 && "border-l-4 border-l-yellow-400 bg-yellow-500/5",
                i === 1 && "border-l-4 border-l-slate-400 bg-slate-500/5",
                i === 2 && "border-l-4 border-l-amber-600 bg-amber-500/5",
                i === sorted.length - 1 && i > 2 && "border-l-4 border-l-red-400 bg-red-500/5",
                i > 2 && i < sorted.length - 1 && "border-l-4 border-l-transparent",
              )}
            >
              <span className={cn("w-15 text-center text-sm font-bold", rankTextClass(i + 1))}>
                {i === sorted.length - 1 ? "☕" : rankText(i + 1)}
              </span>
              <span className="flex-1 text-sm">{r.name}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onRaceAgain}
            className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-xl px-5 py-2.5 text-sm font-bold"
          >
            Race Again
          </button>
        </div>
      </div>
    </div>
  )
}
