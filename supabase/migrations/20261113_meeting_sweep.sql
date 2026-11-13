-- Monthly meeting sweep (AJ, 2026-11-13). FAEMSE's statewide meetings sit in
-- the state EMS Advisory Council's (EMSAC) meeting schedule, which the state
-- posts on flemsac.org/meetings a month or two ahead (January, June, July and
-- October, roughly). Once a month a scheduled session
-- (.claude/skills/meeting-sweep) reads that page and the schedule PDF it
-- links. When the schedule lists FAEMSE, the sweep by itself:
--
--   * puts the day, time and room on the homepage meeting slide, with a
--     "See the meeting schedule" button to the state's PDF, and sets the
--     slide to come down after the last day of the meetings;
--   * adds the "to be announced" slide that takes over the day after;
--   * puts the day, time and room on the calendar's FAEMSE meeting entry
--     (tag "Meeting"), or adds that entry when the calendar has none.
--
-- AJ chose this over leaving it for an admin to approve: the state's own
-- schedule is the source, and every change is listed in Admin → Site
-- content → Monthly meeting sweep with what it replaced and an Undo. The
-- sweep never makes an undone change again. This is the one sweep that may
-- change a "Meeting" event; the weekly event sweep still never does.
--
-- Like the other sweeps, the session has no database login. It goes through
-- the meeting-sweep edge function (same key, x-sweep-key), which can call
-- only meeting_sweep_state() and meeting_sweep_apply() below. Those touch
-- only the meeting slides (spotlights.meeting_slide), events tagged
-- "Meeting", the change log and the runs log.

-- ---------------------------------------------------------------------------
-- 1. Which homepage slides are the meeting slide. The sweep changes no
--    other slide.
alter table public.spotlights add column if not exists meeting_slide boolean not null default false;
update public.spotlights set meeting_slide = true
  where kicker = 'EMSAC Meetings' and title = 'FAEMSE Statewide Meeting' and not is_welcome;

-- ---------------------------------------------------------------------------
-- 2. Every change the sweep made, with what it replaced. `before` is empty
--    when the sweep added the slide or event. No foreign key: undoing an
--    added slide deletes it, and the record that it was undone must stay so
--    the sweep never adds it again.
create table if not exists public.meeting_sweep_changes (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('slide', 'new_slide', 'event', 'new_event')),
  target_id uuid not null,
  before jsonb,
  after jsonb not null,
  source_url text not null default '',
  changed_on date not null default ((now() at time zone 'America/New_York')::date),
  undone_on date,
  created_at timestamptz not null default now()
);
create index if not exists meeting_sweep_changes_target on public.meeting_sweep_changes (target_id);

alter table public.meeting_sweep_changes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'meeting_sweep_changes' and policyname = 'admins read meeting sweep changes') then
    create policy "admins read meeting sweep changes" on public.meeting_sweep_changes for select using ((select public.is_admin()));
  end if;
end $$;
revoke insert, update, delete, truncate on public.meeting_sweep_changes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. One row per run, for the Admin panel.
create table if not exists public.meeting_sweep_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  meeting text not null default '',     -- the next meetings as the state's page gave them
  faemse_listed boolean,                -- the schedule lists FAEMSE (null: no schedule posted yet)
  changed integer not null default 0,
  skipped integer not null default 0,
  source_url text not null default '',
  notes text not null default ''
);
alter table public.meeting_sweep_runs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'meeting_sweep_runs' and policyname = 'admins read meeting sweep runs') then
    create policy "admins read meeting sweep runs" on public.meeting_sweep_runs for select using ((select public.is_admin()));
  end if;
end $$;
revoke insert, update, delete, truncate on public.meeting_sweep_runs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. The slide fields the sweep may change, as one value for the change log.
--    (Events use event_sweep_snapshot() from 20261106_event_sweep.sql.)
create or replace function public.meeting_slide_snapshot(s public.spotlights)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object('body', s.body, 'link_url', s.link_url, 'link_label', s.link_label, 'show_link', s.show_link,
                            'starts_on', s.starts_on, 'expires_on', s.expires_on);
$$;
revoke all on function public.meeting_slide_snapshot(public.spotlights) from public, anon, authenticated;

