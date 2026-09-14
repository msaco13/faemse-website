-- Membership renewals (Sept 2026). Applied to the FAEMSE WEBSITE project on
-- 2026-09-14; kept as the source of record.
--
-- What this adds:
--   1. membership_payments — one row per dues payment (online through Stripe,
--      or a check/cash/waiver the board records by hand), with the paid-through
--      date before and after. The audit trail behind every expires_at.
--   2. extend_membership() — the one place a paid-through date moves forward:
--      twelve months from the later of today and the current date, never from
--      the payment date, so paying early never costs a member time. Service
--      role only (the Stripe webhook); admins go through admin_record_payment().
--   3. admin_record_payment() — the portal's "Record payment · +1 year" button.
--   4. admin_list_payments() — the portal's dues ledger.
--   5. site_settings.online_dues — the board's switch for online payment,
--      flipped in the portal once the Stripe secrets are in place.
--   6. A daily pg_cron job that calls the renewal-reminders edge function.
--      The function itself sends nothing until RESEND_API_KEY is set.

-- ---------------------------------------------------------------------------
-- 1. Payments ledger
create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'usd',
  method text not null check (method in ('stripe', 'check', 'cash', 'other', 'waived')),
  paid_on date not null default current_date,
  term_months integer not null default 12 check (term_months between 1 and 60),
  previous_expires date,
  new_expires date not null,
  note text not null default '',
  -- Stripe's Checkout Session id; unique so a redelivered webhook is a no-op.
  stripe_session_id text unique,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists membership_payments_profile_idx on public.membership_payments (profile_id, paid_on desc);

alter table public.membership_payments enable row level security;

-- Members see their own receipts; admins see the ledger. Nobody writes
-- directly: the two functions below are the only paths.
drop policy if exists "own or admin read payments" on public.membership_payments;
create policy "own or admin read payments" on public.membership_payments
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

grant select on public.membership_payments to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Dues by tier (cents). Board-confirmed amounts, Sept 2026 — the same
--    numbers as src/content/data.ts. Honorary carries no dues.
create or replace function public.dues_cents(p_tier text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(p_tier, 'active'))
    when 'institutional' then 25000
    when 'corporate' then 20000
    when 'honorary' then 0
    else 5000
  end;
$$;

-- The one way a paid-through date moves forward. Returns the new date.
-- A repeated Stripe session id returns the existing date without touching
-- anything (webhooks can be delivered more than once).
create or replace function public.extend_membership(
  p_profile uuid,
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
  v_tier text;
  v_new date;
  v_existing date;
begin
  if p_stripe_session is not null then
    select new_expires into v_existing from membership_payments where stripe_session_id = p_stripe_session;
    if found then return v_existing; end if;
  end if;

  select expires_at, tier into v_prev, v_tier from profiles where id = p_profile for update;
  if not found then raise exception 'No such member'; end if;

  -- Twelve months from the later of today and the current paid-through date.
  v_new := greatest(coalesce(v_prev, current_date), current_date) + make_interval(months => p_months);

  update profiles set expires_at = v_new where id = p_profile;

  insert into membership_payments
    (profile_id, amount_cents, method, term_months, previous_expires, new_expires, note, stripe_session_id, recorded_by)
  values
    (p_profile, coalesce(p_amount_cents, public.dues_cents(v_tier)), p_method, p_months, v_prev, v_new,
     coalesce(p_note, ''), p_stripe_session, p_recorded_by);

  return v_new;
end $$;

-- Service role only: the Stripe webhook. Admins use admin_record_payment.
revoke all on function public.extend_membership(uuid, text, integer, integer, text, text, uuid) from public, anon, authenticated;
grant execute on function public.extend_membership(uuid, text, integer, integer, text, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Admin: record a payment received off-line and extend the term.
create or replace function public.admin_record_payment(
  p_target uuid,
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
  return public.extend_membership(
    p_target, p_method,
    case when p_method = 'waived' then 0 else p_amount_cents end,
    p_months, p_note, null, auth.uid());
end $$;

revoke all on function public.admin_record_payment(uuid, text, integer, text, integer) from public, anon;
grant execute on function public.admin_record_payment(uuid, text, integer, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Admin: the dues ledger, newest first, with the member's name and email.
create or replace function public.admin_list_payments()
returns table (
  id uuid,
  profile_id uuid,
  full_name text,
  email text,
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
  select mp.id, mp.profile_id, p.full_name, p.email, mp.amount_cents, mp.method, mp.paid_on,
         mp.term_months, mp.previous_expires, mp.new_expires, mp.note, mp.created_at
  from membership_payments mp
  join profiles p on p.id = mp.profile_id
  where public.is_admin()
  order by mp.created_at desc
  limit 200;
$$;

revoke all on function public.admin_list_payments() from public, anon;
grant execute on function public.admin_list_payments() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Site settings: readable by the site (only non-sensitive switches live
--    here — today just online_dues), writable by admins through the existing
--    admin_set_settings() which checks is_admin().
grant execute on function public.get_settings() to anon, authenticated;
grant execute on function public.admin_set_settings(jsonb) to authenticated;

insert into public.site_settings (id, settings) values (1, '{}'::jsonb) on conflict (id) do nothing;
update public.site_settings
  set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('online_dues', coalesce((settings->>'online_dues')::boolean, false))
  where id = 1;

-- ---------------------------------------------------------------------------
-- 6. Reminders: a 7-day notice joins 90/60/30, and the daily job.
alter table public.reminder_log drop constraint if exists reminder_log_days_before_check;
alter table public.reminder_log add constraint reminder_log_days_before_check check (days_before in (90, 60, 30, 7));

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Every day at 12:00 UTC (08:00 Eastern in summer, 07:00 in winter). The
-- function only ever sends the reminders due that day, at most once each, so
-- calling it with the site's public anon key is safe: a stray caller can make
-- the job run early, not make it send anything extra.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'renewal-reminders-daily') then
    perform cron.unschedule('renewal-reminders-daily');
  end if;
  perform cron.schedule(
    'renewal-reminders-daily',
    '0 12 * * *',
    $job$
      select net.http_post(
        url := 'https://iybsnqcffrhzhdpyoaqt.supabase.co/functions/v1/renewal-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5YnNucWNmZnJoemhkcHlvYXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzg4NDcsImV4cCI6MjEwMzYxNDg0N30.2hOdsxw9ja-TFVV64v7tI31MukUqgeAPqYnkU_Kb-Ts"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $job$
  );
end $$;
