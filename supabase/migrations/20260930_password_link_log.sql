-- Throttle table for the password-link edge function: one row per password
-- email sent, so no address gets more than a few an hour. Service role only
-- (RLS on, no policies), like reminder_log.

create table if not exists public.password_link_log (
  id bigint generated always as identity primary key,
  email text not null,
  sent_at timestamptz not null default now()
);
create index if not exists password_link_log_email_sent_idx on public.password_link_log (email, sent_at desc);
alter table public.password_link_log enable row level security;
revoke all on table public.password_link_log from anon, authenticated;
