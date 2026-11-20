-- Contact form daily cap: 50 -> 20 (AJ, 2026-11-20).
--
-- FAEMSE sends through Resend's free plan: 100 emails a day, for everything
-- (password links, renewal reminders, board notices, payment receipts). Each
-- contact message emails both board members, so it counts twice. At 50
-- messages a day a bot could use up the whole day's 100 and stop that day's
-- password emails and reminders. At 20 the contact form uses at most 40,
-- leaving at least 60 for the rest. The hourly cap stays at 10.
-- Replaces contact_messages_cap() from 20261120_contact_messages_limits.sql.

create or replace function public.contact_messages_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from contact_messages where created_at > now() - interval '1 hour') >= 10
     or (select count(*) from contact_messages where created_at > now() - interval '1 day') >= 20 then
    raise exception 'The board has received too many messages in a short time. Please try again later.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke all on function public.contact_messages_cap() from public, anon, authenticated;
