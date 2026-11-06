-- Weekly job sweep (board decision 2026-11-06, Jorge Anzardo): once a week a
-- scheduled session finds open Fire/EMS, EMS and EMS education jobs in
-- Florida and posts them on the Job board by itself. Closed jobs come down.
--
-- The sweep never gets database access of its own. It talks to the
-- job-sweep edge function with its own key, and that function can call only
-- the two functions below, which touch only the jobs the sweep posted and its
-- own run log. Member data is out of its reach.
--
--   1. jobs: a category (fire_ems, ems, education), who posted it (board or
--      sweep), and what the sweep needs: whether it read the employer's own
--      posting (confirmed) or only a search listing, open until filled, when
--      it last saw the job, how many runs in a row missed it, and Hide.
--   2. Hidden jobs leave the public board; admins still see them, and the
--      sweep never posts them again.
--   3. job_sweep_runs: one row per run, for the Admin panel. Admins only.
--   4. job_sweep_state(): what the sweep needs before it starts.
--   5. job_sweep_apply(payload): posts what it found and takes down what
--      closed or vanished.
--   6. get_settings() also returns job_sweep_paused (the Admin switch).

-- ---------------------------------------------------------------------------
-- 1. Columns.
alter table public.jobs add column if not exists category text not null default 'education';
alter table public.jobs add column if not exists source text not null default 'board';
alter table public.jobs add column if not exists hidden boolean not null default false;
alter table public.jobs add column if not exists confirmed boolean not null default true;
alter table public.jobs add column if not exists open_until_filled boolean not null default false;
alter table public.jobs add column if not exists last_seen_on date;
alter table public.jobs add column if not exists missed_runs integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_category_check') then
    alter table public.jobs add constraint jobs_category_check check (category in ('fire_ems', 'ems', 'education'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'jobs_source_check') then
    alter table public.jobs add constraint jobs_source_check check (source in ('board', 'sweep'));
  end if;
end $$;

-- One row per posting the sweep knows, keyed by the posting's link.
create unique index if not exists jobs_sweep_url on public.jobs (apply_url) where source = 'sweep';

-- ---------------------------------------------------------------------------
-- 2. Hidden jobs are off the public board.
alter policy "jobs are public until expired" on public.jobs
  using (((expires_on >= current_date) and not hidden) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 3. Run log.
create table if not exists public.job_sweep_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  complete boolean not null default false,
  found integer not null default 0,
  added integer not null default 0,
  kept integer not null default 0,
  removed integer not null default 0,
  hidden_skipped integer not null default 0,
  unreadable integer not null default 0,
  notes text not null default ''
);
alter table public.job_sweep_runs enable row level security;
do $$
begin
  if not exists (select 1 from pg_policy where polname = 'admins read job sweep runs' and polrelid = 'public.job_sweep_runs'::regclass) then
    create policy "admins read job sweep runs" on public.job_sweep_runs for select using ((select public.is_admin()));
  end if;
end $$;
revoke insert, update, delete, truncate on public.job_sweep_runs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. What the sweep reads first: the switch, today's Florida date, and every
--    job it posted (hidden ones too, so it never posts those again).
create or replace function public.job_sweep_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'paused', coalesce((select (settings ->> 'job_sweep_paused')::boolean from site_settings where id = 1), false),
    'today', (now() at time zone 'America/New_York')::date,
    'listings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'url', apply_url, 'title', title, 'employer', employer, 'location', location, 'category', category,
        'closes_on', case when open_until_filled then null else expires_on end,
        'open_until_filled', open_until_filled, 'confirmed', confirmed,
        'found_on', posted_on, 'last_seen_on', last_seen_on, 'missed_runs', missed_runs, 'hidden', hidden)
        order by posted_on)
      from jobs where source = 'sweep'), '[]'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- 5. One run's results, in one transaction.
