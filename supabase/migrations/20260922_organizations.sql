-- Organizations, contacts, and the fields the old system tracked (Sept 2026).
-- Applied to the FAEMSE WEBSITE project on 2026-09-22; kept as the record.
--
-- Why: the old membership system tied everything to an email address, so a
-- person holding two membership types (an individual member who is also the
-- corporate contact for their company) could only be managed for one of them.
-- The site had the same limit: one login, one tier, one paid-through date.
--
-- The fix keeps one login per person and moves institutional and corporate
-- memberships onto the organization that holds them:
--
--   profiles              one row per login; carries the person's OWN
--                         membership (individual or honorary) as before, plus
--                         the contact fields the old export had.
--   organizations         an institutional or corporate membership: name,
--                         kind, paid-through date, coordinator, and up to five
--                         (institutional) or three (corporate) representatives
--                         per the bylaws and the published tiers.
--   organization_members  who represents which organization. A person can
--                         sit on several, and hold their own membership too.
--   contacts              people on the listserv without a login: the state
--                         regulators who are not members, and members whose
--                         email the board is still tracking down.
--
-- "Is this person a current member?" is now: their own membership is current,
-- OR any organization they represent is current, OR they are a board admin.
-- Every gate (RLS, the directory, the portal) reads the same function.

-- ---------------------------------------------------------------------------
-- 1. The fields the old export tracked that the profile did not.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists org_type text,
  add column if not exists alt_email text,
  add column if not exists website text,
  add column if not exists listserv_opt_out boolean not null default false,
  add column if not exists listserv_email text;

-- ---------------------------------------------------------------------------
-- 2. Organizations and their representatives.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('institutional', 'corporate')),
  expires_at date,
  coordinator_id uuid references public.profiles (id) on delete set null,
  contact_email text,
  website text,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists organizations_name_kind_key on public.organizations (lower(name), kind);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'representative' check (role in ('coordinator', 'representative')),
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);
create index if not exists organization_members_profile_idx on public.organization_members (profile_id);

-- Seats per organization: the published tiers (and bylaws 2.02.03/.04).
create or replace function public.org_seat_cap(p_kind text)
returns integer
language sql
immutable
set search_path = public
as $$ select case lower(coalesce(p_kind, '')) when 'institutional' then 5 when 'corporate' then 3 else 0 end $$;

-- The cap is enforced where the rows are written, not in the UI, so the
-- import and the admin panel cannot disagree. A coordinator is also recorded
-- on the organization row so the reminder job has one place to look.
create or replace function public.organization_members_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_count integer;
begin
  select kind into v_kind from organizations where id = new.organization_id;
  select count(*) into v_count from organization_members
    where organization_id = new.organization_id and (tg_op = 'INSERT' or id <> new.id);
  if v_count >= public.org_seat_cap(v_kind) then
    raise exception 'That % membership already has its % representatives', v_kind, public.org_seat_cap(v_kind);
  end if;
  if new.role = 'coordinator' then
    update organization_members set role = 'representative'
      where organization_id = new.organization_id and role = 'coordinator' and id <> new.id;
    update organizations set coordinator_id = new.profile_id where id = new.organization_id;
  end if;
  return new;
end $$;

drop trigger if exists organization_members_guard on public.organization_members;
create trigger organization_members_guard
  before insert or update on public.organization_members
  for each row execute function public.organization_members_guard();

-- If the coordinator's seat is removed, the organization loses its coordinator.
create or replace function public.organization_members_unset_coordinator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update organizations set coordinator_id = null
    where id = old.organization_id and coordinator_id = old.profile_id;
  return old;
end $$;

drop trigger if exists organization_members_unset_coordinator on public.organization_members;
create trigger organization_members_unset_coordinator
  after delete on public.organization_members
  for each row execute function public.organization_members_unset_coordinator();

-- ---------------------------------------------------------------------------
-- 3. Listserv contacts without a login.
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  organization text,
  job_title text,
  kind text not null default 'other' check (kind in ('regulatory', 'honorary', 'other')),
  listserv_opt_out boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. The membership gate, now covering organizations. Same 90-day grace.
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
  )
  or exists (
    select 1 from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.profile_id = auth.uid()
      and o.expires_at is not null and o.expires_at + 90 >= current_date
  );
$$;

-- The directory lists anyone current in either way.
create or replace function public.get_directory()
returns table (full_name text, cert_level text, county text, agency text)
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name, p.cert_level, p.county, p.agency from profiles p
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

