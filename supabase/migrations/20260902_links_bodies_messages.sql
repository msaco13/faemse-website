-- Sept 2026 content-audit follow-ups. Applied to the FAEMSE WEBSITE project
-- (iybsnqcffrhzhdpyoaqt) on 2026-09-02; kept as the source of record. Safe to
-- re-run.
--
--   * Events get a link out (the brief: "listing page with links out").
--   * News posts get a full body so a state/policy update can carry the
--     plain-English context the brief asks for, not just a one-line excerpt.
--   * Contact-form messages become readable (and markable as handled) by
--     board admins inside the portal — previously only the Supabase
--     dashboard could see them, so a message could sit unread for weeks.

alter table public.events add column if not exists url text not null default '';
alter table public.news_posts add column if not exists body text not null default '';

alter table public.contact_messages add column if not exists handled boolean not null default false;

drop policy if exists "admins read messages" on public.contact_messages;
create policy "admins read messages" on public.contact_messages
  for select to authenticated using ((select public.is_admin()));

drop policy if exists "admins update messages" on public.contact_messages;
create policy "admins update messages" on public.contact_messages
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, update on public.contact_messages to authenticated;
