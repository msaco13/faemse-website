-- Pay right after applying (board decision 2026-09-30): when Stripe confirms
-- a payment that carries an application id, stripe-webhook creates the login
-- if needed and then calls this to do the database half in one transaction:
-- fill the profile from the application, extend the paid-through date and
-- write the ledger row (extend_membership, which is idempotent per Stripe
-- session), and mark the application approved. Service role only.

create or replace function public.complete_paid_application(
  p_application uuid,
  p_profile uuid,
  p_amount_cents integer,
  p_stripe_session text,
  p_note text default ''
) returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  a membership_applications%rowtype;
  v_new date;
begin
  select * into a from membership_applications where id = p_application for update;
  if not found then raise exception 'No such application'; end if;

  -- The profile row may not exist yet for a brand-new login (ensure_profile
  -- only runs when the person first opens the portal). Create or fill it
  -- from what they typed on the form; never blank out something already
  -- on file, and never touch the admin role.
  insert into profiles (id, email, full_name, tier, phone, agency, county, cert_level)
  values (p_profile, lower(a.email), a.full_name, a.tier, a.phone, a.organization, a.county, a.cert_level)
  on conflict (id) do update set
    tier       = excluded.tier,
    full_name  = coalesce(nullif(profiles.full_name, ''), excluded.full_name),
    phone      = coalesce(nullif(profiles.phone, ''), excluded.phone),
    agency     = coalesce(nullif(profiles.agency, ''), excluded.agency),
    county     = coalesce(nullif(profiles.county, ''), excluded.county),
    cert_level = coalesce(nullif(profiles.cert_level, ''), excluded.cert_level);

  v_new := public.extend_membership(
    p_profile, 'stripe', p_amount_cents, 12,
    coalesce(p_note, '') || case when a.kind = 'renew' then ' · renewal form' else ' · application form' end,
    p_stripe_session, null);

  update membership_applications set status = 'approved' where id = p_application;
  return v_new;
end $$;

revoke all on function public.complete_paid_application(uuid, uuid, integer, text, text) from public, anon, authenticated;