-- A slide's button may open the calendar or the state's own pages only.
create or replace function public.meeting_slide_link_ok(p_url text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_url = '/events'
      or (p_url ~* '^https://(www\.)?(floridahealth\.gov|flemsac\.org)/[^\s]*$' and length(p_url) <= 500);
$$;

-- ---------------------------------------------------------------------------
-- 5. What the sweep reads first.
create or replace function public.meeting_sweep_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with today as (select (now() at time zone 'America/New_York')::date as d)
  select jsonb_build_object(
    'paused', coalesce((select (settings ->> 'meeting_sweep_paused')::boolean from site_settings where id = 1), false),
    'today', (select d from today),
    -- The meeting slides still to come or showing now.
    'slides', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', s.id, 'starts_on', s.starts_on, 'expires_on', s.expires_on, 'body', s.body,
          'link_url', s.link_url, 'link_label', s.link_label, 'show_link', s.show_link, 'show_slide', s.show_slide,
          'showing_now', s.show_slide and s.starts_on <= (select d from today)
                         and (s.expires_on is null or s.expires_on >= (select d from today)))
        order by s.starts_on)
      from spotlights s
      where s.meeting_slide and (s.expires_on is null or s.expires_on >= (select d from today))), '[]'::jsonb),
    -- FAEMSE meetings on the calendar that haven't happened yet.
    'meetings', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', e.id, 'title', e.title, 'starts_on', e.starts_on, 'ends_on', e.ends_on,
          'location', e.location, 'detail', e.detail, 'url', e.url)
        order by e.starts_on)
      from events e
      where e.tag = 'Meeting' and coalesce(e.ends_on, e.starts_on) >= (select d from today)), '[]'::jsonb),
    'undone', coalesce((
      select jsonb_agg(jsonb_build_object('kind', c.kind, 'target_id', c.target_id, 'after', c.after))
      from meeting_sweep_changes c where c.undone_on is not null), '[]'::jsonb),
    'last_run', (
      select jsonb_build_object('ran_at', r.ran_at, 'meeting', r.meeting, 'faemse_listed', r.faemse_listed)
      from meeting_sweep_runs r order by r.ran_at desc limit 1)
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. What the sweep sends back.
--
-- payload: {
--   meeting: the next meetings as the state's page gives them, one line,
--   faemse_listed: true / false, or null when no schedule is posted yet,
--   source_url: the state's page it read,
--   changes: [
--     { kind: 'slide', id, body?, link_url?, link_label?, show_link?, expires_on?, source_url },
--     { kind: 'new_slide', starts_on, body, link_url?, link_label?, show_link?, expires_on?, source_url },
--     { kind: 'event', id, title?, starts_on?, ends_on?, location?, detail?, url?, source_url },
--     { kind: 'new_event', title, starts_on, ends_on?, location, detail, url, source_url }
--   ],
--   notes: one short line
-- }
-- Changes apply in order. Fields left out stay as they are. A malformed entry,
-- or changes that would leave two meeting slides showing on the same day,
-- reject the whole payload (nothing changes) so the sweep can fix it and send
-- again. Entries that are fine but not allowed (an undone change, a duplicate,
-- no change at all) are skipped and counted.
create or replace function public.meeting_sweep_apply(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/New_York')::date;
  v_item jsonb;
  v_kind text;
  v_id uuid;
  v_slide spotlights%rowtype;
  v_tpl spotlights%rowtype;
  v_event events%rowtype;
  v_body text;
  v_link text;
  v_label text;
  v_show boolean;
  v_starts date;
  v_ends date;
  v_expires date;
  v_title text;
  v_location text;
  v_detail text;
  v_url text;
  v_src text;
  v_before jsonb;
  v_after jsonb;
  v_changed int := 0;
  v_slides_changed boolean := false;
  v_skipped int := 0;
  v_skips text[] := array[]::text[];
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'Payload must be a JSON object'; end if;
  if jsonb_typeof(coalesce(payload -> 'changes', '[]'::jsonb)) <> 'array' then raise exception 'changes must be a list'; end if;
  if jsonb_array_length(coalesce(payload -> 'changes', '[]'::jsonb)) > 10 then raise exception 'Too many changes in one run'; end if;

  for v_item in select * from jsonb_array_elements(coalesce(payload -> 'changes', '[]'::jsonb)) loop
    v_kind := coalesce(v_item ->> 'kind', '');
    v_src := left(coalesce(v_item ->> 'source_url', ''), 500);
    begin
      v_id := nullif(v_item ->> 'id', '')::uuid;
      v_starts := nullif(v_item ->> 'starts_on', '')::date;
      v_ends := nullif(v_item ->> 'ends_on', '')::date;
      v_expires := nullif(v_item ->> 'expires_on', '')::date;
      v_show := (v_item ->> 'show_link')::boolean;
    exception when others then
      raise exception 'Bad change: %', left(v_item::text, 300);
    end;

    if v_kind in ('slide', 'new_slide') then
      -- ---- The homepage meeting slide ----
      if v_kind = 'slide' then
        select * into v_slide from spotlights where id = v_id;
        if not found or not v_slide.meeting_slide then
          raise exception 'Bad change (not a meeting slide): %', left(v_item::text, 300);
        end if;
        if v_slide.expires_on is not null and v_slide.expires_on < v_today then
          v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'slide already came down');
          continue;
        end if;
        v_before := meeting_slide_snapshot(v_slide);
        v_body := coalesce(trim(v_item ->> 'body'), v_slide.body);
        v_link := coalesce(trim(v_item ->> 'link_url'), v_slide.link_url);
        v_label := coalesce(trim(v_item ->> 'link_label'), v_slide.link_label);
        v_show := coalesce(v_show, v_slide.show_link);
        v_starts := v_slide.starts_on;
        v_expires := case when v_item ? 'expires_on' then v_expires else v_slide.expires_on end;
      else
        if v_starts is null or v_starts < v_today then
          raise exception 'Bad change (a new slide starts today or later): %', left(v_item::text, 300);
        end if;
        v_before := null;
        v_body := trim(coalesce(v_item ->> 'body', ''));
        v_link := coalesce(nullif(trim(v_item ->> 'link_url'), ''), '/events');
        v_label := coalesce(nullif(trim(v_item ->> 'link_label'), ''), 'See the calendar');
        v_show := coalesce(v_show, false);
      end if;
      if length(v_body) < 20 or length(v_body) > 400 or length(v_label) > 40 or (v_show and v_label = '')
         or not meeting_slide_link_ok(v_link) or (v_expires is not null and v_expires < greatest(v_starts, v_today)) then
        raise exception 'Bad slide change: %', left(v_item::text, 300);
      end if;
      v_after := jsonb_build_object('body', v_body, 'link_url', v_link, 'link_label', v_label, 'show_link', v_show,
                                    'starts_on', v_starts, 'expires_on', v_expires);
      if v_kind = 'slide' and v_after = v_before then
        continue; -- nothing new
      end if;
      if exists (select 1 from meeting_sweep_changes c
                  where c.kind = v_kind and c.undone_on is not null and c.after = v_after
                    and (v_kind = 'new_slide' or c.target_id = v_id)) then
        v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'undone before: ' || v_kind);
        continue;
      end if;
      if v_kind = 'new_slide' and exists (select 1 from spotlights where meeting_slide and starts_on = v_starts) then
        v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'a meeting slide already starts ' || v_starts);
        continue;
      end if;

      if v_kind = 'slide' then
        update spotlights set body = v_body, link_url = v_link, link_label = v_label, show_link = v_show, expires_on = v_expires
          where id = v_id;
      else
        -- Kicker, headline, order and tags as on the latest meeting slide.
        select * into v_tpl from spotlights where meeting_slide order by starts_on desc limit 1;
        insert into spotlights (sort_order, kicker, title, body, image_url, video_url, link_url, link_label, starts_on, expires_on,
                                show_link, show_join, tag_1, tag_2, tag_3, show_tag_1, show_tag_2, show_tag_3,
                                is_welcome, show_slide, meeting_slide)
        values (coalesce(v_tpl.sort_order, 20), coalesce(v_tpl.kicker, 'EMSAC Meetings'), coalesce(v_tpl.title, 'FAEMSE Statewide Meeting'),
                v_body, coalesce(v_tpl.image_url, ''), coalesce(v_tpl.video_url, ''), v_link, v_label, v_starts, v_expires,
                v_show, coalesce(v_tpl.show_join, false),
                coalesce(v_tpl.tag_1, '501(c)(6) nonprofit'), coalesce(v_tpl.tag_2, 'Every program type, statewide'),
                coalesce(v_tpl.tag_3, 'Statewide meetings & workshops'),
                coalesce(v_tpl.show_tag_1, false), coalesce(v_tpl.show_tag_2, false), coalesce(v_tpl.show_tag_3, false),
                false, true, true)
        returning id into v_id;
      end if;
      insert into meeting_sweep_changes (kind, target_id, before, after, source_url)
        values (v_kind, v_id, v_before, v_after, v_src);
      v_changed := v_changed + 1;
      v_slides_changed := true;

    elsif v_kind in ('event', 'new_event') then
      -- ---- The calendar's FAEMSE meeting ----
      if v_kind = 'event' then
        select * into v_event from events where id = v_id;
        if not found or v_event.tag <> 'Meeting' then
          raise exception 'Bad change (not a FAEMSE meeting on the calendar): %', left(v_item::text, 300);
        end if;
        if coalesce(v_event.ends_on, v_event.starts_on) < v_today then
          v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'meeting already over: ' || left(v_event.title, 60));
          continue;
        end if;
        v_before := event_sweep_snapshot(v_event);
        v_title := coalesce(nullif(trim(v_item ->> 'title'), ''), v_event.title);
        v_starts := coalesce(v_starts, v_event.starts_on);
        v_ends := case when v_item ? 'ends_on' then v_ends else v_event.ends_on end;
        v_location := coalesce(trim(v_item ->> 'location'), v_event.location);
        v_detail := coalesce(trim(v_item ->> 'detail'), v_event.detail);
        v_url := coalesce(trim(v_item ->> 'url'), v_event.url);
      else
        v_before := null;
        v_title := trim(coalesce(v_item ->> 'title', ''));
        v_location := trim(coalesce(v_item ->> 'location', ''));
        v_detail := trim(coalesce(v_item ->> 'detail', ''));
        v_url := trim(coalesce(v_item ->> 'url', ''));
      end if;
      if v_ends = v_starts then v_ends := null; end if;
      -- New dates are never in the past (an entry already running keeps its first day).
      if v_starts is null or (v_starts < v_today and (v_kind = 'new_event' or v_starts <> v_event.starts_on))
         or (v_ends is not null and v_ends < v_starts)
         or length(v_title) < 3 or length(v_title) > 200 or length(v_location) > 120 or length(v_detail) > 200
         or (v_url <> '' and (v_url !~* '^https?://[^\s]+$' or length(v_url) > 500))
         or (v_kind = 'new_event' and (v_url = '' or v_location = '' or v_detail = '')) then
        raise exception 'Bad event change: %', left(v_item::text, 300);
      end if;
      v_after := jsonb_build_object('title', v_title, 'starts_on', v_starts, 'ends_on', v_ends,
                                    'location', v_location, 'detail', v_detail, 'url', v_url);
      if v_kind = 'event' and v_after = v_before then
        continue;
      end if;
      if exists (select 1 from meeting_sweep_changes c
                  where c.kind = v_kind and c.undone_on is not null and c.after = v_after
                    and (v_kind = 'new_event' or c.target_id = v_id)) then
        v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'undone before: ' || left(v_title, 60));
        continue;
      end if;
      -- A FAEMSE meeting already on the calendar for those days: update it instead.
      if v_kind = 'new_event' and exists (
          select 1 from events e where e.tag = 'Meeting'
            and e.starts_on <= coalesce(v_ends, v_starts) and coalesce(e.ends_on, e.starts_on) >= v_starts) then
        v_skipped := v_skipped + 1; v_skips := array_append(v_skips, 'meeting already on the calendar: ' || left(v_title, 60));
        continue;
      end if;

      if v_kind = 'event' then
        update events set title = v_title, starts_on = v_starts, ends_on = v_ends, location = v_location, detail = v_detail, url = v_url
          where id = v_id;
      else
        insert into events (starts_on, ends_on, title, detail, location, tag, tag_color, url)
          values (v_starts, v_ends, v_title, v_detail, v_location, 'Meeting', 'blue', v_url)
          returning id into v_id;
      end if;
      insert into meeting_sweep_changes (kind, target_id, before, after, source_url)
        values (v_kind, v_id, v_before, v_after, v_src);
      v_changed := v_changed + 1;

    else
      raise exception 'Bad change (kind is slide, new_slide, event or new_event): %', left(v_item::text, 300);
    end if;
  end loop;

  -- Never two meeting slides on the homepage on the same day.
  if v_slides_changed and exists (
      select 1 from spotlights a join spotlights b on a.id < b.id
      where a.meeting_slide and b.meeting_slide and a.show_slide and b.show_slide
        and a.starts_on <= coalesce(b.expires_on, 'infinity'::date)
        and b.starts_on <= coalesce(a.expires_on, 'infinity'::date)
        and coalesce(a.expires_on, 'infinity'::date) >= v_today
        and coalesce(b.expires_on, 'infinity'::date) >= v_today) then
    raise exception 'These changes would show two meeting slides on the same day. Give the slide showing now an end date (expires_on) before the day the new one starts.';
  end if;

  insert into meeting_sweep_runs (meeting, faemse_listed, changed, skipped, source_url, notes)
    values (left(trim(coalesce(payload ->> 'meeting', '')), 300),
            (payload ->> 'faemse_listed')::boolean,
            v_changed, v_skipped, left(coalesce(payload ->> 'source_url', ''), 500),
            left(trim(coalesce(payload ->> 'notes', '') ||
                 case when array_length(v_skips, 1) > 0 then ' Skipped: ' || array_to_string(v_skips, '; ') || '.' else '' end), 1000));

  return jsonb_build_object('changed', v_changed, 'skipped', v_skipped, 'skips', to_jsonb(v_skips));
