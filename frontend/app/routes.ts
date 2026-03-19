import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("character-select", "routes/character-select.tsx"),
  route("race", "routes/race.tsx"),
  route("stats", "routes/stats.tsx"),
  route("races", "routes/race-history.tsx"),
  route("races/:id", "routes/race-replay.tsx"),
] satisfies RouteConfig
