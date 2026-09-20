-- Two findings from the Supabase advisors, both ours, both from the renewals
-- migration. Neither changes behaviour.
--
-- 1. dues_cents() shipped without `set search_path`, unlike every other
--    function here. Without it the function resolves names against the
--    caller's search_path, so a caller who puts their own schema first can
--    change what an unqualified name means inside it. Nothing in the body is
--    unqualified today, but the guard costs nothing and the advisor is right.
-- 2. membership_payments.recorded_by is a foreign key with no index, so
--    deleting or updating a profile has to scan the whole payments table to
--    check it, and admin_list_payments() joins on it.

create or replace function public.dues_cents(p_tier text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case lower(coalesce(p_tier, 'active'))
    when 'institutional' then 25000
    when 'corporate' then 20000
    when 'honorary' then 0
    else 5000
  end;
$$;

create index if not exists membership_payments_recorded_by_idx
  on public.membership_payments (recorded_by);

-- ---------------------------------------------------------------------------
-- Settings: publish only what we mean to publish.
--
-- get_settings() is readable by anyone, signed in or not, because the site
-- needs the online-dues switch before you have an account. It returned the
-- whole settings blob, so anything an admin ever stored there would be public
-- by accident. Return only the keys we mean to be public; adding a key here
-- is a decision, not a side effect of saving a setting.
create or replace function public.get_settings()
returns jsonb
language sql
stable security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object('online_dues', coalesce(settings -> 'online_dues', 'false'::jsonb))
       from site_settings where id = 1),
    jsonb_build_object('online_dues', 'false'::jsonb)
  );
$$;

-- And merge rather than replace, which the whitelist above makes necessary:
-- the portal reads settings, patches one key, and writes back, so a write
-- would otherwise drop every key the reader could not see. Saving one setting
-- must never silently delete another.
--
-- Objects only: jsonb || jsonb is concatenation, not just a merge. An object
-- || an array yields an array, and settings -> 'online_dues' on an array is
-- null, so a stray array or scalar would silently turn the settings row into
-- something the switch can never read again.
create or replace function public.admin_set_settings(p_settings jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'Settings must be a JSON object';
  end if;
  update site_settings
  set settings = coalesce(settings, '{}'::jsonb) || p_settings,
      updated_at = now()
  where id = 1;
end $$;

-- ---------------------------------------------------------------------------
-- Membership gate: the 90-day grace window, for real this time.
--
-- 20260913_bylaws_documents.sql was a "paste into the SQL Editor" file, and
-- its function half never reached the live project: the database still ran
-- the 2026-09-01 gate (expires_at >= current_date). So the portal told a
-- member whose date had passed "you keep member access for 90 days" while
-- the database had already cut them off from the Q&A archive, videos, library,
-- directory and bylaws text. Bylaws 2.05 allow revocation only once dues are
-- 90 days past due; the gate now matches the bylaws, the portal, the README,
-- and the client-side mirror in src/lib/useMemberStatus.ts.
create or replace function public.is_current_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin'
           or (p.expires_at is not null and p.expires_at + 90 >= current_date))
  );
$$;
