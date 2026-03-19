import { useState } from "react"
import { useNavigate } from "react-router"
import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react"
import { CharacterCard } from "@/components/CharacterCard"
import { Button } from "@/components/ui/button"
import { CHARACTERS } from "@/lib/characters"

export default function CharacterSelect() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>([])

  const MAX_RACERS = 10

  function toggleCharacter(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_RACERS) return prev
      return [...prev, id]
    })
  }

  return (
    <>
    <SignedOut>
      <div className="flex min-h-svh items-center justify-center">
        <SignIn routing="hash" />
      </div>
    </SignedOut>
    <SignedIn>
    <div className="relative min-h-svh">
      <div className="fixed inset-0 -z-10 bg-background" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10">
        <div className="relative mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="absolute top-0 left-0 text-foreground/60 hover:text-foreground"
          >
            ← Back
          </Button>
          <div className="text-center">
            <h1 className="text-5xl font-bold">Pick Your Victims</h1>
            <p className="mt-2 text-foreground/60">
              Select up to 10 racers. They didn't ask for this.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-28 sm:grid-cols-3 lg:grid-cols-5">
          {CHARACTERS.map((character) => {
            const selectedIndex = selected.indexOf(character.id)
            return (
              <CharacterCard
                key={character.id}
                character={character}
                selectedNumber={selectedIndex === -1 ? null : selectedIndex + 1}
                onToggle={() => toggleCharacter(character.id)}
                disabled={selectedIndex === -1 && selected.length >= MAX_RACERS}
              />
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border/50 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <p className="text-sm text-foreground/60">
            {selected.length === 0
              ? "No racers selected"
              : selected.length === 1
                ? "Select at least one more racer"
                : `${selected.length} / ${MAX_RACERS} racers selected`}
          </p>
          <Button
            disabled={selected.length < 2}
            onClick={() => navigate("/race", { state: { characterIds: selected } })}
          >
            Start Race →
          </Button>
        </div>
      </div>
    </div>
    </SignedIn>
    </>
  )
}
