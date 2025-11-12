# TuneTalk

Monorepo scaffold for the TuneTalk social listening platform. It pairs a Next.js 16 web client, a Hono-based control plane for realtime playback coordination, and Supabase migrations for persistent lobby data.

## Stack
- **Next.js 16 App Router** for the primary listening UI (`apps/web`)
- **Tailwind CSS v4** using the PostCSS plugin configuration
- **Hono** running on Node/edge with WebSocket helpers for lobby fan-out (`apps/edge`)
- **Supabase** (Auth, Postgres, Realtime) with migrations in `supabase/migrations`
- **Shared package** that centralizes TypeScript contracts (`packages/shared`)

## Getting Started
1. Install dependencies with pnpm: `pnpm install`
2. Copy `env.example` to `.env` and `.env.local`, then add Supabase keys plus any external provider tokens.
3. Run the Next.js client: `pnpm dev:web`
4. Run the Hono control plane: `pnpm dev:edge`

Additional scripts:
- `pnpm build` – run Turborepo build pipeline
- `pnpm lint` – repo-wide lint pass
- `pnpm format` – Prettier on supported files

## Layout
```
apps/
  web/   - Next.js 16 client (Tailwind v4, Supabase helpers)
  edge/  - Hono service for lobby playback + sockets
packages/
  shared - Domain contracts/types reused everywhere
supabase/
  migrations - SQL schema + RLS policies
```

> **Note:** Next.js 16 and Tailwind v4 are currently available on canary/alpha channels. Versions are pinned to their prerelease tags and should be updated when stable releases ship.
