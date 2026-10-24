-- The Board of Directors page shows the EMS Educator representative to the
-- Florida EMS Advisory Council as a seat of its own, ex officio and without
-- a vote (bylaws 5.02.01), apart from the Immediate Past President, a voting
-- director (5.02). One card held both, which read as if the Advisory Council
-- seat had a vote (board, 2026-10-22). Every card now says whether its seat
-- votes.
--
-- ex_officio marks a seat that sits with the board without a vote; staff
-- seats never vote (9.05). Melissa McNally holds both seats, as the site has
-- recorded since Sept 2026. The Immediate Past President's text loses its
-- Advisory Council sentence only if nobody has edited it since. Removes
-- nothing, so it can run again.

alter table public.board_members add column if not exists ex_officio boolean not null default false;

insert into public.board_members (section, role, name, blurb, sort_order, ex_officio)
select 'director', 'EMS Educator Representative to the Florida EMS Advisory Council', 'Melissa McNally',
  'The EMS educators'' representative on the state EMS Advisory Council. Under the bylaws the representative may sit with this board ex officio: attending board meetings and taking part in discussions and committees, without making motions or voting.',
  10, true
where not exists (select 1 from public.board_members where ex_officio);

update public.board_members
set blurb = 'Advisor and consultant to the board, and chair of the Nominating Committee.', updated_at = now()
where role = 'Immediate Past President'
  and blurb = 'Advisor to the board and chair of the Nominating Committee. Also the EMS Educator representative to the Florida EMS Advisory Council, an ex officio, non-voting seat under the bylaws.';
