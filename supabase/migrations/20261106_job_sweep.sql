-- Weekly job sweep (board decision 2026-11-06, Jorge Anzardo): once a week a
-- scheduled session finds open Fire/EMS, EMS and EMS education jobs in
-- Florida and posts them on the Job board by itself. Closed jobs come down.
--
-- The sweep never gets database access of its own. It talks to the
-- job-sweep edge function with its own key, and that function can call only
-- the two functions below, which touch only the jobs the sweep posted and its
-- own run log. Member data is out of its reach.
--
--   1. jobs: a category (fire_ems, ems, education), who posted it (board,
--      sweep or member), a required link to apply, and what the sweep needs: whether it read the employer's own
--      posting (confirmed) or only a search listing, open until filled, when
--      it last saw the job, how many runs in a row missed it, and Hide.
--   2. Hidden jobs leave the public board; admins still see them, and the
--      sweep never posts them again.
--   3. job_sweep_runs: one row per run, for the Admin panel. Admins only.
--   4. job_sweep_state(): what the sweep needs before it starts.
--   5. job_sweep_apply(payload): posts what it found and takes down what
--      closed or vanished.
--   6. get_settings() also returns job_sweep_paused (the Admin switch).
--   7. Members add jobs themselves (board, 2026-11-06): any current member,
--      signed in on the Job board, through member_add_job(), with the link to
--      apply, the title and the employer. It posts right away as "Shared by a
--      member", marked "details coming"; admins see who in job_submissions
--      and can hide or delete it. At the weekly sweep the sweep reads each
--      member's link, fills in the details (city, closing date, type, a
--      summary if there is none) and takes the job down if it closed. The
--      sweep never posts a second copy of a job already on the board.