end $$;

revoke all on function public.meeting_sweep_state() from public, anon, authenticated;
revoke all on function public.meeting_sweep_apply(jsonb) from public, anon, authenticated;
grant execute on function public.meeting_sweep_state() to service_role;
grant execute on function public.meeting_sweep_apply(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Admin: undo a change. Puts the slide or event back the way it was (an
--    added one is removed), as long as nobody edited it since; then it says
--    so and the admin edits it by hand.
create or replace function public.admin_undo_meeting_sweep_change(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c meeting_sweep_changes%rowtype;
  v_s spotlights%rowtype;
  v_e events%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_c from meeting_sweep_changes where id = p_id for update;
  if not found then raise exception 'That change is gone.'; end if;
  if v_c.undone_on is not null then raise exception 'That change was already undone.'; end if;

  if v_c.kind in ('slide', 'new_slide') then
    select * into v_s from spotlights where id = v_c.target_id for update;
    if not found then raise exception 'That slide was deleted.'; end if;
    if meeting_slide_snapshot(v_s) <> v_c.after then
      raise exception 'This slide was edited after the sweep changed it, so it was left alone. Edit it by hand in Homepage spotlights.';
    end if;
    if v_c.kind = 'new_slide' then
      delete from spotlights where id = v_c.target_id;
    else
      update spotlights set body = v_c.before ->> 'body',
                            link_url = v_c.before ->> 'link_url',
                            link_label = v_c.before ->> 'link_label',
                            show_link = (v_c.before ->> 'show_link')::boolean,
                            expires_on = nullif(v_c.before ->> 'expires_on', '')::date
        where id = v_c.target_id;
      -- Taking the end date off would show two meeting slides at once.
      if exists (
          select 1 from spotlights a join spotlights b on a.id < b.id
          where a.meeting_slide and b.meeting_slide and a.show_slide and b.show_slide
            and v_c.target_id in (a.id, b.id)
            and a.starts_on <= coalesce(b.expires_on, 'infinity'::date)
            and b.starts_on <= coalesce(a.expires_on, 'infinity'::date)) then
        raise exception 'Undoing this would show two meeting slides at once. Undo the newer "to be announced" slide first.';
      end if;
    end if;
  else
    select * into v_e from events where id = v_c.target_id for update;
    if not found then raise exception 'That event was deleted.'; end if;
    if event_sweep_snapshot(v_e) <> v_c.after then
      raise exception 'This event was edited after the sweep changed it, so it was left alone. Edit it by hand in Events.';
    end if;
    if v_c.kind = 'new_event' then
      delete from events where id = v_c.target_id;
    else
      update events set title = v_c.before ->> 'title',
                        starts_on = (v_c.before ->> 'starts_on')::date,
                        ends_on = nullif(v_c.before ->> 'ends_on', '')::date,
                        location = v_c.before ->> 'location',
                        detail = v_c.before ->> 'detail',
                        url = v_c.before ->> 'url'
        where id = v_c.target_id;
    end if;
  end if;
  update meeting_sweep_changes set undone_on = (now() at time zone 'America/New_York')::date where id = p_id;
end $$;

revoke all on function public.admin_undo_meeting_sweep_change(uuid) from public, anon;
grant execute on function public.admin_undo_meeting_sweep_change(uuid) to authenticated;

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
       'event_sweep_paused', coalesce(settings -> 'event_sweep_paused', 'false'::jsonb),
       'hub_check_paused', coalesce(settings -> 'hub_check_paused', 'false'::jsonb),
       'meeting_sweep_paused', coalesce(settings -> 'meeting_sweep_paused', 'false'::jsonb))
     from site_settings where id = 1),
    jsonb_build_object('online_dues', 'false'::jsonb, 'reminders_paused', 'false'::jsonb, 'job_sweep_paused', 'false'::jsonb,
                       'event_sweep_paused', 'false'::jsonb, 'hub_check_paused', 'false'::jsonb,
                       'meeting_sweep_paused', 'false'::jsonb));
$$;
