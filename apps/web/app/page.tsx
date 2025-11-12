import Link from 'next/link'

const features = [
  'Supabase-authenticated lobbies with invite links and presence',
  'Realtime chat + member list powered by Supabase Realtime channels',
  'Shared playback timeline broadcasted from the Hono service',
  'Optional skip voting backed by database-side tallies'
]

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
      <section className="space-y-6 text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400 text-balance">
          Cohesive social listening
        </p>
        <h1 className="text-balance text-4xl font-semibold sm:text-5xl">TuneTalk Listening Rooms</h1>
        <p className="text-lg text-slate-300 text-balance">
          Create lounges where chat, presence, and playback stay in sync, no matter who joins mid-song.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-full bg-white px-6 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
          >
            Enter prototype
          </Link>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-600 px-6 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-400"
          >
            Configure Supabase
          </a>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((item) => (
          <article
            key={item}
            className="rounded-3xl border border-slate-900/70 bg-slate-900/40 p-5 shadow-[var(--shadow-card)]"
          >
            <p className="text-sm text-slate-200">{item}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
