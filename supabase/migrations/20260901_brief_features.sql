-- Build-brief features (Sept 2026): job board, class board, Q&A archive,
-- teaching videos, member resource library, and renewal-reminder logging.
--
-- HOW TO APPLY: already applied to the FAEMSE WEBSITE project
-- (iybsnqcffrhzhdpyoaqt) via migration tooling on 2026-09-01. Kept here as
-- the source of record; safe to re-run (everything is IF NOT EXISTS / OR
-- REPLACE / drop-then-create).
--
-- Design rules from the brief:
--   * One permission flag: member or not. Tier is a label, not a gate.
--   * Everything posted carries an expiration date; the public site hides
--     expired items automatically but admins keep them (hide, don't delete)
--     so a recurring class or job can be reposted instead of retyped.
--   * Q&A answers, videos, and the library are member benefits; questions
--     and video titles stay publicly listable so non-members can see what
--     they're missing. Jobs and classes are fully public.

-- ---------------------------------------------------------------------------
-- Membership check: current member (unexpired) or admin. SECURITY DEFINER so
-- policies on content tables don't depend on profiles' own RLS.
create or replace function public.is_current_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or (p.expires_at is not null and p.expires_at >= current_date))
  );
$$;

revoke all on function public.is_current_member() from public;
grant execute on function public.is_current_member() to authenticated;

-- ---------------------------------------------------------------------------
-- Job board (public — placement is a CoAEMSP program metric).
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  posted_on date not null default current_date,
  expires_on date not null,
  title text not null,
  employer text not null default '',
  location text not null default '',
  description text not null default '',
  apply_url text not null default '',
  created_at timestamptz not null default now()
);

-- Class board (public — schools email offerings, the board posts them).
create table if not exists public.class_listings (
  id uuid primary key default gen_random_uuid(),
  posted_on date not null default current_date,
  starts_on date,
  expires_on date not null,
  title text not null,
  provider text not null default '',
  location text not null default '',
  description text not null default '',
  contact text not null default '',
  created_at timestamptz not null default now()
);

-- Q&A archive (distilled listserv threads; answers are the member benefit).
create table if not exists public.qa_entries (
  id uuid primary key default gen_random_uuid(),
  published_on date not null default current_date,
  topic text not null default 'General',
  question text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, ''))
  ) stored
);
create index if not exists qa_entries_fts on public.qa_entries using gin (fts);

-- Teaching videos (hosted on YouTube/Vimeo, embedded; members watch).
create table if not exists public.teaching_videos (
  id uuid primary key default gen_random_uuid(),
  published_on date not null default current_date,
  title text not null,
  presenter text not null default '',
  topic text not null default 'Teaching',
  description text not null default '',
  video_url text not null,
  minutes int,
  created_at timestamptz not null default now()
);

-- Member resource library (one library with tags, split later if volume asks).
create table if not exists public.library_resources (
  id uuid primary key default gen_random_uuid(),
  published_on date not null default current_date,
  title text not null,
  tags text[] not null default '{}',
  description text not null default '',
  url text not null,
  created_at timestamptz not null default now()
);

-- Renewal-reminder log: which member got which reminder (90/60/30) for which
-- expiration date, so the daily job never double-sends. Service-role only.
create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  expires_at date not null,
  days_before int not null check (days_before in (90, 60, 30)),
  sent_at timestamptz not null default now(),
  unique (profile_id, expires_at, days_before)
);

alter table public.jobs enable row level security;
alter table public.class_listings enable row level security;
alter table public.qa_entries enable row level security;
alter table public.teaching_videos enable row level security;
alter table public.library_resources enable row level security;
alter table public.reminder_log enable row level security;
-- reminder_log: no policies on purpose — only the service role touches it.

-- Public boards: everyone sees unexpired posts; admins also see expired ones
-- (policies OR together), which is what makes "hide, don't delete" work.
drop policy if exists "jobs are public until expired" on public.jobs;
create policy "jobs are public until expired" on public.jobs
  for select using (expires_on >= current_date);

drop policy if exists "admins see all jobs" on public.jobs;
create policy "admins see all jobs" on public.jobs
  for select to authenticated using (public.is_admin());

drop policy if exists "admins manage jobs" on public.jobs;
create policy "admins manage jobs" on public.jobs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "classes are public until expired" on public.class_listings;
create policy "classes are public until expired" on public.class_listings
  for select using (expires_on >= current_date);

drop policy if exists "admins see all classes" on public.class_listings;
create policy "admins see all classes" on public.class_listings
  for select to authenticated using (public.is_admin());

drop policy if exists "admins manage classes" on public.class_listings;
create policy "admins manage classes" on public.class_listings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Member content: full rows for current members and admins only.
drop policy if exists "members read qa" on public.qa_entries;
create policy "members read qa" on public.qa_entries
  for select to authenticated using (public.is_current_member());

drop policy if exists "admins manage qa" on public.qa_entries;
create policy "admins manage qa" on public.qa_entries
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "members read videos" on public.teaching_videos;
create policy "members read videos" on public.teaching_videos
  for select to authenticated using (public.is_current_member());

drop policy if exists "admins manage videos" on public.teaching_videos;
create policy "admins manage videos" on public.teaching_videos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "members read library" on public.library_resources;
create policy "members read library" on public.library_resources
  for select to authenticated using (public.is_current_member());

drop policy if exists "admins manage library" on public.library_resources;
create policy "admins manage library" on public.library_resources
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.jobs, public.class_listings to anon, authenticated;
grant select on public.qa_entries, public.teaching_videos, public.library_resources to authenticated;
grant insert, update, delete on public.jobs, public.class_listings, public.qa_entries,
  public.teaching_videos, public.library_resources to authenticated;

-- ---------------------------------------------------------------------------
-- Public teasers: question titles and video titles are listable by anyone
-- (the join pitch), while answers and video URLs stay member-gated above.
create or replace function public.get_qa_index()
returns table (id uuid, published_on date, topic text, question text)
language sql
security definer
set search_path = public
stable
as $$
  select q.id, q.published_on, q.topic, q.question
  from public.qa_entries q
  order by q.published_on desc, q.created_at desc;
$$;

create or replace function public.get_video_index()
returns table (id uuid, published_on date, topic text, title text, presenter text, minutes int)
language sql
security definer
set search_path = public
stable
as $$
  select v.id, v.published_on, v.topic, v.title, v.presenter, v.minutes
  from public.teaching_videos v
  order by v.published_on desc, v.created_at desc;
$$;

revoke all on function public.get_qa_index() from public;
revoke all on function public.get_video_index() from public;
grant execute on function public.get_qa_index() to anon, authenticated;
grant execute on function public.get_video_index() to anon, authenticated;
