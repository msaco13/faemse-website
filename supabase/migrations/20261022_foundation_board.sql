-- The FAEMSE Foundation's board, for the Foundation page on faemse.org
-- (board, 2026-10-22: the page follows the Board of Directors page's format,
-- and the header's Foundation link opens it). Public read (the page is
-- public); admins edit it in Admin → Foundation page. Starts with the board
-- as the board listed it. The website keeps its own copy to fall back on if
-- the database can't be reached.
--
-- Removes nothing, so it can run again: the Supabase tools hold any
-- statement that removes something for a confirmation (2026-10-21).

create table if not exists public.foundation_board (
  id uuid primary key default gen_random_uuid(),
  role text not null check (length(trim(role)) > 0),
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.foundation_board enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'foundation_board' and policyname = 'foundation board is public') then
    create policy "foundation board is public" on public.foundation_board for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'foundation_board' and policyname = 'admins manage the foundation board') then
    create policy "admins manage the foundation board" on public.foundation_board for all to authenticated
      using ((select public.is_admin())) with check ((select public.is_admin()));
  end if;
end $$;

insert into public.foundation_board (role, name, sort_order)
select v.role, v.name, v.sort_order
from (values
  ('President', 'Angel Nater', 10),
  ('Executive Director', 'Louis Mallory', 20),
  ('Secretary', 'Melissa McNally', 30),
  ('At Large', 'Bill McGrath', 40),
  ('At Large', 'Phil Borum', 50)
) as v(role, name, sort_order)
where not exists (select 1 from public.foundation_board);
