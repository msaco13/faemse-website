-- Events over several days (board, 2026-11-06): an optional last day, so the
-- calendar and the "On the board" strip show a conference's whole range
-- ("04–08 JAN 2027") and keep it upcoming until its last day. Empty for a
-- one-day event. The public already reads every column of events and admins
-- already write them, so no policy changes.

alter table public.events add column if not exists ends_on date;

alter table public.events drop constraint if exists events_ends_on_check;
alter table public.events add constraint events_ends_on_check
  check (ends_on is null or ends_on >= starts_on);
