# Shall We Ballet

A browser-based random racing simulation with 3D visuals. Up to 10 animals race across an isometric track — race logic is driven entirely by the backend, the frontend is pure presentation.

Built with React 19 + Three.js (frontend) and Express + TypeScript (backend), backed by PostgreSQL.

## Architecture

Two independent services:

- **`backend/`** — Race simulation engine (Express + TypeScript + PostgreSQL)
- **`frontend/`** — React 19 SPA (React Router v7 + Vite + Three.js)

## Quick Start (Local)

### Backend

```sh
cd backend
bun install
bun --hot index.ts   # runs on :3000
```

### Frontend

```sh
cd frontend
bun install
bun run dev          # runs on :5173
```

### After Cloning

```sh
git config core.hooksPath .githooks
```

This enables the pre-commit hook that auto-rebuilds `backend/api/index.js` whenever backend `.ts` files are changed.

## Deploy on Vercel

This repo is designed to be deployed as **two separate Vercel projects** from the same repository.

### Backend

- **Root Directory**: `backend`
- **Framework Preset**: `Other`
- **Environment Variables**:
  - `DATABASE_URL` — PostgreSQL connection string (e.g. Supabase)
  - `CORS_ORIGIN` — Frontend URL (e.g. `https://your-frontend.vercel.app`)
  - `CLERK_PUBLISHABLE_KEY` — Clerk publishable key
  - `CLERK_SECRET_KEY` — Clerk secret key
  - `OTEL_EXPORTER_OTLP_ENDPOINT` — (optional) OpenTelemetry collector

> **Note:** The backend serverless function is pre-bundled as `backend/api/index.js`.
> A pre-commit hook rebuilds it automatically. If you need to rebuild manually:
> ```sh
> cd backend && npm run build:vercel
> ```

### Frontend

- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Environment Variables**:
  - `VITE_BACKEND_URL` — Backend URL (e.g. `https://your-backend.vercel.app`)
  - `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key

## Load Testing (k6)

```sh
cd k6
k6 run race.ts
```

## License

MIT