--
-- payload = {
--   complete: true when every search the sweep runs got through (a run cut
--             short never counts as having missed anything),
--   found: [{ url, title, employer, location, category, summary,
--             closes_on (YYYY-MM-DD or null), open_until_filled, confirmed }],
--   closed: [url, ...]   postings the sweep saw are closed or gone,
--   unreadable: number of pages it could not read,
--   notes: one short line
-- }
--
-- Rules:
-- - A found job is posted, or refreshed if already posted (same link). A job
--   an admin hid is never touched again.
-- - A job closing before today is not posted, and comes down if it was.
-- - Open until filled: listed for 14 days past the last time it was seen, so
--   a job the sweep stops seeing still comes down if the sweep stops running.
-- - A posted job missing from a complete run counts a miss; two misses in a
--   row and it comes down. One on the closed list comes down at once.
-- - Jobs the board posted by hand are never touched.
create or replace function public.job_sweep_apply(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/New_York')::date;
  v_complete boolean := coalesce((payload ->> 'complete')::boolean, false);
  v_item jsonb;
  v_url text;
  v_title text;
  v_closes date;
  v_open boolean;
  v_expires date;
  v_category text;
  v_found_urls text[] := array[]::text[];
  v_closed_urls text[] := array[]::text[];
  v_added integer := 0;
  v_kept integer := 0;
  v_removed integer := 0;
  v_hidden integer := 0;
  v_n integer;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'Payload must be a JSON object'; end if;
  if jsonb_typeof(coalesce(payload -> 'found', '[]'::jsonb)) <> 'array' then raise exception 'found must be a list'; end if;
  if jsonb_array_length(coalesce(payload -> 'found', '[]'::jsonb)) > 500 then raise exception 'Too many jobs in one run'; end if;

  select coalesce(array_agg(lower(trim(u))), array[]::text[]) into v_closed_urls
    from jsonb_array_elements_text(coalesce(payload -> 'closed', '[]'::jsonb)) u;

  for v_item in select * from jsonb_array_elements(coalesce(payload -> 'found', '[]'::jsonb)) loop
    v_url := trim(coalesce(v_item ->> 'url', ''));
    v_title := left(trim(coalesce(v_item ->> 'title', '')), 200);
    v_category := coalesce(v_item ->> 'category', '');
    if v_url !~* '^https?://[^\s]+$' or length(v_url) > 1000 or v_title = '' or v_category not in ('fire_ems', 'ems', 'education') then
      raise exception 'Bad job entry: %', left(v_item::text, 300);
    end if;
    v_open := coalesce((v_item ->> 'open_until_filled')::boolean, false);
    v_closes := nullif(v_item ->> 'closes_on', '')::date;
    if v_closes is null then v_open := true; end if;
    if v_closes is not null and v_closes < v_today then
      v_closed_urls := array_append(v_closed_urls, lower(v_url));
      continue;
    end if;
    v_expires := case when v_open then v_today + 14 else v_closes end;
    if lower(v_url) = any (v_found_urls) then continue; end if; -- listed twice in one run
    v_found_urls := array_append(v_found_urls, lower(v_url));

    if exists (select 1 from jobs where source = 'sweep' and lower(apply_url) = lower(v_url) and hidden) then
      v_hidden := v_hidden + 1;
      continue;
    end if;

    update jobs set
      title = v_title,
      employer = left(trim(coalesce(v_item ->> 'employer', '')), 200),
      location = left(trim(coalesce(v_item ->> 'location', '')), 200),
      category = v_category,
      description = left(trim(coalesce(v_item ->> 'summary', '')), 500),
      expires_on = v_expires,
      open_until_filled = v_open,
      confirmed = coalesce((v_item ->> 'confirmed')::boolean, false),
      last_seen_on = v_today,
      missed_runs = 0
    where source = 'sweep' and lower(apply_url) = lower(v_url);
    get diagnostics v_n = row_count;
    if v_n > 0 then
      v_kept := v_kept + 1;
    else
      insert into jobs (source, apply_url, title, employer, location, category, description, posted_on, expires_on,
                        open_until_filled, confirmed, last_seen_on, missed_runs)
      values ('sweep', v_url, v_title,
              left(trim(coalesce(v_item ->> 'employer', '')), 200),
              left(trim(coalesce(v_item ->> 'location', '')), 200),
              v_category,
              left(trim(coalesce(v_item ->> 'summary', '')), 500),
              v_today, v_expires, v_open, coalesce((v_item ->> 'confirmed')::boolean, false), v_today, 0);
      v_added := v_added + 1;
    end if;
  end loop;

  -- Closed or gone, closing date passed: down now.
  delete from jobs
    where source = 'sweep' and not hidden
      and (lower(apply_url) = any (v_closed_urls) or expires_on < v_today)
      and not (lower(apply_url) = any (v_found_urls));
  get diagnostics v_n = row_count;
  v_removed := v_removed + v_n;

  -- Not seen this time: a miss, counted only on a complete run.
  if v_complete then
    update jobs set missed_runs = missed_runs + 1
      where source = 'sweep' and not hidden and not (lower(apply_url) = any (v_found_urls));
    delete from jobs where source = 'sweep' and not hidden and missed_runs >= 2;
    get diagnostics v_n = row_count;
    v_removed := v_removed + v_n;
  end if;

  insert into job_sweep_runs (complete, found, added, kept, removed, hidden_skipped, unreadable, notes)
  values (v_complete, jsonb_array_length(coalesce(payload -> 'found', '[]'::jsonb)), v_added, v_kept, v_removed, v_hidden,
          greatest(coalesce((payload ->> 'unreadable')::integer, 0), 0), left(coalesce(payload ->> 'notes', ''), 500));

  return jsonb_build_object('added', v_added, 'kept', v_kept, 'removed', v_removed, 'hidden_skipped', v_hidden,
                            'on_board', (select count(*) from jobs where source = 'sweep' and not hidden and expires_on >= v_today));
end $$;

revoke all on function public.job_sweep_state() from public, anon, authenticated;
revoke all on function public.job_sweep_apply(jsonb) from public, anon, authenticated;
grant execute on function public.job_sweep_state() to service_role;
grant execute on function public.job_sweep_apply(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 6. The Admin switch, readable like the other two.
create or replace function public.get_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object(
       'online_dues', coalesce(settings -> 'online_dues', 'false'::jsonb),
       'reminders_paused', coalesce(settings -> 'reminders_paused', 'false'::jsonb),
       'job_sweep_paused', coalesce(settings -> 'job_sweep_paused', 'false'::jsonb))
     from site_settings where id = 1),
    jsonb_build_object('online_dues', 'false'::jsonb, 'reminders_paused', 'false'::jsonb, 'job_sweep_paused', 'false'::jsonb));
$$;
