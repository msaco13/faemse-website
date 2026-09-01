-- Policy tuning from the Supabase advisors (Sept 2026 audit).
--
-- Already applied to the FAEMSE WEBSITE project (iybsnqcffrhzhdpyoaqt) on
-- 2026-09-01; kept as the source of record. Safe to re-run.
--
-- What changed and why:
--   * auth.uid() / is_admin() / is_current_member() inside a policy were being
--     re-evaluated for every row. Wrapping them in (select ...) makes Postgres
--     evaluate them once per query (the "initplan" pattern).
--   * Each table had two or three overlapping SELECT policies for the same
--     role; every query ran all of them. Collapsed to one SELECT policy per
--     table, with admin write access as separate INSERT/UPDATE/DELETE
--     policies instead of FOR ALL (which silently added a third SELECT).
--   * The Q&A full-text index was never used — search runs client-side over
--     the small archive — so the generated column and index are dropped.
--   * The legacy settings RPCs (unused by the site) are no longer callable
--     from the public API.
-- Access rules are unchanged: same people see and edit the same rows.

-- ---------------------------------------------------------------------------
-- events / news_posts
drop policy if exists "events are public" on public.events;
drop policy if exists "admins manage events" on public.events;
create policy "events are public" on public.events
  for select using (true);
create policy "admins insert events" on public.events
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update events" on public.events
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete events" on public.events
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "news is public" on public.news_posts;
drop policy if exists "admins manage news" on public.news_posts;
create policy "news is public" on public.news_posts
  for select using (true);
create policy "admins insert news" on public.news_posts
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update news" on public.news_posts
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete news" on public.news_posts
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- jobs / class_listings: one SELECT policy — public until expired, admins
-- always (hide, don't delete).
drop policy if exists "jobs are public until expired" on public.jobs;
drop policy if exists "admins see all jobs" on public.jobs;
drop policy if exists "admins manage jobs" on public.jobs;
create policy "jobs are public until expired" on public.jobs
  for select using (expires_on >= current_date or (select public.is_admin()));
create policy "admins insert jobs" on public.jobs
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update jobs" on public.jobs
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete jobs" on public.jobs
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "classes are public until expired" on public.class_listings;
drop policy if exists "admins see all classes" on public.class_listings;
drop policy if exists "admins manage classes" on public.class_listings;
create policy "classes are public until expired" on public.class_listings
  for select using (expires_on >= current_date or (select public.is_admin()));
create policy "admins insert classes" on public.class_listings
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update classes" on public.class_listings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete classes" on public.class_listings
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Member content: is_current_member() already covers admins, so one SELECT
-- policy suffices.
drop policy if exists "members read qa" on public.qa_entries;
drop policy if exists "admins manage qa" on public.qa_entries;
create policy "members read qa" on public.qa_entries
  for select to authenticated using ((select public.is_current_member()));
create policy "admins insert qa" on public.qa_entries
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update qa" on public.qa_entries
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete qa" on public.qa_entries
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "members read videos" on public.teaching_videos;
drop policy if exists "admins manage videos" on public.teaching_videos;
create policy "members read videos" on public.teaching_videos
  for select to authenticated using ((select public.is_current_member()));
create policy "admins insert videos" on public.teaching_videos
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update videos" on public.teaching_videos
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete videos" on public.teaching_videos
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "members read library" on public.library_resources;
drop policy if exists "admins manage library" on public.library_resources;
create policy "members read library" on public.library_resources
  for select to authenticated using ((select public.is_current_member()));
create policy "admins insert library" on public.library_resources
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins update library" on public.library_resources
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete library" on public.library_resources
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- profiles: own row or admin, in one policy, evaluated once per query.
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "admins read all profiles" on public.profiles;
create policy "read own profile or any as admin" on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Unused full-text index (search is client-side over the small archive).
drop index if exists public.qa_entries_fts;
alter table public.qa_entries drop column if exists fts;

-- Legacy settings RPCs: not used by the site; keep them off the public API.
revoke execute on function public.get_settings() from anon, authenticated;
revoke execute on function public.admin_set_settings(jsonb) from anon, authenticated;

-- The member directory is a member benefit: previously any signed-in account
-- (including a lapsed one) could read it; now only current members/admins.
create or replace function public.get_directory()
returns table(full_name text, cert_level text, county text, agency text)
language sql
stable
security definer
set search_path = public
as $$
  select full_name, cert_level, county, agency from profiles
  where (select public.is_current_member())
    and show_in_directory
    and expires_at is not null and expires_at >= current_date
  order by full_name;
$$;
