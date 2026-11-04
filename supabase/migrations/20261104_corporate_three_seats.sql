-- Corporate memberships seat three people: the coordinator who pays plus two
-- representatives (board decision 2026-11-04, Jorge Anzardo). That is bylaws
-- 2.02.04's "up to three representatives" again, undoing the 2026-10-01
-- raise to five. Institutional stays at five. Everyone seated is a current
-- member for the organization's paid-through date plus the 90-day grace
-- window (is_current_member(), unchanged); corporate seats never vote
-- (get_voting_roll(), unchanged).
--
-- When this was written no corporate membership had more than three people
-- seated and no corporate application listed more than two, so nobody loses
-- a seat.
--
--   1. org_seat_cap(): corporate 3, institutional 5. The seat trigger reads it.
--   2. Applications: a corporate one lists at most two representatives. The
--      existing "at most four" check stays for institutional.
--   3. complete_paid_org_application():
--      a. seats at most cap - 1 representatives, in the order listed, so a
--         longer list (a form left open from before) seats the first ones
--         instead of failing the payment;
--      b. when the person paying is not seated, listed nobody, and the
--         membership is already full, they take the previous coordinator's
--         seat (that person keeps their login). Before, the seat trigger
--         refused the payer and the whole payment rolled back;
--      c. also returns seat_cap, and who gave up a seat under (b), for the
--         board's receipt.
--
-- Same code in the site: seatCap()/repRows() in src/lib/portal.ts (pinned in
-- tests/membership.test.ts), stripe-webhook and renewal-reminders.

-- ---------------------------------------------------------------------------
-- 1. Seats per kind.
create or replace function public.org_seat_cap(p_kind text)
returns integer
language sql
immutable
set search_path = public
as $$ select case lower(coalesce(p_kind, '')) when 'institutional' then 5 when 'corporate' then 3 else 0 end $$;

-- ---------------------------------------------------------------------------
-- 2. Corporate applications list at most two representatives.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'membership_applications_corporate_reps_check') then
    alter table public.membership_applications
      add constraint membership_applications_corporate_reps_check
      check (lower(coalesce(tier, '')) <> 'corporate' or jsonb_array_length(representatives) <= 2);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. The database half of a paid organization application. Unchanged from
--    20261002_org_signup.sql except where marked (3a, 3b, 3c).
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
  v_cap integer;
  v_seated integer;
  v_gave_up uuid;
begin
  select * into a from membership_applications where id = p_application for update;
  if not found then raise exception 'No such application'; end if;
  v_kind := lower(coalesce(a.tier, ''));
  if v_kind not in ('institutional', 'corporate') then
    raise exception 'Application % is not for an organization', p_application;
  end if;
  v_cap := public.org_seat_cap(v_kind);
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
  -- 3a: no more than the seats left after the coordinator's.
  for v_rep in select * from jsonb_array_elements(coalesce(p_reps, '[]'::jsonb)) loop
    exit when coalesce(array_length(v_ids, 1), 0) >= v_cap - 1;
    if (v_rep->>'profile_id') is null then continue; end if;
    if (v_rep->>'profile_id')::uuid = p_coordinator then continue; end if;
    if (v_rep->>'profile_id')::uuid = any (v_ids) then continue; end if;
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
    -- 3b: a new person paying for a full membership, nobody listed: they
    -- take the previous coordinator's seat instead of failing the payment.
    if (select count(*) from organization_members where organization_id = v_org) >= v_cap then
      delete from organization_members
        where id = (select id from organization_members
                    where organization_id = v_org and role = 'coordinator'
                    order by created_at limit 1)
        returning profile_id into v_gave_up;
    end if;
    insert into organization_members (organization_id, profile_id, role) values (v_org, p_coordinator, 'coordinator');
  end if;
  foreach v_id in array v_ids loop
    if not exists (select 1 from organization_members where organization_id = v_org and profile_id = v_id) then
      insert into organization_members (organization_id, profile_id, role) values (v_org, v_id, 'representative');
    end if;
  end loop;

  update membership_applications set status = 'approved' where id = p_application;
  select count(*) into v_seated from organization_members where organization_id = v_org;
  -- 3c: seat_cap and gave_up_seat added for the receipt.
  return jsonb_build_object('organization_id', v_org, 'name', (select name from organizations where id = v_org),
                            'new_expires', v_new, 'seated', v_seated, 'seat_cap', v_cap,
                            'gave_up_seat', (select coalesce(nullif(full_name, ''), email) from profiles where id = v_gave_up));
end $$;

revoke all on function public.complete_paid_org_application(uuid, uuid, jsonb, integer, text, text) from public, anon, authenticated;
grant execute on function public.complete_paid_org_application(uuid, uuid, jsonb, integer, text, text) to service_role;