-- ---------------------------------------------------------------------------
-- 1. Columns.
-- No type yet: a member's job until the weekly sweep sorts it.
alter table public.jobs add column if not exists category text default 'education';
alter table public.jobs add column if not exists source text not null default 'board';
alter table public.jobs add column if not exists hidden boolean not null default false;
alter table public.jobs add column if not exists confirmed boolean not null default true;
alter table public.jobs add column if not exists open_until_filled boolean not null default false;
alter table public.jobs add column if not exists last_seen_on date;
alter table public.jobs add column if not exists missed_runs integer not null default 0;
alter table public.jobs add column if not exists needs_details boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_category_check') then
    alter table public.jobs add constraint jobs_category_check check (category is null or category in ('fire_ems', 'ems', 'education'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'jobs_source_check') then
    alter table public.jobs add constraint jobs_source_check check (source in ('board', 'sweep', 'member'));
  end if;
  -- Every job on the board has a link to apply, whoever posts it: the
  -- sweep, a member or the board by hand (board, 2026-11-06).
  if not exists (select 1 from pg_constraint where conname = 'jobs_apply_url_check') then
    alter table public.jobs add constraint jobs_apply_url_check check (apply_url ~* '^https?://[^\s]+$' and length(apply_url) <= 1000);
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
  already_listed integer not null default 0,
  members_checked integer not null default 0,
  members_filled integer not null default 0,
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
      from jobs where source = 'sweep'), '[]'::jsonb),
    -- Jobs the board or a member posted, still up: the sweep leaves these
    -- off its own list instead of posting them twice.
    'already_listed', coalesce((
      select jsonb_agg(jsonb_build_object('url', apply_url, 'title', title, 'employer', employer))
      from jobs where source <> 'sweep' and not hidden and expires_on >= (now() at time zone 'America/New_York')::date), '[]'::jsonb),
    -- Jobs members shared that are up: the sweep reads each link, fills in
    -- what's missing (needs_details: never checked yet) and reports closures.
    'member_jobs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'url', apply_url, 'title', title, 'employer', employer, 'location', location, 'category', category,
        'description', description, 'closes_on', case when open_until_filled then null else expires_on end,
        'needs_details', needs_details, 'shared_on', posted_on) order by posted_on)
      from jobs where source = 'member' and not hidden and expires_on >= (now() at time zone 'America/New_York')::date), '[]'::jsonb));
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
--   member_updates: [{ id, status, title, employer, location, category,
--             summary, closes_on, confirmed }] for jobs members shared;
--             status: filled (details read from the link), open (still open,
--             nothing new), closed (closed or gone: comes down), unreadable
--             (couldn't read it: type set from the title, nothing else),
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
-- - A member's job keeps its link and anything the member wrote in the
--   description; the sweep fills in the title, employer and city as the
--   posting gives them, the closing date and the type, and a summary only
--   when the member left the description empty.
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
  v_listed integer := 0;
  v_mchecked integer := 0;
  v_mfilled integer := 0;
  v_mid uuid;
  v_status text;
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

    -- Hidden by an admin, whoever posted it: never posted again.
    if exists (select 1 from jobs where lower(apply_url) = lower(v_url) and hidden) then
      v_hidden := v_hidden + 1;
      continue;
    end if;
    -- Already up, posted by the board or a member: not posted twice.
    if exists (select 1 from jobs where source <> 'sweep' and lower(apply_url) = lower(v_url) and not hidden and expires_on >= v_today) then
      v_listed := v_listed + 1;
      delete from jobs where source = 'sweep' and lower(apply_url) = lower(v_url) and not hidden;
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

  -- Jobs members shared.
  if jsonb_typeof(coalesce(payload -> 'member_updates', '[]'::jsonb)) <> 'array' then raise exception 'member_updates must be a list'; end if;
  for v_item in select * from jsonb_array_elements(coalesce(payload -> 'member_updates', '[]'::jsonb)) loop
    begin
      v_mid := (v_item ->> 'id')::uuid;
    exception when others then
      raise exception 'Bad member job id: %', left(v_item::text, 200);
    end;
    v_status := coalesce(v_item ->> 'status', '');
    v_category := nullif(v_item ->> 'category', '');
    if v_status not in ('filled', 'open', 'closed', 'unreadable') or (v_category is not null and v_category not in ('fire_ems', 'ems', 'education')) then
      raise exception 'Bad member job update: %', left(v_item::text, 300);
    end if;
    if not exists (select 1 from jobs where id = v_mid and source = 'member' and not hidden) then continue; end if;
    v_mchecked := v_mchecked + 1;
    v_closes := nullif(v_item ->> 'closes_on', '')::date;
    if v_status = 'closed' or (v_closes is not null and v_closes < v_today) then
      delete from jobs where id = v_mid and source = 'member';
      v_removed := v_removed + 1;
      continue;
    end if;
    update jobs set
      title = coalesce(nullif(left(trim(coalesce(v_item ->> 'title', '')), 200), ''), title),
      employer = coalesce(nullif(left(trim(coalesce(v_item ->> 'employer', '')), 200), ''), employer),
      location = coalesce(nullif(left(trim(coalesce(v_item ->> 'location', '')), 200), ''), location),
      category = coalesce(v_category, category),
      description = case when trim(description) = '' then left(trim(coalesce(v_item ->> 'summary', '')), 500) else description end,
      expires_on = coalesce(v_closes, expires_on),
      open_until_filled = case when v_closes is not null then false else open_until_filled end,
      confirmed = v_status in ('filled', 'open') and coalesce((v_item ->> 'confirmed')::boolean, false),
      needs_details = false,
      last_seen_on = v_today
    where id = v_mid and source = 'member';
    if v_status = 'filled' then v_mfilled := v_mfilled + 1; end if;
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

  insert into job_sweep_runs (complete, found, added, kept, removed, hidden_skipped, already_listed, members_checked, members_filled, unreadable, notes)
  values (v_complete, jsonb_array_length(coalesce(payload -> 'found', '[]'::jsonb)), v_added, v_kept, v_removed, v_hidden, v_listed, v_mchecked, v_mfilled,
          greatest(coalesce((payload ->> 'unreadable')::integer, 0), 0), left(coalesce(payload ->> 'notes', ''), 500));

  return jsonb_build_object('added', v_added, 'kept', v_kept, 'removed', v_removed, 'hidden_skipped', v_hidden, 'already_listed', v_listed,
                            'members_checked', v_mchecked, 'members_filled', v_mfilled,
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

-- ---------------------------------------------------------------------------
-- 7. Members add jobs.
--
-- Who shared a job: admins only, never on the public board.
create table if not exists public.job_submissions (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists job_submissions_profile_idx on public.job_submissions (profile_id, created_at);
alter table public.job_submissions enable row level security;
do $$
begin
  if not exists (select 1 from pg_policy where polname = 'admins read job submissions' and polrelid = 'public.job_submissions'::regclass) then
    create policy "admins read job submissions" on public.job_submissions for select using ((select public.is_admin()));
  end if;
end $$;
revoke insert, update, delete, truncate on public.job_submissions from anon, authenticated;

-- p = { link, title, employer, location, category (or empty: the sweep
-- sorts it), closes_on (YYYY-MM-DD or empty: open until filled),
-- description }. The link to apply, the title and the employer are
-- required (board, 2026-11-06). Up to five a day per member. Open until
-- filled: up for 30 days. Marked needs_details until the weekly sweep reads
-- the link. Returns the new job's id.
create or replace function public.member_add_job(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'America/New_York')::date;
  v_title text := trim(coalesce(p ->> 'title', ''));
  v_employer text := trim(coalesce(p ->> 'employer', ''));
  v_location text := trim(coalesce(p ->> 'location', ''));
  v_category text := nullif(coalesce(p ->> 'category', ''), '');
  v_link text := trim(coalesce(p ->> 'link', ''));
  v_description text := trim(coalesce(p ->> 'description', ''));
  v_closes date;
  v_id uuid;
begin
  if v_uid is null or not public.is_current_member() then
    raise exception 'Only signed-in members can add a job.';
  end if;
  if (select count(*) from job_submissions where profile_id = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You can add up to five jobs a day. Try again tomorrow.';
  end if;
  if length(v_title) < 3 or length(v_title) > 200 then raise exception 'Give the job title (up to 200 characters).'; end if;
  if length(v_employer) < 2 or length(v_employer) > 200 then raise exception 'Give the employer (up to 200 characters).'; end if;
  if length(v_location) > 200 then raise exception 'Keep the city under 200 characters.'; end if;
  if v_category is not null and v_category not in ('fire_ems', 'ems', 'education') then raise exception 'Pick the type: Fire/EMS, EMS or Education.'; end if;
  if v_link = '' then raise exception 'Add the link to apply. Every job on the board needs one.'; end if;
  if v_link !~* '^https?://[^\s]+$' or length(v_link) > 1000 then
    raise exception 'The link has to be a web address starting with https://';
  end if;
  if length(v_description) > 2000 then raise exception 'Keep the description under 2,000 characters.'; end if;
  begin
    v_closes := nullif(trim(coalesce(p ->> 'closes_on', '')), '')::date;
  exception when others then
    raise exception 'The closing date is not a date.';
  end;
  if v_closes is not null and (v_closes < v_today or v_closes > v_today + 366) then
    raise exception 'The closing date has to be between today and a year from now.';
  end if;
  if exists (select 1 from jobs where lower(apply_url) = lower(v_link) and not hidden and expires_on >= v_today) then
    raise exception 'That job is already on the board.';
  end if;

  insert into jobs (source, title, employer, location, category, description, apply_url, posted_on, expires_on, open_until_filled,
                    confirmed, needs_details)
  values ('member', v_title, v_employer, v_location, v_category, v_description, v_link, v_today,
          coalesce(v_closes, v_today + 30), v_closes is null, false, true)
  returning id into v_id;
  insert into job_submissions (job_id, profile_id) values (v_id, v_uid);
  return v_id;
end $$;

revoke all on function public.member_add_job(jsonb) from public, anon;
grant execute on function public.member_add_job(jsonb) to authenticated;
