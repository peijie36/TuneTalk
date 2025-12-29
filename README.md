# TuneTalk

Monorepo scaffold for the TuneTalk social listening platform. It pairs a Next.js 16 web client, a Hono-based control plane for realtime playback coordination, and a Postgres-backed auth/data layer.

## Stack

- **Next.js 16 App Router** for the primary listening UI (`apps/web`)
- **Tailwind CSS v4** using the PostCSS plugin configuration
- **Hono** running on Node with WebSocket helpers for lobby fan-out (`apps/api`)
- **Better Auth** for authentication (email/password)
- **Drizzle + Postgres** for persistence (`packages/db`)
- **Shared package** that centralizes TypeScript contracts (`packages/shared`)

## Getting Started

1. Install dependencies with pnpm: `pnpm install`
2. Copy `env.example` to `.env`, then set `DATABASE_URL` and `BETTER_AUTH_SECRET`.
3. Run the Next.js client: `pnpm dev:web`
4. Run the Hono control plane: `pnpm dev:api`

Additional scripts:

- `pnpm build` – run Turborepo build pipeline
- `pnpm lint` – repo-wide lint pass
- `pnpm format` – Prettier on supported files

## Layout

```
apps/
  web/   - Next.js 16 client (Tailwind v4, Better Auth client)
  api/   - Hono service for lobby playback + sockets (+ Better Auth)
packages/
  db     - Drizzle schema + Postgres connection
  shared - Domain contracts/types reused everywhere
```

> **Note:** Next.js 16 and Tailwind v4 are currently available on canary/alpha channels. Versions are pinned to their prerelease tags and should be updated when stable releases ship.
