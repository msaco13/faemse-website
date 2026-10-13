-- 2026-10-13 (Jorge): the program hubs move from admins-only to members-only.
-- Current members (is_current_member(): paid up, or within the 90-day grace
-- window, or an admin) can read them; signed-out visitors still get nothing,
-- and only admins can change them (the "admins manage" policy from
-- 20261010_admin_documents.sql still covers writes).
--
-- The table keeps its name, admin_documents, even though members read it
-- now: renaming it would break the live site until the matching deploy.
-- Applied to the FAEMSE WEBSITE project on 2026-10-13.

drop policy if exists "current members read hubs" on public.admin_documents;
create policy "current members read hubs" on public.admin_documents
  for select to authenticated
  using ((select public.is_current_member()));
