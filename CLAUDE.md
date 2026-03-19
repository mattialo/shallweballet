# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"One More Race I Promise" — a browser-based random racing simulation for demo and load testing. Up to 10 vehicles race across an isometric 3D track. Race logic is driven entirely by the backend; the frontend is pure presentation.

## Architecture

Two independent Bun services, each with their own `package.json` and `node_modules`:

- **`backend/`** — race simulation engine using **Express** + TypeScript, backed by PostgreSQL
- **`frontend/`** — React 19 SPA using React Router v7 + Vite + Three.js, served via `bun run dev`

The frontend communicates with the backend via HTTP/REST. No shared code or monorepo tooling — each service is developed independently.

### Race Data Flow

The backend pre-computes the entire race upfront and returns all tick data at once. The frontend replays it:

1. Frontend POSTs `/api/race` with selected racer IDs → backend runs `simulateRace()` (up to 100 ticks of random speeds, `RACE_LENGTH=1500`) and returns `{ ticks, finishOrder }`
2. Frontend counts down ("3, 2, 1, GO!"), then replays one tick per second via `setInterval`
3. Three.js `useFrame` loop updates 3D model positions each frame; racer models animate at a speed proportional to their current tick speed
4. On finish, the race is saved to PostgreSQL asynchronously (fire-and-forget, doesn't block the response)

### Backend Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/race` | Simulate race; return tick array + finish order |
| GET | `/api/stats` | Leaderboard: win rates, streaks, total races per animal |
| GET | `/api/status` | Health check |

Routes are modular Express routers in `backend/routes/`, mounted under `/api` in `backend/app.ts`.

### Database Schema (PostgreSQL via `bun:sql`)

```sql
races (id SERIAL PK, created_at TIMESTAMPTZ)
race_participants (id, race_id FK, racer_id TEXT, lane INT, position INT)
```

Stats are computed in-memory from the full race history (not aggregated in SQL) — see `backend/routes/stats.ts`.

## Commands

### Backend
```sh
cd backend
bun install          # install dependencies
bun index.ts         # run server (default port: 3000, override with PORT=)
bun --hot index.ts   # run with hot reload
bun test             # run tests
bun test --test-name-pattern "pattern"  # run a single test
```

### Frontend
```sh
cd frontend
bun install          # install dependencies
bun run dev          # Vite dev server with HMR
bun run build        # production build → build/client/
bun run start        # production server (serves ./build/client)
bun run typecheck    # generate React Router types and typecheck
bun run format       # format with Prettier
bun test             # run tests
bun test --test-name-pattern "pattern"  # run a single test
```

### Docker
```sh
docker compose up --build   # start postgres + backend + frontend
# frontend → localhost:8080, backend → localhost:3000, postgres → localhost:5432
```

### Load Testing (k6)
```sh
cd k6
k6 run race.ts                              # 10 VUs, 30s against localhost:3000
BACKEND_URL=http://host k6 run race.ts      # override target
```

## Bun Conventions

Both services use Bun exclusively — not Node.js or npm alternatives:

- `bun:sql` for Postgres — no pg/postgres.js
- `Bun.redis` for Redis — no ioredis
- `bun:sqlite` for SQLite — no better-sqlite3
- Built-in `WebSocket` — no `ws` package
- `Bun.file` over `node:fs` readFile/writeFile
- `Bun.$\`cmd\`` instead of execa
- Bun auto-loads `.env` — no dotenv

The backend uses Express (not `Bun.serve()`) to support OpenTelemetry's Express instrumentation.

## Frontend Pattern

The frontend is a React Router v7 SPA (SSR disabled via `ssr: false` in `react-router.config.ts`). Vite handles bundling with `@react-router/dev/vite` and `@tailwindcss/vite` plugins. App code lives in `app/` with routes defined in `app/routes.ts`.

Path aliases `@/*` and `~/*` both map to `./app/*` in the frontend TypeScript config.

UI components use **shadcn/ui** (style: radix-vega, icons: hugeicons). The `cn()` utility in `app/lib/utils.ts` merges Tailwind classes. Tailwind v4 uses CSS variables in OKLCH color space defined in `app/app.css`.

Prettier is configured in `.prettierrc` with `prettier-plugin-tailwindcss` — run `bun run format` before committing.

Selected characters are passed between routes via React Router `location.state` (not URL params or global state).

## Observability

The backend is instrumented with OpenTelemetry (`backend/instrumentation.ts`). It exports traces and logs via OTLP HTTP to `OTEL_EXPORTER_OTLP_ENDPOINT`. The `tracer` and `logger` exports from `instrumentation.ts` are used in route handlers for custom spans and structured log events.

Key env vars: `OTEL_SERVICE_NAME` (default: `pi-demo-backend`), `OTEL_EXPORTER_OTLP_ENDPOINT` (default: `http://localhost:4318`).

## Environment Variables

**Backend** (see `backend/.env.example`):
- `PORT` — HTTP port (default: 3000)
- `DATABASE_URL` — PostgreSQL connection string
- `CORS_ORIGIN` — allowed frontend origin (default: `http://localhost:5173`; Docker: `http://localhost:8080`)
- `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`

**Frontend**:
- `VITE_BACKEND_URL` — backend base URL (default: `http://localhost:3000`)

## Testing

Use `bun test` (Bun's built-in Jest-compatible test runner). Test files follow the `*.test.ts` convention and import from `bun:test`.
