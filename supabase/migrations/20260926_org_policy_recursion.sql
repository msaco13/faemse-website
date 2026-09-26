-- Fix "infinite recursion detected in policy for relation organization_members".
--
-- Two policies in 20260922_organizations.sql compared a column against itself,
-- because an unqualified column name inside the EXISTS subquery resolves to
-- the subquery's own alias rather than to the row being checked:
--
--   organization_members: mine.organization_id = organization_id
--                         -> mine.organization_id = mine.organization_id
--                            (always true, and the subquery reads the same
--                            table under the same policy: recursion)
--   organizations:        om.organization_id = id
--                         -> om.organization_id = om.id (never true)
--
-- Effect since 2026-09-22 for anyone signed in: every API read of
-- organization_members or organizations returned 500 (the Board admin
-- Organizations tab and the seat column under People), and a member's own
-- payments list on the Members page returned 500 because its policy also
-- looks at organization_members. Security-definer RPCs (my_organizations,
-- is_current_member, get_directory) were not affected.
--
-- The membership test now lives in a security-definer helper, so no policy
-- reads organization_members under row security.

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = p_org and om.profile_id = auth.uid()
  );
$$;
revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;

drop policy if exists "members read their organizations" on public.organizations;
create policy "members read their organizations" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

drop policy if exists "members read their organization rows" on public.organization_members;
create policy "members read their organization rows" on public.organization_members
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "own or admin read payments" on public.membership_payments;
create policy "own or admin read payments" on public.membership_payments
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.is_admin())
    or (organization_id is not null and public.is_org_member(organization_id))
  );
