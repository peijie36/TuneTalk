# Web (Next.js 16)

Front-end client for TuneTalk built on the App Router, Tailwind CSS v4, and Better Auth client helpers.

## Scripts

- `pnpm dev:web`
- `pnpm --filter @tunetalk/web build`
- `pnpm --filter @tunetalk/web lint`

Auth talks to the Hono service (default `http://localhost:8787`). Override with `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` if needed, then run `pnpm dev:api` + `pnpm dev:web`.
