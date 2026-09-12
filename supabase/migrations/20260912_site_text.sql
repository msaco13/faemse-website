-- Admin-editable site wording (Sept 2026).
--
-- HOW TO APPLY (one time, ~1 minute):
--   1. Open the FAEMSE WEBSITE project (iybsnqcffrhzhdpyoaqt) in the
--      Supabase dashboard -> SQL Editor -> New query.
--   2. Paste this entire file and press Run.
--   3. Done. Admins see an "Edit text" toggle on the site immediately.
--
-- Until this runs, the site renders the wording that ships in the code and the
-- edit bar shows setup instructions instead of failing.
--
-- One row per editable string. `key` is the dotted id in the code
-- (e.g. home.hero.h1); `value` is the wording that replaces it. No row means
-- "use the words in the code", which is also what happens if this table is
-- unreachable, so a database outage can never blank the site.

create table if not exists public.site_text (
  key text primary key check (char_length(key) between 1 and 200),
  value text not null check (char_length(value) <= 8000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.site_text enable row level security;

-- The public site reads these strings anonymously.
drop policy if exists "site text is public" on public.site_text;
create policy "site text is public" on public.site_text
  for select using (true);

-- Only board admins change the wording. Same is_admin() gate as every other
-- admin-managed table, evaluated once per query (the initplan pattern).
drop policy if exists "admins insert site text" on public.site_text;
create policy "admins insert site text" on public.site_text
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "admins update site text" on public.site_text;
create policy "admins update site text" on public.site_text
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "admins delete site text" on public.site_text;
create policy "admins delete site text" on public.site_text
  for delete to authenticated using ((select public.is_admin()));

grant select on public.site_text to anon, authenticated;
grant insert, update, delete on public.site_text to authenticated;
