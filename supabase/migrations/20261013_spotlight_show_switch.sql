-- Homepage spotlights: a Show switch per slide (Oct 2026). Off takes the
-- slide out of the homepage deck and its count, for visitors and members
-- alike; the board still sees and edits it in the Spotlights panel. A second
-- (restrictive) read policy keeps a hidden slide's words unreadable outside
-- the panel; it ANDs with "spotlights are public while active". Defaults on,
-- so nothing changes until the board unticks one. Applied before the code
-- that filters on it deployed.
alter table public.spotlights add column if not exists show_slide boolean not null default true;

drop policy if exists "hidden spotlights are admins only" on public.spotlights;
create policy "hidden spotlights are admins only" on public.spotlights
  as restrictive for select
  using (show_slide or (select public.is_admin()));
