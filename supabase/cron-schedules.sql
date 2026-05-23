-- ============================================================
-- FutbolBantz — Supabase Cron Schedules
-- Run this in your Supabase SQL Editor
-- Requires the pg_cron extension (enabled by default on Supabase)
-- ============================================================

-- Enable pg_cron if not already enabled
create extension if not exists pg_cron;

-- ── SCHEDULE 1: Generate new articles every morning at 8am UTC ────────────────
-- Runs 7 days a week. Costs ~£0.05/day in Claude API calls.
select cron.schedule(
  'daily-article-generation',          -- job name
  '0 8 * * *',                         -- every day at 8am UTC (9am BST, 10am CEST)
  $$
  select net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/daily-articles',
    headers := jsonb_build_object(
      'Content-Type',       'application/json',
      'Authorization',      'Bearer ' || current_setting('app.service_role_key'),
      'x-scheduled',        'true'
    ),
    body   := '{}'::jsonb
  );
  $$
);

-- ── SCHEDULE 2: Refresh PL data — matchday evenings ───────────────────────────
-- Runs Saturday + Sunday at 6pm and 11pm UTC, Monday 11pm UTC
-- Catches 3pm kickoffs, evening games, and midweek games

-- Saturday 6pm UTC (after 3pm kickoffs finish)
select cron.schedule(
  'pl-data-saturday-evening',
  '0 18 * * 6',
  $$
  select net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/refresh-pl-data',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'x-scheduled',   'true'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Saturday 11pm UTC (after evening games)
select cron.schedule(
  'pl-data-saturday-night',
  '0 23 * * 6',
  $$
  select net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/refresh-pl-data',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'x-scheduled',   'true'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Sunday 6pm UTC
select cron.schedule(
  'pl-data-sunday-evening',
  '0 18 * * 0',
  $$
  select net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/refresh-pl-data',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'x-scheduled',   'true'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Monday + Tuesday + Wednesday 11pm UTC (midweek games)
select cron.schedule(
  'pl-data-midweek',
  '0 23 * * 1,2,3',
  $$
  select net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/refresh-pl-data',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'x-scheduled',   'true'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ── FUNCTION RUNS LOG TABLE ───────────────────────────────────────────────────
-- Tracks when each function ran and how many articles it generated
create table if not exists public.function_runs (
  function_name       text primary key,
  last_run            timestamptz,
  articles_generated  integer default 0,
  errors              jsonb default '[]'
);

alter table public.function_runs enable row level security;
create policy "Admins can read function runs"
  on public.function_runs for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── VIEW: check your scheduled jobs ──────────────────────────────────────────
-- Run this any time to see your active cron jobs:
-- select * from cron.job;

-- ── MANUAL TRIGGER via SQL ────────────────────────────────────────────────────
-- To manually trigger article generation from SQL editor:
-- select net.http_post(url := 'YOUR_SUPABASE_URL/functions/v1/daily-articles', ...);

-- ── SET APP CONFIG (required for cron to know your URL) ───────────────────────
-- Replace with your actual values and run this:
/*
alter database postgres set app.supabase_url = 'https://YOUR_PROJECT.supabase.co';
alter database postgres set app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
*/
