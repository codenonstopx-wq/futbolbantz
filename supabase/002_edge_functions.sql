-- ============================================================
-- FutbolBantz — Schema additions for Edge Functions
-- Run in Supabase SQL Editor AFTER the main 001_schema.sql
-- ============================================================

-- ── Add missing columns to articles table ────────────────────────────────────
alter table public.articles
  add column if not exists updated_at timestamptz default now(),
  add column if not exists video_id   text;          -- YouTube video ID for dedup

-- ── increment_views function (called when article is opened) ─────────────────
create or replace function public.increment_views(article_id uuid)
returns void as $$
  update public.articles
  set views = views + 1
  where id = article_id;
$$ language sql security definer;

-- ── get_latest_articles (for homepage — cached query) ────────────────────────
create or replace function public.get_latest_articles(
  p_limit  integer default 10,
  p_offset integer default 0,
  p_tag    text    default null
)
returns setof public.articles as $$
  select * from public.articles
  where published = true
    and (p_tag is null or tag = p_tag)
  order by created_at desc
  limit p_limit offset p_offset;
$$ language sql security definer;

-- ── get_article_by_slug (for SEO URLs) ───────────────────────────────────────
create or replace function public.get_article_by_slug(p_slug text)
returns public.articles as $$
  select * from public.articles
  where slug = p_slug and published = true
  limit 1;
$$ language sql security definer;

-- ── function_runs table (tracks Edge Function executions) ────────────────────
create table if not exists public.function_runs (
  function_name       text primary key,
  last_run            timestamptz,
  articles_generated  integer default 0,
  errors              jsonb default '[]'
);

alter table public.function_runs enable row level security;

create policy "Service role can manage function runs"
  on public.function_runs for all
  using (auth.role() = 'service_role');

create policy "Admins can read function runs"
  on public.function_runs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ── Useful admin views ────────────────────────────────────────────────────────

-- Article stats overview
create or replace view public.article_stats as
select
  count(*)                                    as total_articles,
  count(*) filter (where published = true)    as published,
  count(*) filter (where published = false)   as drafts,
  sum(views)                                  as total_views,
  max(created_at)                             as latest_article,
  count(distinct channel)                     as channels_covered
from public.articles;

-- Top articles by views
create or replace view public.top_articles as
select id, title, tag, channel, views, created_at, published
from public.articles
where published = true
order by views desc
limit 20;

-- Articles per day (for charting)
create or replace view public.articles_per_day as
select
  date_trunc('day', created_at)::date as date,
  count(*)                             as articles_created,
  count(*) filter (where published)    as articles_published
from public.articles
group by 1
order by 1 desc
limit 30;

-- ── Grant access to service role for edge functions ───────────────────────────
grant all on public.articles       to service_role;
grant all on public.function_runs  to service_role;
grant all on public.pl_standings   to service_role;
grant all on public.pl_results     to service_role;
grant all on public.pl_fixtures    to service_role;
grant all on public.pl_scorers     to service_role;
grant all on public.pl_meta        to service_role;
