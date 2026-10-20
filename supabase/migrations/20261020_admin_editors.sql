-- The Admin tab's editors (board, 2026-10-20): the board page and the
-- sponsors list move from the website code into tables admins edit, and the
-- member directory shows each board member's position.
--
-- 1. board_members: the Board of Directors page, one row per seat. Public
--    read (the page is public); admins write.
-- 2. profiles.board_seat_id: links a seat to the member account of the
--    person holding it. The member directory shows that seat's position next
--    to their name and lists positions first, in the board page's order. Set
--    only through admin_link_board_seat(); members can't change it
--    (update_my_profile never touches it, and profiles has no member write
--    policy).
-- 3. sponsors: the corporate sponsors (homepage band and Sponsors page).
--    Public read; admins write. `logo` is either a logo bundled with the site
--    (public/sponsors/<logo>.webp) or the full address of an uploaded one.
--
-- Both tables start with what the site shows today. The website keeps its
-- own copy of these lists to fall back on if the database can't be reached.

-- Adding a column briefly locks profiles, which every signed-in page reads.
-- Give up after 5 seconds rather than queue behind live traffic and hold the
-- site up; just run it again.
set lock_timeout = '5s';

-- 1. The board page --------------------------------------------------------

create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('officer', 'director', 'staff')),
  role text not null check (length(trim(role)) > 0),
  name text not null check (length(trim(name)) > 0),
  blurb text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.board_members enable row level security;
drop policy if exists "board page is public" on public.board_members;
create policy "board page is public" on public.board_members for select using (true);
drop policy if exists "admins manage the board page" on public.board_members;
create policy "admins manage the board page" on public.board_members for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.board_members (section, role, name, blurb, sort_order)
select v.section, v.role, v.name, v.blurb, v.sort_order
from (values
  ('officer', 'President', 'Jorge Anzardo', 'Chief executive officer of the association. Presides at board and membership meetings, conducts its routine business with the Executive Director, and sits ex officio on every committee.', 10),
  ('officer', 'President-Elect', 'Bryan Spangler', 'Acts for the President whenever the President is absent, and succeeds to the presidency at the end of the term.', 20),
  ('officer', 'Secretary', 'Rochelle Goldberg', 'Custodian of the association''s records and minutes. Reviews membership applications, sends the notices the bylaws require, and oversees elections.', 30),
  ('director', 'Immediate Past President', 'Melissa McNally', 'Advisor to the board and chair of the Nominating Committee. Also the EMS Educator representative to the Florida EMS Advisory Council, an ex officio, non-voting seat under the bylaws.', 10),
  ('director', 'Member-at-Large', 'Matt Keeler', 'One of three directors elected by the Active membership to represent it on the board.', 20),
  ('director', 'Member-at-Large', 'Garth Richards', 'One of three directors elected by the Active membership to represent it on the board.', 30),
  ('director', 'Member-at-Large', 'Carlos Tavarez', 'One of three directors elected by the Active membership to represent it on the board.', 40),
  ('staff', 'Executive Director', 'James Dinsch', 'Appointed by the board as chief operating officer. Runs day-to-day operations: finances, records, dues, and this website. Attends board meetings; not a voting director.', 10)
) as v(section, role, name, blurb, sort_order)
where not exists (select 1 from public.board_members);

-- 2. Positions in the member directory -------------------------------------

alter table public.profiles add column if not exists board_seat_id uuid references public.board_members(id) on delete set null;

-- One account per seat: linking a seat unlinks whoever held it before.
-- p_profile null just unlinks the seat.
create or replace function public.admin_link_board_seat(p_seat uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update profiles set board_seat_id = null where board_seat_id = p_seat and (p_profile is null or id <> p_profile);
  if p_profile is not null then
    update profiles set board_seat_id = p_seat where id = p_profile;
  end if;
end $$;
revoke all on function public.admin_link_board_seat(uuid, uuid) from public, anon;
grant execute on function public.admin_link_board_seat(uuid, uuid) to authenticated;

-- get_directory gains two columns, so it is dropped and made again. A
-- migration runs as one transaction, so callers never see it missing.
-- position_rank orders the board first: officers, then directors, then
-- staff, each in the board page's order.
drop function if exists public.get_directory();
create function public.get_directory()
returns table (full_name text, cert_level text, county text, agency text, faemse_position text, position_rank integer)
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name, p.cert_level, p.county, p.agency,
    b.role,
    case when b.id is null then null
         else (case b.section when 'officer' then 0 when 'director' then 1 else 2 end) * 100000 + b.sort_order end
  from profiles p
  left join board_members b on b.id = p.board_seat_id
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
revoke all on function public.get_directory() from public, anon;
grant execute on function public.get_directory() to authenticated;

-- 3. Sponsors ---------------------------------------------------------------

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  url text not null default '',
  logo text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.sponsors enable row level security;
drop policy if exists "sponsors are public" on public.sponsors;
create policy "sponsors are public" on public.sponsors for select using (true);
drop policy if exists "admins manage sponsors" on public.sponsors;
create policy "admins manage sponsors" on public.sponsors for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.sponsors (name, url, logo, sort_order)
select v.name, v.url, v.logo, v.sort_order
from (values
  ('3B Scientific', 'https://www.3bscientific.com/', '', 10),
  ('American Medical Academy', 'https://ama.edu/', 'ama', 20),
  ('Braxton College', 'https://braxton.edu/', '', 30),
  ('Coral Springs Regional Institute of Public Safety', 'https://www.csrips.org/', 'csrips', 40),
  ('Dinsch Consulting Group', '', '', 50),
  ('Emergency Education Institute', 'https://eei.edu/', 'eei', 60),
  ('Emergency Educational Training Institute, Inc.', 'https://eeti.org/', 'eeti', 70),
  ('EMETSEEI Institute, Inc.', 'https://emetseei.edu/', 'emetseei', 80),
  ('First Response Training Group', 'https://www.frtg.edu/', '', 90),
  ('Henry Schein', 'https://www.henryschein.com/', 'henry-schein', 100),
  ('Limmer Education', 'https://limmereducation.com/', '', 110),
  ('Medical Career Academy', 'https://mcaedu.org/', 'mca', 120),
  ('Platinum Educational Group', 'https://www.platinumed.com/', 'platinum-ed', 130),
  ('Public Safety Group', 'https://www.psglearning.com/', 'jblpsg', 140),
  ('Southeastern Medical Academy', 'https://www.southeasternmedicalacademy.edu/', 'sema', 150),
  ('The Rescue Company 1', 'https://www.therescuecompany1.com/', 'the-rescco', 160)
) as v(name, url, logo, sort_order)
where not exists (select 1 from public.sponsors);
