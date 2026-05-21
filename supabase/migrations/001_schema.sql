-- ============================================================
-- FutbolBantz — Supabase Schema
-- Run these in your Supabase SQL Editor
-- ============================================================

-- ── ENABLE UUID extension ─────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── USERS (extends Supabase Auth) ─────────────────────────────
-- Supabase Auth handles the auth.users table automatically.
-- This table stores extra profile info.
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  name        text not null,
  avatar      text default '⚽',
  is_admin    boolean default false,
  created_at  timestamptz default now()
);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar', '⚽'),
    coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false)
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS: users can read their own profile, admins can read all
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ── ARTICLES ──────────────────────────────────────────────────
create table if not exists public.articles (
  id                uuid default uuid_generate_v4() primary key,
  title             text not null,
  slug              text unique,
  tag               text not null default 'Hot Take',
  channel           text,
  video_url         text,
  thumbnail         text,
  summary           text,
  full_body         text,
  keypoints         jsonb default '[]',
  conclusion        text,
  focus_keyword     text,
  secondary_keywords jsonb default '[]',
  meta_description  text,
  faq_schema        jsonb default '[]',
  breadcrumb        jsonb default '["Home"]',
  read_time_minutes integer default 3,
  published         boolean default false,
  views             integer default 0,
  created_by        uuid references public.profiles(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- RLS: anyone can read published articles, only admins can write
alter table public.articles enable row level security;

create policy "Anyone can read published articles"
  on public.articles for select
  using (published = true);

create policy "Admins can do everything with articles"
  on public.articles for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger articles_updated_at
  before update on public.articles
  for each row execute procedure public.update_updated_at();

-- ── PREMIER LEAGUE STANDINGS ───────────────────────────────────
create table if not exists public.pl_standings (
  position      integer primary key,
  team_name     text not null,
  team_abbr     text,
  team_crest    text,
  played        integer default 0,
  won           integer default 0,
  drawn         integer default 0,
  lost          integer default 0,
  goals_for     integer default 0,
  goals_against integer default 0,
  goal_diff     integer default 0,
  points        integer default 0,
  form          text,
  updated_at    timestamptz default now()
);

alter table public.pl_standings enable row level security;
create policy "Anyone can read standings"
  on public.pl_standings for select using (true);
create policy "Service role can write standings"
  on public.pl_standings for all using (auth.role() = 'service_role');

-- ── MATCH RESULTS ──────────────────────────────────────────────
create table if not exists public.pl_results (
  match_id      bigint primary key,
  home_team     text not null,
  away_team     text not null,
  home_score    integer,
  away_score    integer,
  match_date    timestamptz,
  matchday      integer,
  status        text default 'FINISHED',
  updated_at    timestamptz default now()
);

alter table public.pl_results enable row level security;
create policy "Anyone can read results"
  on public.pl_results for select using (true);
create policy "Service role can write results"
  on public.pl_results for all using (auth.role() = 'service_role');

-- ── UPCOMING FIXTURES ──────────────────────────────────────────
create table if not exists public.pl_fixtures (
  match_id      bigint primary key,
  home_team     text not null,
  away_team     text not null,
  match_date    timestamptz,
  matchday      integer,
  status        text default 'SCHEDULED',
  updated_at    timestamptz default now()
);

alter table public.pl_fixtures enable row level security;
create policy "Anyone can read fixtures"
  on public.pl_fixtures for select using (true);
create policy "Service role can write fixtures"
  on public.pl_fixtures for all using (auth.role() = 'service_role');

-- ── TOP SCORERS ────────────────────────────────────────────────
create table if not exists public.pl_scorers (
  position      integer primary key,
  player_name   text not null,
  team_name     text,
  team_abbr     text,
  goals         integer default 0,
  assists       integer default 0,
  penalties     integer default 0,
  played        integer default 0,
  updated_at    timestamptz default now()
);

alter table public.pl_scorers enable row level security;
create policy "Anyone can read scorers"
  on public.pl_scorers for select using (true);
create policy "Service role can write scorers"
  on public.pl_scorers for all using (auth.role() = 'service_role');

-- ── META (last refresh timestamp) ─────────────────────────────
create table if not exists public.pl_meta (
  id            integer primary key default 1,
  last_updated  timestamptz default now(),
  season        text default '2025/26'
);

alter table public.pl_meta enable row level security;
create policy "Anyone can read meta"
  on public.pl_meta for select using (true);
create policy "Service role can write meta"
  on public.pl_meta for all using (auth.role() = 'service_role');

-- Insert initial meta row
insert into public.pl_meta (id, last_updated, season)
values (1, now(), '2025/26')
on conflict (id) do nothing;
