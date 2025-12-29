# API (Hono)

Playback control plane exposing REST endpoints for lobby lifecycle + playback changes and a WebSocket channel for realtime fan-out.

This service also hosts Better Auth endpoints at `/api/auth/*`.

## Scripts

- `pnpm dev:api`
- `pnpm --filter @tunetalk/api build`
- `pnpm --filter @tunetalk/api lint`

## Endpoints

- `GET /health` - Liveness check
- `GET /api/me` - Returns `{ user, session }` when authenticated (401 otherwise)
- `GET|POST /api/auth/*` - Better Auth handler
