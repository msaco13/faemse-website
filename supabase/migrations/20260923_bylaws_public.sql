-- Board decision 2026-09-23 (Jorge): the full bylaws text is public. The
-- documents table stays members-only in general; only the bylaws row is
-- readable by anyone, signed in or not. Other documents keep the member gate.
-- Applied to the FAEMSE WEBSITE project on 2026-09-23.
drop policy if exists "public read bylaws" on public.documents;
create policy "public read bylaws" on public.documents
  for select to anon, authenticated using (slug = 'bylaws');
grant select on public.documents to anon;

-- ---------------------------------------------------------------------------
-- Same day: the organization trigger functions are only ever called by their
-- triggers (Postgres refuses to run a trigger-returning function directly),
-- but the advisor flags the default execute grant. Revoked.
revoke all on function public.organization_members_guard() from public, anon, authenticated;
revoke all on function public.organization_members_unset_coordinator() from public, anon, authenticated;
