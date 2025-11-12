create extension if not exists "pgcrypto";

create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_public boolean default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lobby_members (
  lobby_id uuid references public.lobbies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('host', 'co_host', 'listener')),
  last_seen_at timestamptz not null default timezone('utc', now()),
  primary key (lobby_id, user_id)
);

create table if not exists public.messages (
  id bigserial primary key,
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.playback_state (
  lobby_id uuid primary key references public.lobbies (id) on delete cascade,
  track_id text not null,
  position_ms integer not null default 0,
  is_paused boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.skip_votes (
  lobby_id uuid references public.lobbies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lobby_id, user_id)
);

alter table public.lobbies enable row level security;
alter table public.lobby_members enable row level security;
alter table public.messages enable row level security;
alter table public.playback_state enable row level security;
alter table public.skip_votes enable row level security;

create policy "lobby members can view lobby" on public.lobbies
  for select using (exists (
    select 1 from public.lobby_members lm
    where lm.lobby_id = lobbies.id and lm.user_id = auth.uid()
  ));

create policy "hosts manage lobby" on public.lobbies
  for all using (auth.uid() = host_user_id) with check (auth.uid() = host_user_id);

create policy "members manage membership" on public.lobby_members
  for select using (
    lobby_id in (select lobby_id from public.lobby_members where user_id = auth.uid())
  );

create policy "members chat" on public.messages
  for select using (exists (
    select 1 from public.lobby_members lm where lm.lobby_id = messages.lobby_id and lm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.lobby_members lm where lm.lobby_id = messages.lobby_id and lm.user_id = auth.uid()
  ));

create policy "members read playback" on public.playback_state
  for select using (exists (
    select 1 from public.lobby_members lm where lm.lobby_id = playback_state.lobby_id and lm.user_id = auth.uid()
  ));

create policy "hosts update playback" on public.playback_state
  for all using (auth.uid() = (select host_user_id from public.lobbies where id = playback_state.lobby_id));
