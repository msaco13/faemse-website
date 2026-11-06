-- Weekly event sweep (board, 2026-11-06). The same Sunday session that runs
-- the job sweep also checks the calendar (.claude/skills/event-sweep):
--
--   1. Upcoming events with dates or a place still TBA: when the organizer
--      posts them, the sweep fills them in by itself.
--   2. Past events: when next year's dates are posted, the sweep moves the
--      event to them by itself ("rolls it forward").
--   3. New events (any EMS-related educational conference, trainings and
--      meetings for educators first): they wait in Admin → Site content for
--      an admin to add, edit first, or dismiss. Dismissed ones never come back.
--
-- Every change the sweep makes is kept in event_sweep_changes with what it
-- replaced, and an admin can undo it; the sweep never makes an undone change
-- again. It never changes an event tagged "Meeting" (a FAEMSE membership
-- meeting: where the association meets is the board's call).
--
-- Like the job sweep, the session has no database login. It goes through the
-- event-sweep edge function with the same key (x-sweep-key), which can call
-- only event_sweep_state() and event_sweep_apply() below. Those touch only
-- the events' dates, place, wording and title, the suggestions list, the
-- change log and the runs log.

-- ---------------------------------------------------------------------------
-- 1. New events waiting for an admin.
create table if not exists public.event_suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 200),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  location text not null default '' check (length(location) <= 120),
  detail text not null default '' check (length(detail) <= 200),
  tag text not null default 'Workshop' check (tag in ('Workshop', 'Florida', 'National', 'Competition')),
  url text not null check (url ~* '^https?://[^\s]+$' and length(url) <= 500),
  found_on date not null default ((now() at time zone 'America/New_York')::date),
  status text not null default 'waiting' check (status in ('waiting', 'added', 'dismissed')),
  decided_on date,
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now()
);
-- One suggestion per page and date, whatever became of it.
create unique index if not exists event_suggestions_key on public.event_suggestions (lower(url), starts_on);

alter table public.event_suggestions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'event_suggestions' and policyname = 'admins read event suggestions') then
    create policy "admins read event suggestions" on public.event_suggestions for select using ((select public.is_admin()));
  end if;
end $$;
revoke insert, update, delete, truncate on public.event_suggestions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Every change the sweep made to an event, with what it replaced.
create table if not exists public.event_sweep_changes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null check (kind in ('dates', 'next_year')),
  before jsonb not null,
  after jsonb not null,
  source_url text not null default '',
  changed_on date not null default ((now() at time zone 'America/New_York')::date),
  undone_on date,
  created_at timestamptz not null default now()
);
create index if not exists event_sweep_changes_event on public.event_sweep_changes (event_id);

alter table public.event_sweep_changes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'event_sweep_changes' and policyname = 'admins read event sweep changes') then
    create policy "admins read event sweep changes" on public.event_sweep_changes for select using ((select public.is_admin()));
  end if;
end $$;
revoke insert, update, delete, truncate on public.event_sweep_changes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. One row per run, for the Admin panel.
create table if not exists public.event_sweep_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  checked integer not null default 0,
  updated integer not null default 0,
  rolled integer not null default 0,
  suggested integer not null default 0,
  skipped integer not null default 0,
  notes text not null default ''
);
alter table public.event_sweep_runs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'event_sweep_runs' and policyname = 'admins read event sweep runs') then
    create policy "admins read event sweep runs" on public.event_sweep_runs for select using ((select public.is_admin()));
  end if;
