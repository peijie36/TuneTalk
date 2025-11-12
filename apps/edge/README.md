# Edge (Hono)

Playback control plane exposing REST endpoints for lobby lifecycle + playback changes and a WebSocket channel for realtime fan-out.

## Scripts
- `pnpm dev:edge`
- `pnpm --filter @tunetalk/edge build`

`apps/edge/src/index.ts` currently stubs persistence; wire it to Supabase RPCs or Realtime listeners as you flesh out the control logic.