-- ---------------------------------------------------------------------------
-- 5. Row security. Admins manage everything; a member can see the
--    organizations they represent and who else represents them.
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.contacts enable row level security;

drop policy if exists "admins manage organizations" on public.organizations;
create policy "admins manage organizations" on public.organizations
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "members read their organizations" on public.organizations;
create policy "members read their organizations" on public.organizations
  for select to authenticated
  using (exists (select 1 from public.organization_members om where om.organization_id = id and om.profile_id = (select auth.uid())));

drop policy if exists "admins manage organization members" on public.organization_members;
create policy "admins manage organization members" on public.organization_members
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "members read their organization rows" on public.organization_members;
create policy "members read their organization rows" on public.organization_members
  for select to authenticated
  using (exists (select 1 from public.organization_members mine where mine.organization_id = organization_id and mine.profile_id = (select auth.uid())));

drop policy if exists "admins manage contacts" on public.contacts;
create policy "admins manage contacts" on public.contacts
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Payments and reminders can belong to an organization.
alter table public.membership_payments
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
alter table public.membership_payments alter column profile_id drop not null;
alter table public.membership_payments drop constraint if exists membership_payments_target_check;
alter table public.membership_payments
  add constraint membership_payments_target_check check ((profile_id is null) <> (organization_id is null));
create index if not exists membership_payments_org_idx on public.membership_payments (organization_id, paid_on desc);

drop policy if exists "own or admin read payments" on public.membership_payments;
create policy "own or admin read payments" on public.membership_payments
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.is_admin())
    or (organization_id is not null and exists (
      select 1 from public.organization_members om
      where om.organization_id = membership_payments.organization_id and om.profile_id = (select auth.uid())))
  );

alter table public.reminder_log
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
alter table public.reminder_log alter column profile_id drop not null;
alter table public.reminder_log drop constraint if exists reminder_log_target_check;
alter table public.reminder_log
  add constraint reminder_log_target_check check ((profile_id is null) <> (organization_id is null));
create unique index if not exists reminder_log_org_key
  on public.reminder_log (organization_id, expires_at, days_before) where organization_id is not null;