end $$;
revoke insert, update, delete, truncate on public.event_sweep_runs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. The tag a new event gets, and its colour (as on the calendar today).
create or replace function public.event_tag_color(p_tag text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_tag when 'Florida' then 'gold' when 'National' then 'green' when 'Competition' then 'red' else 'blue' end;
$$;

-- The fields the sweep may change, as one value for the change log.
create or replace function public.event_sweep_snapshot(e public.events)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object('title', e.title, 'starts_on', e.starts_on, 'ends_on', e.ends_on,
                            'location', e.location, 'detail', e.detail, 'url', e.url);
$$;

-- ---------------------------------------------------------------------------
-- 5. What the sweep reads first.
create or replace function public.event_sweep_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with today as (select (now() at time zone 'America/New_York')::date as d)
  select jsonb_build_object(
    'paused', coalesce((select (settings ->> 'event_sweep_paused')::boolean from site_settings where id = 1), false),
    'today', (select d from today),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', e.id, 'title', e.title, 'starts_on', e.starts_on, 'ends_on', e.ends_on, 'location', e.location,
          'detail', e.detail, 'tag', e.tag, 'url', e.url,
          'past', coalesce(e.ends_on, e.starts_on) < (select d from today),
          'locked', e.tag = 'Meeting')
        order by e.starts_on)
      from events e), '[]'::jsonb),
    'suggested', coalesce((
      select jsonb_agg(jsonb_build_object('title', s.title, 'starts_on', s.starts_on, 'url', s.url, 'status', s.status) order by s.starts_on)
      from event_suggestions s), '[]'::jsonb),
    'undone', coalesce((
      select jsonb_agg(jsonb_build_object('event_id', c.event_id, 'after', c.after))
      from event_sweep_changes c where c.undone_on is not null), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. What the sweep sends back.
--
-- payload: {
--   checked: number of events it looked at,
--   updates: [{ id, title?, starts_on, ends_on?, location?, detail?, url?, source_url }],
--   suggestions: [{ title, starts_on, ends_on?, location, detail, tag, url }],
--   notes: one short line
-- }
-- An update fills in dates or a place on an upcoming event, or moves a past
-- event to next year's dates. Fields left out stay as they are; the link is
-- only filled in when the event has none. A malformed entry rejects the whole
-- payload (nothing changes) so the sweep can fix it and send again; entries
-- that are fine but not allowed (a Meeting, an undone change, a duplicate)
-- are skipped and counted.
create or replace function public.event_sweep_apply(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/New_York')::date;
  v_item jsonb;
  v_event events%rowtype;
  v_id uuid;
  v_title text;
  v_starts date;
  v_ends date;
  v_location text;
  v_detail text;
  v_url text;
  v_tag text;
  v_past boolean;
  v_before jsonb;
  v_after jsonb;
  v_updated int := 0;
  v_rolled int := 0;
  v_suggested int := 0;
  v_skipped int := 0;
  v_skips text[] := array[]::text[];
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'Payload must be a JSON object'; end if;
  if jsonb_typeof(coalesce(payload -> 'updates', '[]'::jsonb)) <> 'array' then raise exception 'updates must be a list'; end if;
  if jsonb_typeof(coalesce(payload -> 'suggestions', '[]'::jsonb)) <> 'array' then raise exception 'suggestions must be a list'; end if;

  -- Updates to events already on the calendar.
  for v_item in select * from jsonb_array_elements(coalesce(payload -> 'updates', '[]'::jsonb)) loop
    begin
      v_id := (v_item ->> 'id')::uuid;
      v_starts := (v_item ->> 'starts_on')::date;
      v_ends := nullif(v_item ->> 'ends_on', '')::date;
    exception when others then
      raise exception 'Bad event update: %', left(v_item::text, 300);
    end;
    if v_starts is null or (v_ends is not null and v_ends < v_starts) then
      raise exception 'Bad event update (dates): %', left(v_item::text, 300);
    end if;
    if v_ends = v_starts then v_ends := null; end if;

    select * into v_event from events where id = v_id;
    if not found then
      v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'no such event');
      continue;
    end if;
    if v_event.tag = 'Meeting' then
      v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'Meeting: ' || left(v_event.title, 60));
      continue;
    end if;

    v_title := coalesce(nullif(trim(v_item ->> 'title'), ''), v_event.title);
    v_location := coalesce(trim(v_item ->> 'location'), v_event.location);
    v_detail := coalesce(trim(v_item ->> 'detail'), v_event.detail);
    v_url := v_event.url;
    if v_url = '' and coalesce(v_item ->> 'url', '') ~* '^https?://[^\s]+$' and length(v_item ->> 'url') <= 500 then
      v_url := trim(v_item ->> 'url');
    end if;
    if (v_item ? 'title' and length(v_title) > 200) or (v_item ? 'location' and length(v_location) > 120)
       or (v_item ? 'detail' and length(v_detail) > 200) then
      raise exception 'Bad event update (too long): %', left(v_item::text, 300);
    end if;
    -- Never into the past.
    if v_starts < v_today then
      raise exception 'Bad event update (date already passed): %', left(v_item::text, 300);
    end if;
    v_past := coalesce(v_event.ends_on, v_event.starts_on) < v_today;
    -- A past event only moves forward, to dates after it was held.
    if v_past and v_starts <= coalesce(v_event.ends_on, v_event.starts_on) then
      raise exception 'Bad event update (next year must come after it was held): %', left(v_item::text, 300);
    end if;

    v_before := event_sweep_snapshot(v_event);
    v_after := jsonb_build_object('title', v_title, 'starts_on', v_starts, 'ends_on', v_ends,
                                  'location', v_location, 'detail', v_detail, 'url', v_url);
    if v_after = v_before then
      continue; -- nothing new
    end if;
    -- An admin undid this exact change once: never again.
    if exists (select 1 from event_sweep_changes c where c.event_id = v_id and c.undone_on is not null and c.after = v_after) then
      v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'undone before: ' || left(v_event.title, 60));
      continue;
    end if;
    -- Moving a past event forward must not duplicate next year's, if it is already on the calendar.
    if v_past and exists (
        select 1 from events o where o.id <> v_id and o.starts_on = v_starts
          and (lower(o.title) = lower(v_title) or (o.url <> '' and lower(o.url) = lower(v_url)))) then
      v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'next year already listed: ' || left(v_event.title, 60));
      continue;
    end if;

    update events set title = v_title, starts_on = v_starts, ends_on = v_ends, location = v_location,
                      detail = v_detail, url = v_url
      where id = v_id;
    insert into event_sweep_changes (event_id, kind, before, after, source_url)
      values (v_id, case when v_past then 'next_year' else 'dates' end, v_before, v_after,
              left(coalesce(v_item ->> 'source_url', ''), 500));
    if v_past then v_rolled := v_rolled + 1; else v_updated := v_updated + 1; end if;
  end loop;

  -- New events for an admin to look at.
  for v_item in select * from jsonb_array_elements(coalesce(payload -> 'suggestions', '[]'::jsonb)) loop
    begin
      v_starts := (v_item ->> 'starts_on')::date;
      v_ends := nullif(v_item ->> 'ends_on', '')::date;
    exception when others then
      raise exception 'Bad event suggestion: %', left(v_item::text, 300);
    end;
    v_title := trim(coalesce(v_item ->> 'title', ''));
    v_location := trim(coalesce(v_item ->> 'location', ''));
    v_detail := trim(coalesce(v_item ->> 'detail', ''));
    v_url := trim(coalesce(v_item ->> 'url', ''));
    v_tag := coalesce(v_item ->> 'tag', 'Workshop');
    if v_starts is null or (v_ends is not null and v_ends < v_starts) or length(v_title) < 3 or length(v_title) > 200
       or length(v_location) > 120 or length(v_detail) > 200 or v_url !~* '^https?://[^\s]+$' or length(v_url) > 500
       or v_tag not in ('Workshop', 'Florida', 'National', 'Competition') then
      raise exception 'Bad event suggestion: %', left(v_item::text, 300);
    end if;
    if v_ends = v_starts then v_ends := null; end if;
    if coalesce(v_ends, v_starts) < v_today then
      v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'already over: ' || left(v_title, 60));
      continue;
    end if;
    -- Already suggested (waiting, added or dismissed), or already on the calendar.
    if exists (select 1 from event_suggestions s where lower(s.url) = lower(v_url) and s.starts_on = v_starts)
       or exists (select 1 from event_suggestions s where s.status = 'dismissed' and lower(s.title) = lower(v_title) and s.starts_on = v_starts)
       or exists (select 1 from events e where e.starts_on = v_starts
                    and (lower(e.title) = lower(v_title) or (e.url <> '' and lower(e.url) = lower(v_url)))) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    insert into event_suggestions (title, starts_on, ends_on, location, detail, tag, url)
      values (v_title, v_starts, v_ends, v_location, v_detail, v_tag, v_url);
    v_suggested := v_suggested + 1;
  end loop;

  insert into event_sweep_runs (checked, updated, rolled, suggested, skipped, notes)
    values (greatest(coalesce((payload ->> 'checked')::int, 0), 0), v_updated, v_rolled, v_suggested, v_skipped,
            left(trim(coalesce(payload ->> 'notes', '') ||
                 case when array_length(v_skips, 1) > 0 then ' Skipped: ' || array_to_string(v_skips, '; ') || '.' else '' end), 1000));

  return jsonb_build_object('updated', v_updated, 'rolled', v_rolled, 'suggested', v_suggested, 'skipped', v_skipped,
                            'waiting', (select count(*) from event_suggestions where status = 'waiting'));
