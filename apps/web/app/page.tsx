import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/utils/cn";

// Navigation items rendered in the sticky header
const navLinks = [
  { label: "Home", href: "#top", active: true },
  { label: "Features", href: "#features", active: false },
  { label: "Community", href: "#community", active: false },
];

// Feature grid content with inline SVG icons
const featureCards = [
  {
    title: "Music",
    description: "Bring your soundtrack to life with synced playback.",
    icon: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10"
      >
        <rect
          x="8"
          y="8"
          width="32"
          height="32"
          rx="10"
          fill="#ffffff"
          opacity="0.95"
        />
        <path
          d="M24 14v13.5a4.5 4.5 0 1 1-1.5-3.36V17l10-3v8.5a4.5 4.5 0 1 1-1.5-3.36V12L24 14Z"
          fill="#a03df0"
        />
      </svg>
    ),
  },
  {
    title: "Connect",
    description: "Unite with other listeners through chat and presence.",
    icon: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10"
      >
        <rect
          x="7"
          y="8"
          width="34"
          height="28"
          rx="9"
          fill="#ffffff"
          opacity="0.95"
        />
        <path d="M15 18h18v2.5H15V18Zm0 6.5h11v2.5H15v-2.5Z" fill="#4b3f4e" />
        <path
          d="M32 28.5c0 1.38-.85 3-2.55 3H17l-3.5 4v-7"
          stroke="#a03df0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Discover",
    description: "Explore, share, and comment on every beat together.",
    icon: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10"
      >
        <rect
          x="9"
          y="7"
          width="30"
          height="34"
          rx="9"
          fill="#ffffff"
          opacity="0.95"
        />
        <path
          d="M18 14h12"
          stroke="#4b3f4e"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18 21h12"
          stroke="#a03df0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M18 28h7"
          stroke="#4b3f4e"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

// Steps highlighting the flow for creating a room
const steps = [
  {
    title: "Create",
    description: "Start a listening room with a ready-made lobby in seconds.",
  },
  {
    title: "Invite",
    description: "Share links, let friends join, and keep everyone in sync.",
  },
  {
    title: "Enjoy",
    description:
      "Chat, vote, and discover tracks together without missing a beat.",
  },
];

export default function HomePage() {
  return (
    <div id="top" className="bg-background relative flex min-h-screen flex-col">
      {/* Soft background gradient behind the entire page */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent via-white/30 to-white/80" />

      {/* Sticky header with branding and navigation */}
      <header className="border-border/60 sticky top-0 z-30 border-b bg-white/85 shadow-[0_12px_30px_rgba(0,0,0,0.04)] backdrop-blur-lg supports-backdrop-filter:bg-white/80">
        <div className="tt-container flex items-center justify-between py-4 sm:py-5">
          <div className="flex flex-col">
            <span className="text-foreground text-2xl font-semibold">
              TuneTalk
            </span>
            <span className="text-muted-foreground text-sm">
              Music, community, endless vibes
            </span>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "relative transition-colors",
                  link.active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                {link.label}
                {link.active ? (
                  <span className="bg-primary absolute inset-x-0 -bottom-2 mx-auto h-1 w-2 rounded-full" />
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-16 pb-16">
        {/* Hero section with primary CTA and mocked room UI */}
        <section className="tt-container tt-section pt-8">
          <Card className="tt-hero-surface relative overflow-hidden border-none bg-transparent shadow-none">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/18 blur-3xl" />
            <div className="bg-primary pointer-events-none absolute right-[-10%] bottom-[-40%] h-72 w-72 rounded-full opacity-20 blur-3xl" />

            <CardContent className="grid items-center gap-12 p-0 lg:grid-cols-[1.05fr,0.95fr]">
              <div className="space-y-6">
                <Badge variant="outline" className="tt-pill border-white/50">
                  Your gateway to music and community
                </Badge>
                <div className="space-y-3">
                  <h1 className="text-foreground text-4xl leading-tight font-bold sm:text-5xl">
                    Where music comes to life with TuneTalk
                  </h1>
                  <p className="text-muted-foreground text-lg leading-relaxed text-balance sm:text-xl">
                    Create shared listening rooms with realtime chat, presence,
                    and playback that never falls out of sync.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <Button asChild size="lg">
                    <Link href="/signup">Create account</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="#features">Explore features</Link>
                  </Button>
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                  {[
                    { label: "Realtime sync", color: "var(--color-primary)" },
                    {
                      label: "Community-first",
                      color: "var(--color-accent-gold)",
                    },
                    {
                      label: "Low-latency playback",
                      color: "var(--color-accent-warm)",
                    },
                  ].map((item) => (
                    <span key={item.label} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: item.color }}
                      />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -top-6 -left-6 h-12 w-12 rounded-full bg-white/70 shadow-lg" />
                <div className="bg-primary absolute top-10 -right-10 h-16 w-16 rounded-full opacity-20 blur-2xl" />
                <div className="absolute right-4 -bottom-6 h-14 w-14 rounded-3xl border border-white/60 bg-white/70 shadow-2xl" />

                <Card className="tt-card relative overflow-hidden border border-white/60 bg-white/80 backdrop-blur">
                  <CardHeader className="mb-2 flex flex-row items-center justify-between pb-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary h-3 w-3 rounded-full" />
                      <span className="bg-accent-gold h-3 w-3 rounded-full" />
                      <span className="bg-accent-warm h-3 w-3 rounded-full" />
                    </div>
                    <Badge variant="subtle" className="text-xs font-semibold">
                      Live room
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <Card className="border-border/80 border bg-white/90 shadow-sm">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground text-sm font-semibold">
                              Lofi and Chill
                            </p>
                            <p className="text-muted-foreground text-xs">
                              12 listeners - synced
                            </p>
                          </div>
                          <Badge className="bg-primary text-white">
                            Now playing
                          </Badge>
                        </div>
                        <div className="bg-border mt-1 h-2 w-full rounded-full">
                          <div className="bg-primary h-2 w-3/4 rounded-full" />
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Card className="border-border/80 border bg-white/90 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardDescription className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                            Chat
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          <MessageRow
                            name="Alex"
                            text="Drop the next track!"
                            highlight
                          />
                          <MessageRow name="Mia" text="Loving this vibe." />
                          <MessageRow name="Jay" text="Queue me in." />
                        </CardContent>
                      </Card>

                      <Card className="border-border/80 border bg-white/90 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardDescription className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                            Presence
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2 pt-0 text-xs">
                          {["You", "Mia", "Alex", "Jay", "Sam"].map((user) => (
                            <Badge
                              key={user}
                              variant="subtle"
                              className="bg-surface text-text-strong"
                            >
                              {user}
                            </Badge>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Feature grid showcasing three pillars */}
        <section
          id="features"
          className="tt-section scroll-mt-12 bg-white/90 backdrop-blur-md sm:scroll-mt-16"
        >
          <div className="tt-container space-y-10">
            <div className="space-y-3 text-center">
              <Badge variant="outline" className="tt-pill border-transparent">
                Explore TuneTalk features
              </Badge>
              <h2 className="text-foreground text-3xl font-semibold text-balance sm:text-4xl">
                Built for music lovers, hosts, and communities
              </h2>
              <p className="text-muted-foreground text-balance sm:text-lg">
                Powerful syncing, expressive chat, and discovery tools that make
                every room feel alive.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {featureCards.map((feature) => (
                <Card
                  key={feature.title}
                  className="h-full border border-white/70 bg-white/85 backdrop-blur transition-transform hover:-translate-y-1 hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-foreground text-lg">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Community/responsiveness section with step cards */}
        <section
          id="community"
          className="tt-section to-card-alt scroll-mt-12 bg-linear-to-br from-white via-white/90 sm:scroll-mt-16"
        >
          <div className="tt-container grid gap-10 lg:grid-cols-[1fr,1fr]">
            <div className="space-y-4">
              <Badge variant="outline" className="tt-pill border-transparent">
                Ready for every resolution
              </Badge>
              <h2 className="text-foreground text-3xl font-semibold text-balance sm:text-4xl">
                Responsive design that keeps the vibe on any screen
              </h2>
              <p className="text-muted-foreground text-balance sm:text-lg">
                From desktops to phones, TuneTalk adapts with fluid spacing,
                balanced typography, and touch-friendly controls - so your room
                stays welcoming everywhere.
              </p>
              <div className="text-muted-foreground flex flex-wrap gap-3 text-sm">
                <Badge variant="subtle" className="text-foreground bg-white">
                  Adaptive grids
                </Badge>
                <Badge variant="subtle" className="text-foreground bg-white">
                  Fluid hero layout
                </Badge>
                <Badge variant="subtle" className="text-foreground bg-white">
                  Touch-ready controls
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {steps.map((step, index) => (
                  <Card
                    key={step.title}
                    className="border-border/70 border bg-white/85 p-4 shadow-sm backdrop-blur"
                  >
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary text-white">
                        {index + 1}
                      </Badge>
                      <span className="text-muted-foreground text-xs font-semibold">
                        {step.title}
                      </span>
                    </div>
                    <p className="text-foreground mt-3 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </Card>
                ))}
              </div>

              <Card className="tt-card flex flex-col gap-3 border border-white/70 bg-white/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      Community-first
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Real-time chat, presence, and reactions baked in.
                    </p>
                  </div>
                  <Badge className="bg-accent-warm text-white">Live</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 pt-0 text-xs">
                  {[
                    "Chat threads",
                    "Presence dots",
                    "Skip votes",
                    "Host tools",
                  ].map((item) => (
                    <Badge
                      key={item}
                      variant="subtle"
                      className="bg-surface text-text-strong"
                    >
                      {item}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final call-to-action section */}
        <section className="tt-section">
          <div className="tt-container flex flex-col items-center gap-6 text-center">
            <h2 className="text-foreground text-3xl font-semibold text-balance sm:text-4xl">
              Ready to host your first room?
            </h2>
            <p className="text-muted-foreground text-balance sm:text-lg">
              Spin up a space, invite friends, and keep the music flowing with
              synced playback and lively chat.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/signup">Create account</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/signin">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

interface MessageRowProps {
  name: string;
  text: string;
  highlight?: boolean;
}

// Lightweight chat message row used inside the hero card
function MessageRow({ name, text, highlight }: MessageRowProps) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full font-semibold",
          highlight ? "bg-primary text-white" : "bg-surface text-text"
        )}
      >
        {name[0]}
      </span>
      <div className="flex-1">
        <p className="text-foreground font-semibold">{name}</p>
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
