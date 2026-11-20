-- Contact form: signed-in people can send it, and a cap on how many
-- messages arrive (security review, AJ, 2026-11-20).
--
-- 1. Only anonymous visitors had an insert rule ("anon can submit messages"),
--    and the site sends a signed-in person's login with every request, so a
--    member or admin who used the contact form got an error. Signed-in people
--    now have the same rule.
-- 2. Every message fires the notify-board email (the notify-board-messages
--    trigger), and nothing limited how many could be added: a bot posting
--    straight to the database with the public key could flood the board's
--    inbox and use up the email quota. A message is now refused once 10 have
--    arrived in the last hour or 50 in the last day, whoever sends it. Real
--    traffic is far below that (none in the 30 days before this change).
--    The check runs before the row is written, so a refused message never
--    reaches the board email trigger.

drop policy if exists "signed-in can submit messages" on public.contact_messages;
create policy "signed-in can submit messages" on public.contact_messages
  for insert to authenticated with check (true);

-- Counts every message, which the sender's own role cannot see (only admins
-- can read contact_messages), hence security definer.
create or replace function public.contact_messages_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from contact_messages where created_at > now() - interval '1 hour') >= 10
     or (select count(*) from contact_messages where created_at > now() - interval '1 day') >= 50 then
    raise exception 'The board has received too many messages in a short time. Please try again later.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke all on function public.contact_messages_cap() from public, anon, authenticated;

drop trigger if exists contact_messages_cap on public.contact_messages;
create trigger contact_messages_cap
  before insert on public.contact_messages
  for each row execute function public.contact_messages_cap();