end $$;

revoke all on function public.event_sweep_state() from public, anon, authenticated;
revoke all on function public.event_sweep_apply(jsonb) from public, anon, authenticated;
grant execute on function public.event_sweep_state() to service_role;
grant execute on function public.event_sweep_apply(jsonb) to service_role;
revoke all on function public.event_sweep_snapshot(public.events) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Admin: add or dismiss a suggestion, and undo a change.
--
-- p_action 'add' puts the suggestion on the calendar as it is, or with the
-- fields an admin changed first (p_event: title, starts_on, ends_on,
-- location, detail, tag, tag_color, url). 'dismiss' and it never comes back.
create or replace function public.admin_decide_event_suggestion(p_id uuid, p_action text, p_event jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_s event_suggestions%rowtype;
  v_event_id uuid;
  v_tag text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_s from event_suggestions where id = p_id for update;
  if not found then raise exception 'That suggestion is gone.'; end if;
  if v_s.status <> 'waiting' then raise exception 'That suggestion was already %.', v_s.status; end if;

  if p_action = 'dismiss' then
    update event_suggestions set status = 'dismissed', decided_on = (now() at time zone 'America/New_York')::date where id = p_id;
    return null;
  end if;
  if p_action <> 'add' then raise exception 'Unknown action %', p_action; end if;

  v_tag := coalesce(nullif(trim(p_event ->> 'tag'), ''), v_s.tag);
  insert into events (starts_on, ends_on, title, detail, location, tag, tag_color, url)
  values (
    coalesce(nullif(p_event ->> 'starts_on', '')::date, v_s.starts_on),
    case when p_event ? 'ends_on' then nullif(p_event ->> 'ends_on', '')::date else v_s.ends_on end,
    coalesce(nullif(trim(p_event ->> 'title'), ''), v_s.title),
    coalesce(trim(p_event ->> 'detail'), v_s.detail),
    coalesce(trim(p_event ->> 'location'), v_s.location),
    v_tag,
    coalesce(nullif(p_event ->> 'tag_color', ''), public.event_tag_color(v_tag)),
    coalesce(trim(p_event ->> 'url'), v_s.url)
  )
  returning id into v_event_id;
  update event_suggestions set status = 'added', decided_on = (now() at time zone 'America/New_York')::date, event_id = v_event_id
    where id = p_id;
  return v_event_id;
end $$;

-- Puts an event back the way it was before the sweep changed it, as long as
-- nobody edited it since (then it says so, and the admin edits it by hand).
create or replace function public.admin_undo_event_sweep_change(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c event_sweep_changes%rowtype;
  v_e events%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_c from event_sweep_changes where id = p_id for update;
  if not found then raise exception 'That change is gone.'; end if;
  if v_c.undone_on is not null then raise exception 'That change was already undone.'; end if;
  select * into v_e from events where id = v_c.event_id for update;
  if not found then raise exception 'That event was deleted.'; end if;
  if event_sweep_snapshot(v_e) <> v_c.after then
    raise exception 'This event was edited after the sweep changed it, so it was left alone. Edit it by hand in Events.';
  end if;
  update events set title = v_c.before ->> 'title',
                    starts_on = (v_c.before ->> 'starts_on')::date,
                    ends_on = nullif(v_c.before ->> 'ends_on', '')::date,
                    location = v_c.before ->> 'location',
                    detail = v_c.before ->> 'detail',
                    url = v_c.before ->> 'url'
    where id = v_c.event_id;
  update event_sweep_changes set undone_on = (now() at time zone 'America/New_York')::date where id = p_id;
end $$;

revoke all on function public.admin_decide_event_suggestion(uuid, text, jsonb) from public, anon;
revoke all on function public.admin_undo_event_sweep_change(uuid) from public, anon;
grant execute on function public.admin_decide_event_suggestion(uuid, text, jsonb) to authenticated;
grant execute on function public.admin_undo_event_sweep_change(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. The Admin switch, with the others.
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
       'job_sweep_paused', coalesce(settings -> 'job_sweep_paused', 'false'::jsonb),
       'event_sweep_paused', coalesce(settings -> 'event_sweep_paused', 'false'::jsonb))
     from site_settings where id = 1),
    jsonb_build_object('online_dues', 'false'::jsonb, 'reminders_paused', 'false'::jsonb, 'job_sweep_paused', 'false'::jsonb,
                       'event_sweep_paused', 'false'::jsonb));
$$;
