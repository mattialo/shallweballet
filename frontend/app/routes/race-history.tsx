import { Fragment, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { useAuth } from "@clerk/clerk-react"
import { CHARACTERS } from "@/lib/characters"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"
const RACE_LENGTH = 1500

interface RaceParticipant {
  racer_id: string
  position: number
  lane: number
}

interface RaceHistoryItem {
  id: number
  created_at: string
  has_ticks: boolean
  participants: RaceParticipant[]
}

interface RaceDetail {
  participants: RaceParticipant[]
  ticks: Array<Record<string, number>> | null
}

interface HistoryResponse {
  races: RaceHistoryItem[]
  next_cursor: string | null
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Returns a map of racer_id → fractional arrival time (seconds), interpolated within the crossing tick. */
function computeArrivalTicks(
  ticks: Array<Record<string, number>>
): Record<string, number> {
  const positions: Record<string, number> = {}
  const arrivals: Record<string, number> = {}
  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i]
    for (const [id, speed] of Object.entries(tick)) {
      const prev = positions[id] ?? 0
      const next = prev + speed
      positions[id] = next
      if (arrivals[id] === undefined && next >= RACE_LENGTH) {
        arrivals[id] = i + (RACE_LENGTH - prev) / speed
      }
    }
  }
  return arrivals
}

function HistorySkeletons() {
  return (
    <Card>
      <Table>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="w-16">
                <Skeleton className="h-4 w-10" />
              </TableCell>
              <TableCell className="w-24">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-8 w-16 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

export default function RaceHistory() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [races, setRaces] = useState<RaceHistoryItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detailCache, setDetailCache] = useState<
    Record<number, RaceDetail | "loading">
  >({})

  useEffect(() => {
    getToken().then((token) => {
      fetch(`${BACKEND_URL}/api/races`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data: HistoryResponse) => {
          setRaces(data.races)
          setNextCursor(data.next_cursor)
        })
        .catch((err) => setError(String(err)))
        .finally(() => setLoading(false))
    })
  }, [])

  function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    getToken().then((token) => {
      fetch(`${BACKEND_URL}/api/races?before=${encodeURIComponent(nextCursor)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data: HistoryResponse) => {
          setRaces((prev) => [...prev, ...data.races])
          setNextCursor(data.next_cursor)
        })
        .catch((err) => setError(String(err)))
        .finally(() => setLoadingMore(false))
    })
  }

  function toggleRow(race: RaceHistoryItem) {
    if (expandedId === race.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(race.id)
    if (detailCache[race.id]) return
    setDetailCache((prev) => ({ ...prev, [race.id]: "loading" }))
    getToken().then((token) => {
      fetch(`${BACKEND_URL}/api/races/${race.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data: RaceDetail) => {
          setDetailCache((prev) => ({ ...prev, [race.id]: data }))
        })
        .catch(() => {
          // fall back to list data
          setDetailCache((prev) => ({
            ...prev,
            [race.id]: { participants: race.participants, ticks: null },
          }))
        })
    })
  }

  return (
    <div className="min-h-svh bg-background px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">Race History</h1>
        </div>
        {loading ? (
          <HistorySkeletons />
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : races.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-5xl">🏁</p>
              <p className="text-xl font-bold">No Races Yet</p>
              <p className="text-sm text-muted-foreground">
                Run some races to build up your history.
              </p>
              <Button onClick={() => navigate("/character-select")}>
                Start Racing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-xs tracking-widest uppercase">
                      #
                    </TableHead>
                    <TableHead className="w-24 text-xs tracking-widest uppercase">
                      When
                    </TableHead>
                    <TableHead className="text-xs tracking-widest uppercase">
                      Result
                    </TableHead>
                    <TableHead className="text-right text-xs tracking-widest uppercase">
                      Replay
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {races.map((race) => {
                    const winner = CHARACTERS.find(
                      (c) => c.id === race.participants[0]?.racer_id
                    )
                    const loser = CHARACTERS.find(
                      (c) =>
                        c.id ===
                        race.participants[race.participants.length - 1]
                          ?.racer_id
                    )
                    const isExpanded = expandedId === race.id
                    const detail = detailCache[race.id]

                    return (
                      <Fragment key={race.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggleRow(race)}
                        >
                          <TableCell className="text-muted-foreground">
                            #{race.id}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatRelativeDate(race.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              {winner && (
                                <Badge className="bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30">
                                  🥇 {winner.name}
                                </Badge>
                              )}
                              {loser && (
                                <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
                                  ☕ {loser.name}
                                </Badge>
                              )}
                              <Badge variant="secondary">
                                {race.participants.length} racers
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {race.has_ticks ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/races/${race.id}`)
                                }}
                              >
                                Replay
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" disabled>
                                No replay
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={4} className="bg-muted/30 p-0">
                              {detail === "loading" ? (
                                <div className="px-6 py-3">
                                  <Skeleton className="h-4 w-48" />
                                </div>
                              ) : detail ? (
                                <LineupTable
                                  participants={detail.participants}
                                  ticks={detail.ticks}
                                />
                              ) : null}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>

            {nextCursor && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const MEDALS = ["🥇", "🥈", "🥉"]

function LineupTable({
  participants,
  ticks,
}: {
  participants: RaceParticipant[]
  ticks: Array<Record<string, number>> | null
}) {
  const arrivals = ticks ? computeArrivalTicks(ticks) : null
  const sorted = [...participants].sort((a, b) => a.position - b.position)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14 pl-6 text-xs tracking-widest uppercase">
            Pos
          </TableHead>
          <TableHead className="text-xs tracking-widest uppercase">
            Racer
          </TableHead>
          {arrivals && (
            <TableHead className="pr-6 text-right text-xs tracking-widest uppercase">
              Arrival
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((p, i) => {
          const char = CHARACTERS.find((c) => c.id === p.racer_id)
          const isLast = i === sorted.length - 1
          const arrival = arrivals?.[p.racer_id]
          return (
            <TableRow key={p.racer_id} className="hover:bg-transparent">
              <TableCell className="pl-6 font-mono text-sm text-muted-foreground">
                {MEDALS[i] ?? `${i + 1}.`}
              </TableCell>
              <TableCell className={isLast ? "text-muted-foreground" : ""}>
                {char?.name ?? p.racer_id}
                {isLast && <span className="ml-1 text-xs">☕</span>}
              </TableCell>
              {arrivals && (
                <TableCell className="pr-6 text-right font-mono text-sm text-muted-foreground">
                  {arrival !== undefined ? `${arrival.toFixed(2)}s` : "—"}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
