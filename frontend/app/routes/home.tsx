import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RaceBackground } from "@/components/RaceBackground"

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <div className="fixed inset-0 -z-10 bg-background" />
      <RaceBackground />
      <div className="flex max-w-3xl flex-col items-center gap-6 px-6 text-center">
        <Badge
          variant="outline"
          className="relative z-10 px-3 py-1 text-xs tracking-widest uppercase"
        >
          🏆 Ric's #1 least favourite game of the year
        </Badge>

        <h1 className="text-6xl leading-tight font-bold">
          These Poor Souls Are Enslaved by Your Coffee Addiction and Gambling
          Problem
        </h1>

        <p className="text-lg font-medium text-foreground/70">
          Last one across the line buys coffee for EVERYONE. Free coffe tastes
          G-R-E-A-T!
        </p>

        <Button
          size="lg"
          className="relative z-10 h-12 px-10 text-base font-semibold tracking-wide"
          onClick={() => navigate("/character-select")}
        >
          Start Racing
        </Button>

        <p className="relative z-10 -mt-4 text-xs text-foreground/60">
          💡PRO TIP • Most gamblers stop before winning BIG
        </p>

        <div className="relative z-10 flex gap-3">
          <Button variant="outline" onClick={() => navigate("/stats")}>
            Hall of Fame
          </Button>
          <Button variant="outline" onClick={() => navigate("/races")}>
            Race History
          </Button>
        </div>
      </div>
    </div>
  )
}
