-- Organizations sign up and renew on their own (board decisions 2026-10-01,
-- Jorge Anzardo with James Dinsch):
--
--   1. Corporate memberships seat five representatives, the same as
--      institutional. Bylaws 2.02.04 says three, but corporate representatives
--      do not vote, so the board set the cap at five.
--   2. The application form takes the coordinator's details plus up to four
--      representatives (name and email). The coordinator is the fifth seat.
--   3. When the card clears, the organization is created or found, its
--      paid-through date moves, the people listed are seated, and the
--      application is approved. Nothing waits on the board. On a renewal the
--      people listed replace last year's representatives, so an organization
--      never has to renew the same names.
--
-- Applied to the FAEMSE WEBSITE project on 2026-10-02.

-- ---------------------------------------------------------------------------
-- 1. Five seats for both kinds. The trigger that enforces the cap reads this.
create or replace function public.org_seat_cap(p_kind text)
returns integer
language sql
immutable
set search_path = public
as $$ select case lower(coalesce(p_kind, '')) when 'institutional' then 5 when 'corporate' then 5 else 0 end $$;

-- ---------------------------------------------------------------------------
-- 2. Representatives on the application: a JSON array of {name, email}, at
--    most four. Blank for individual applications.
alter table public.membership_applications
  add column if not exists representatives jsonb not null default '[]'::jsonb;
alter table public.membership_applications drop constraint if exists membership_applications_representatives_check;
alter table public.membership_applications
  add constraint membership_applications_representatives_check
  check (jsonb_typeof(representatives) = 'array' and jsonb_array_length(representatives) <= 4);

-- ---------------------------------------------------------------------------
-- 3. The database half of a paid organization application, in one
--    transaction. stripe-webhook creates the logins first (one per person
--    listed) and passes their ids in p_reps as [{profile_id, name, email}].
--
--    The coordinator's own membership (profiles.expires_at, tier) is not
--    touched: the organization is the membership, and the coordinator is
--    current through their seat on it, exactly like the representatives.
--
--    Finding the organization: by name and kind first (case and spaces
--    ignored); on a renewal, failing that, the organization this person
--    already coordinates. Otherwise a new one is created.
--
--    Seats: the coordinator always, then the representatives in the order
--    given. If the form listed at least one representative, anyone seated
--    before who is not on the new list is unseated (they keep their login).
--    If it listed none, the existing representatives stay, so a coordinator
--    renewing in a hurry does not clear the roster by accident.
create or replace function public.complete_paid_org_application(
  p_application uuid,
  p_coordinator uuid,
  p_reps jsonb,
  p_amount_cents integer,
  p_stripe_session text,
  p_note text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a membership_applications%rowtype;
  v_kind text;
  v_name text;
  v_org uuid;
  v_new date;
  v_rep jsonb;
  v_id uuid;
  v_ids uuid[] := array[]::uuid[];
  v_seated integer;
begin
  select * into a from membership_applications where id = p_application for update;
  if not found then raise exception 'No such application'; end if;
  v_kind := lower(coalesce(a.tier, ''));
  if v_kind not in ('institutional', 'corporate') then
    raise exception 'Application % is not for an organization', p_application;
  end if;
  v_name := nullif(regexp_replace(trim(coalesce(a.organization, '')), '\s+', ' ', 'g'), '');
  if v_name is null then v_name := trim(a.full_name) || '''s organization'; end if;

  -- The coordinator's profile row may not exist yet (ensure_profile runs on
  -- the first portal visit). Create or fill it; never blank what is on file.
  insert into profiles (id, email, full_name, phone, agency, county, cert_level)
  values (p_coordinator, lower(a.email), a.full_name, a.phone, v_name, a.county, a.cert_level)
  on conflict (id) do update set
    full_name  = coalesce(nullif(profiles.full_name, ''), excluded.full_name),
    phone      = coalesce(nullif(profiles.phone, ''), excluded.phone),
    agency     = coalesce(nullif(profiles.agency, ''), excluded.agency),
    county     = coalesce(nullif(profiles.county, ''), excluded.county),
    cert_level = coalesce(nullif(profiles.cert_level, ''), excluded.cert_level);

  -- Find or create the organization.
  select id into v_org from organizations
    where lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = lower(v_name) and kind = v_kind
    limit 1;
  if v_org is null and a.kind = 'renew' then
    select id into v_org from organizations
      where coordinator_id = p_coordinator and kind = v_kind
      order by expires_at desc nulls last limit 1;
  end if;
  if v_org is null then
    insert into organizations (name, kind, coordinator_id, contact_email)
    values (v_name, v_kind, p_coordinator, lower(a.email))
    returning id into v_org;
  else
    update organizations set coordinator_id = p_coordinator, contact_email = lower(a.email) where id = v_org;
  end if;

  -- Money and date. Idempotent per Stripe session.
  v_new := public.extend_organization(
    v_org, 'stripe', p_amount_cents, 12,
    coalesce(p_note, '') || case when a.kind = 'renew' then ' · renewal form' else ' · application form' end,
    p_stripe_session, null);

  -- Representatives' profile rows, and the list of ids to seat.
  for v_rep in select * from jsonb_array_elements(coalesce(p_reps, '[]'::jsonb)) loop
    if (v_rep->>'profile_id') is null then continue; end if;
    if (v_rep->>'profile_id')::uuid = p_coordinator then continue; end if;
    insert into profiles (id, email, full_name, agency)
    values ((v_rep->>'profile_id')::uuid, lower(v_rep->>'email'), v_rep->>'name', v_name)
    on conflict (id) do update set
      full_name = coalesce(nullif(profiles.full_name, ''), excluded.full_name),
      agency    = coalesce(nullif(profiles.agency, ''), excluded.agency);
    v_ids := array_append(v_ids, (v_rep->>'profile_id')::uuid);
  end loop;

  -- Seat them: unseat last year's people only when a new list was given;
  -- coordinator first so the cap can never block them; then the list.
  -- Plain inserts guarded by an existence check, not upserts: the seat-cap
  -- trigger fires before ON CONFLICT is evaluated, so re-seating someone who
  -- is already seated would trip it (or, for the coordinator, touch the same
  -- row twice in one statement).
  if array_length(v_ids, 1) > 0 then
    delete from organization_members
      where organization_id = v_org and profile_id <> p_coordinator and not (profile_id = any (v_ids));
  end if;
  if exists (select 1 from organization_members where organization_id = v_org and profile_id = p_coordinator) then
    update organization_members set role = 'coordinator'
      where organization_id = v_org and profile_id = p_coordinator and role <> 'coordinator';
  else
    insert into organization_members (organization_id, profile_id, role) values (v_org, p_coordinator, 'coordinator');
  end if;
  foreach v_id in array v_ids loop
    if not exists (select 1 from organization_members where organization_id = v_org and profile_id = v_id) then
      insert into organization_members (organization_id, profile_id, role) values (v_org, v_id, 'representative');
    end if;
  end loop;

  update membership_applications set status = 'approved' where id = p_application;
  select count(*) into v_seated from organization_members where organization_id = v_org;
  return jsonb_build_object('organization_id', v_org, 'name', (select name from organizations where id = v_org),
                            'new_expires', v_new, 'seated', v_seated);
end $$;

revoke all on function public.complete_paid_org_application(uuid, uuid, jsonb, integer, text, text) from public, anon, authenticated;
grant execute on function public.complete_paid_org_application(uuid, uuid, jsonb, integer, text, text) to service_role;
