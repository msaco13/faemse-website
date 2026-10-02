-- The voting roll (Jorge Anzardo, 2026-10-01): a CSV the board can drop into
-- whatever voting software it picks. Who may vote, per the bylaws and the
-- published tiers: Active members current in dues, and the representatives
-- of a current institutional membership (they hold Active privileges).
-- Corporate representatives (non-voting), honorary members, listserv-only
-- contacts, and anyone in the 90-day grace are left off. One row per
-- address; a person current both ways is listed once as an Active member.
-- Admin only, like get_listserv().
--
-- Applied to the FAEMSE WEBSITE project on 2026-10-02.

create or replace function public.get_voting_roll()
returns table (email text, full_name text, organization text, basis text, paid_through date)
language sql
stable
security definer
set search_path = public
as $$
  with own as (
    select lower(p.email) as email, p.full_name, p.agency as organization, 'Active member'::text as basis, p.expires_at as paid_through
    from profiles p
    where lower(coalesce(p.tier, 'active')) = 'active'
      and p.expires_at is not null and p.expires_at >= current_date
      and nullif(p.email, '') is not null
  ),
  reps as (
    select lower(p.email) as email, p.full_name, o.name as organization, 'Institutional representative'::text as basis, o.expires_at as paid_through
    from organization_members om
    join organizations o on o.id = om.organization_id
    join profiles p on p.id = om.profile_id
    where o.kind = 'institutional'
      and o.expires_at is not null and o.expires_at >= current_date
      and nullif(p.email, '') is not null
  ),
  everyone as (
    select *, 1 as rank from own
    union all
    select *, 2 as rank from reps
  )
  select distinct on (email) email, full_name, organization, basis, paid_through
  from everyone
  where public.is_admin()
  order by email, rank;
$$;

revoke all on function public.get_voting_roll() from public, anon;
grant execute on function public.get_voting_roll() to authenticated;
