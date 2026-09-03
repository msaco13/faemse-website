-- Homepage spotlight rotator + Q&A review queue (Sept 2026).
-- Already applied to the FAEMSE WEBSITE project; kept as the source of record.

-- Homepage spotlight rotator: the "one main screen that flips through"
-- (awards, schools, instructors, lab work, meetings). Board-editable.
create table if not exists public.spotlights (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 100,
  kicker text not null default '',
  title text not null,
  body text not null default '',
  image_url text not null default '',
  link_url text not null default '',
  link_label text not null default '',
  starts_on date not null default current_date,
  expires_on date,
  created_at timestamptz not null default now()
);
alter table public.spotlights enable row level security;

drop policy if exists "spotlights are public while active" on public.spotlights;
create policy "spotlights are public while active" on public.spotlights
  for select using (
    (starts_on <= current_date and (expires_on is null or expires_on >= current_date))
    or (select public.is_admin())
  );
drop policy if exists "admins insert spotlights" on public.spotlights;
create policy "admins insert spotlights" on public.spotlights
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admins update spotlights" on public.spotlights;
create policy "admins update spotlights" on public.spotlights
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins delete spotlights" on public.spotlights;
create policy "admins delete spotlights" on public.spotlights
  for delete to authenticated using ((select public.is_admin()));
grant select on public.spotlights to anon, authenticated;
grant insert, update, delete on public.spotlights to authenticated;

-- Q&A review queue: entries stay private until the board flips them on.
alter table public.qa_entries add column if not exists published boolean not null default true;

drop policy if exists "members read qa" on public.qa_entries;
create policy "members read qa" on public.qa_entries
  for select to authenticated
  using ((select public.is_current_member()) and (published or (select public.is_admin())));

create or replace function public.get_qa_index()
returns table (id uuid, published_on date, topic text, question text)
language sql
security definer
set search_path = public
stable
as $$
  select q.id, q.published_on, q.topic, q.question
  from public.qa_entries q
  where q.published
  order by q.published_on desc, q.created_at desc;
$$;
