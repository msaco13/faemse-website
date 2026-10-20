-- FAEMSE positions in the member directory (board, 2026-10-20).
--
-- A board or staff position (President, Secretary, Member-at-Large,
-- Executive Director, ...) gets its own column rather than job_title.
-- job_title came from the old roster and holds people's own jobs, and
-- several members are the president or executive director of their own
-- school, so the directory can't tell a FAEMSE officer from job_title.
-- Only admins set faemse_position, from the member editor
-- (admin_update_profile); update_my_profile never touches it. The member
-- directory shows it next to the name.

-- Adding a column briefly locks profiles, which every signed-in page reads.
-- Give up after 5 seconds rather than queue behind live traffic and hold
-- the site up; just run it again.
set lock_timeout = '5s';

alter table public.profiles add column if not exists faemse_position text;

-- get_directory gains a column, so it is dropped and made again. A migration
-- runs as one transaction, so callers never see it missing.
drop function if exists public.get_directory();
create function public.get_directory()
returns table (full_name text, cert_level text, county text, agency text, faemse_position text)
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name, p.cert_level, p.county, p.agency, p.faemse_position from profiles p
  where (select public.is_current_member())
    and p.show_in_directory
    and (
      (p.expires_at is not null and p.expires_at >= current_date)
      or exists (
        select 1 from organization_members om join organizations o on o.id = om.organization_id
        where om.profile_id = p.id and o.expires_at is not null and o.expires_at >= current_date
      )
    )
  order by p.full_name;
$$;
revoke all on function public.get_directory() from public, anon;
grant execute on function public.get_directory() to authenticated;

create or replace function public.admin_update_profile(p_target uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'Patch must be a JSON object'; end if;
  update profiles set
    full_name        = coalesce(p_patch->>'full_name', full_name),
    phone            = case when p_patch ? 'phone' then nullif(p_patch->>'phone', '') else phone end,
    job_title        = case when p_patch ? 'job_title' then nullif(p_patch->>'job_title', '') else job_title end,
    faemse_position  = case when p_patch ? 'faemse_position' then nullif(p_patch->>'faemse_position', '') else faemse_position end,
    org_type         = case when p_patch ? 'org_type' then nullif(p_patch->>'org_type', '') else org_type end,
    agency           = case when p_patch ? 'agency' then nullif(p_patch->>'agency', '') else agency end,
    alt_email        = case when p_patch ? 'alt_email' then nullif(lower(p_patch->>'alt_email'), '') else alt_email end,
    website          = case when p_patch ? 'website' then nullif(p_patch->>'website', '') else website end,
    listserv_opt_out = coalesce((p_patch->>'listserv_opt_out')::boolean, listserv_opt_out),
    listserv_email   = case when p_patch ? 'listserv_email' then nullif(lower(p_patch->>'listserv_email'), '') else listserv_email end
  where id = p_target;
end $$;
