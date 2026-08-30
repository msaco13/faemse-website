-- Editable site content: events + news, managed from the member portal.
--
-- HOW TO APPLY (one time, ~1 minute):
--   1. Open the FAEMSE WEBSITE project (iybsnqcffrhzhdpyoaqt) in the
--      Supabase dashboard → SQL Editor → New query.
--   2. Paste this entire file and press Run.
--   3. Done. The public site immediately reads events/news from these
--      tables, and admins see "Site content" editors on the Members page.
--
-- Until this runs, the site falls back to the bundled sample listings and
-- the admin editor shows setup instructions instead of failing.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null,
  title text not null,
  detail text not null default '',
  location text not null default '',
  tag text not null default 'Meeting',
  tag_color text not null default 'blue' check (tag_color in ('blue', 'red', 'green', 'gold')),
  created_at timestamptz not null default now()
);

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  published_on date not null,
  tag text not null default 'News',
  title text not null,
  excerpt text not null default '',
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.news_posts enable row level security;

-- The public site reads both tables anonymously.
drop policy if exists "events are public" on public.events;
create policy "events are public" on public.events
  for select using (true);

drop policy if exists "news is public" on public.news_posts;
create policy "news is public" on public.news_posts
  for select using (true);

-- Signed-in admins (profiles.role = 'admin') manage rows. The subquery reads
-- the caller's own profile row, which portal RLS already permits — no
-- dependency on the is_admin() helper's grants.
drop policy if exists "admins manage events" on public.events;
create policy "admins manage events" on public.events
  for all to authenticated
  using ((select p.role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select p.role from public.profiles p where p.id = auth.uid()) = 'admin');

drop policy if exists "admins manage news" on public.news_posts;
create policy "admins manage news" on public.news_posts
  for all to authenticated
  using ((select p.role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select p.role from public.profiles p where p.id = auth.uid()) = 'admin');

grant select on public.events, public.news_posts to anon, authenticated;
grant insert, update, delete on public.events, public.news_posts to authenticated;