-- The one way an organization's paid-through date moves forward. Mirrors
-- extend_membership(): twelve months from the later of today and the current
-- date, idempotent on the Stripe session id.
create or replace function public.extend_organization(
  p_org uuid,
  p_method text,
  p_amount_cents integer default null,
  p_months integer default 12,
  p_note text default '',
  p_stripe_session text default null,
  p_recorded_by uuid default null
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev date;
  v_kind text;
  v_new date;
  v_existing date;
begin
  if p_stripe_session is not null then
    select new_expires into v_existing from membership_payments where stripe_session_id = p_stripe_session;
    if found then return v_existing; end if;
  end if;
  select expires_at, kind into v_prev, v_kind from organizations where id = p_org for update;
  if not found then raise exception 'No such organization'; end if;
  v_new := greatest(coalesce(v_prev, current_date), current_date) + make_interval(months => p_months);
  update organizations set expires_at = v_new where id = p_org;
  insert into membership_payments
    (organization_id, amount_cents, method, term_months, previous_expires, new_expires, note, stripe_session_id, recorded_by)
  values
    (p_org, coalesce(p_amount_cents, public.dues_cents(v_kind)), p_method, p_months, v_prev, v_new,
     coalesce(p_note, ''), p_stripe_session, p_recorded_by);
  return v_new;
end $$;

revoke all on function public.extend_organization(uuid, text, integer, integer, text, text, uuid) from public, anon, authenticated;
grant execute on function public.extend_organization(uuid, text, integer, integer, text, text, uuid) to service_role;

create or replace function public.admin_record_org_payment(
  p_org uuid,
  p_method text default 'check',
  p_amount_cents integer default null,
  p_note text default '',
  p_months integer default 12
)
returns date
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_method not in ('check', 'cash', 'other', 'waived') then
    raise exception 'Method must be check, cash, other, or waived';
  end if;
  return public.extend_organization(
    p_org, p_method,
    case when p_method = 'waived' then 0 else p_amount_cents end,
    p_months, p_note, null, auth.uid());
end $$;

revoke all on function public.admin_record_org_payment(uuid, text, integer, text, integer) from public, anon;
grant execute on function public.admin_record_org_payment(uuid, text, integer, text, integer) to authenticated;

-- The ledger now names the organization when the payment was theirs.
drop function if exists public.admin_list_payments();
create function public.admin_list_payments()
returns table (
  id uuid,
  profile_id uuid,
  organization_id uuid,
  full_name text,
  email text,
  organization_name text,
  amount_cents integer,
  method text,
  paid_on date,
  term_months integer,
  previous_expires date,
  new_expires date,
  note text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select mp.id, mp.profile_id, mp.organization_id, p.full_name, p.email, o.name, mp.amount_cents, mp.method, mp.paid_on,
         mp.term_months, mp.previous_expires, mp.new_expires, mp.note, mp.created_at
  from membership_payments mp
  left join profiles p on p.id = mp.profile_id
  left join organizations o on o.id = mp.organization_id
  where public.is_admin()
  order by mp.created_at desc
  limit 200;
$$;

revoke all on function public.admin_list_payments() from public, anon;
grant execute on function public.admin_list_payments() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Admin edits to the new profile fields (the member's own form keeps its
--    own RPC and its own smaller set of fields).
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
    org_type         = case when p_patch ? 'org_type' then nullif(p_patch->>'org_type', '') else org_type end,
    agency           = case when p_patch ? 'agency' then nullif(p_patch->>'agency', '') else agency end,
    alt_email        = case when p_patch ? 'alt_email' then nullif(lower(p_patch->>'alt_email'), '') else alt_email end,
    website          = case when p_patch ? 'website' then nullif(p_patch->>'website', '') else website end,
    listserv_opt_out = coalesce((p_patch->>'listserv_opt_out')::boolean, listserv_opt_out),
    listserv_email   = case when p_patch ? 'listserv_email' then nullif(lower(p_patch->>'listserv_email'), '') else listserv_email end
  where id = p_target;
end $$;

revoke all on function public.admin_update_profile(uuid, jsonb) from public, anon;
grant execute on function public.admin_update_profile(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. What a member sees about their own organizations.
create or replace function public.my_organizations()
returns table (id uuid, name text, kind text, expires_at date, role text, coordinator_name text, seats_used integer, seat_cap integer)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, o.kind, o.expires_at, om.role, c.full_name,
         (select count(*)::integer from organization_members x where x.organization_id = o.id),
         public.org_seat_cap(o.kind)
  from organization_members om
  join organizations o on o.id = om.organization_id
  left join profiles c on c.id = o.coordinator_id
  where om.profile_id = auth.uid()
  order by o.name;
$$;

revoke all on function public.my_organizations() from public, anon;
grant execute on function public.my_organizations() to authenticated;

-- ---------------------------------------------------------------------------
-- 9. The listserv, ready for Gaggle: one row per address, name attached.
--    Current members (own or through an organization, grace included), board
--    admins, and listserv-only contacts; anyone who opted out is left off;
--    a "special listserv email" is used in place of the login email.
create or replace function public.get_listserv()
returns table (email text, full_name text, source text)
language sql
stable
security definer
set search_path = public
as $$
  with people as (
    select lower(coalesce(nullif(p.listserv_email, ''), p.email)) as email, p.full_name,
           case when p.role = 'admin' then 'board' else 'member' end as source
    from profiles p
    where public.is_admin()
      and not p.listserv_opt_out
      and coalesce(nullif(p.listserv_email, ''), p.email) is not null
      and (
        p.role = 'admin'
        or (p.expires_at is not null and p.expires_at + 90 >= current_date)
        or exists (select 1 from organization_members om join organizations o on o.id = om.organization_id
                   where om.profile_id = p.id and o.expires_at is not null and o.expires_at + 90 >= current_date)
      )
    union all
    select lower(c.email), c.full_name, c.kind
    from contacts c
    where public.is_admin() and not c.listserv_opt_out and nullif(c.email, '') is not null
  )
  select distinct on (email) email, full_name, source from people order by email, source;
$$;

revoke all on function public.get_listserv() from public, anon;
grant execute on function public.get_listserv() to authenticated;

-- ---------------------------------------------------------------------------
-- 10. A switch to hold renewal reminders (board decision pending). Public
--     like online_dues: the reminder job reads it with the site's anon key.
create or replace function public.get_settings()
returns jsonb
language sql
stable security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
        'online_dues', coalesce(settings -> 'online_dues', 'false'::jsonb),
        'reminders_paused', coalesce(settings -> 'reminders_paused', 'false'::jsonb))
       from site_settings where id = 1),
    jsonb_build_object('online_dues', 'false'::jsonb, 'reminders_paused', 'false'::jsonb)
  );
$$;

update public.site_settings
  set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('reminders_paused', true), updated_at = now()
  where id = 1;
