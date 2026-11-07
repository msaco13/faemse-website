-- Monthly program hub check (AJ, 2026-11-07). On the 1st of each month a
-- scheduled session (.claude/skills/hub-check) reads the five program hubs
-- and compares every rule citation, standard, fee, deadline, form number and
-- link with the official sources (CoAEMSP, CAAHEP, the National Registry,
-- Florida DOH, flrules.org, the Florida DOE paramedic framework).
--
-- It never changes a hub. Each fix it finds waits in hub_check_items with
-- the exact text now in the hub, the proposed text and the source, until an
-- admin applies it (as is or edited), or dismisses it (it is never proposed
-- again) in Admin → Program hubs. Things it checked but couldn't confirm
-- are listed too (kind 'unverified'). An applied fix can be undone.
--
-- Applying runs in the browser with the hub editor's own rules
-- (cleanHubDraft in src/lib/hubDraft.ts), then saves through
-- admin_apply_hub_item(), which refuses if the hub changed since it was read.
--
-- Like the job and event sweeps, the session has no database login. It goes
-- through the hub-check edge function with the same key (x-sweep-key), which
-- can call only hub_check_state() and hub_check_apply(). Those read the hubs
-- and write only hub_check_items and hub_check_runs. The hub text is
-- members-only and never goes into the public repository.

-- ---------------------------------------------------------------------------
-- 1. What the check found.
create table if not exists public.hub_check_items (
  id uuid primary key default gen_random_uuid(),
  hub_slug text not null references public.admin_documents (slug) on delete cascade on update cascade,
  section text not null default '' check (length(section) <= 200),
  kind text not null check (kind in ('rule', 'standard', 'date', 'link', 'other', 'unverified')),
  why text not null check (length(why) between 3 and 600),
  find_text text check (find_text is null or length(find_text) between 3 and 4000),
  replace_text text check (replace_text is null or length(replace_text) <= 6000),
  source_url text not null default '' check (source_url = '' or (source_url ~* '^https?://[^\s]+$' and length(source_url) <= 500)),
  status text not null default 'waiting' check (status in ('waiting', 'applied', 'dismissed', 'stale', 'undone')),
  found_on date not null default ((now() at time zone 'America/New_York')::date),
  decided_on date,
  decided_by uuid,
  applied_text text,
  created_at timestamptz not null default now(),
  -- A fix says what to replace and with what; a note only says what couldn't be confirmed.
  constraint hub_check_items_shape check (
    (kind = 'unverified' and find_text is null and replace_text is null)
    or (kind <> 'unverified' and find_text is not null and replace_text is not null and find_text <> replace_text))
);
-- The same finding once, whatever became of it (a dismissed one never comes back).
create unique index if not exists hub_check_items_key on public.hub_check_items
  (hub_slug, kind, md5(coalesce(find_text, '') || '|' || coalesce(replace_text, '') || '|' || case when kind = 'unverified' then why else '' end));

alter table public.hub_check_items enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'hub_check_items' and policyname = 'admins read hub check items') then
    create policy "admins read hub check items" on public.hub_check_items for select using ((select public.is_admin()));
  end if;
end $$;
revoke insert, update, delete, truncate on public.hub_check_items from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. One row per run, for the Admin panel.
create table if not exists public.hub_check_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  hubs_checked integer not null default 0,
  facts_checked integer not null default 0,
  proposed integer not null default 0,
  unverified integer not null default 0,
  skipped integer not null default 0,
  notes text not null default ''
);
alter table public.hub_check_runs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'hub_check_runs' and policyname = 'admins read hub check runs') then
    create policy "admins read hub check runs" on public.hub_check_runs for select using ((select public.is_admin()));
  end if;
end $$;
revoke insert, update, delete, truncate on public.hub_check_runs from anon, authenticated;

-- How many times `needle` appears in `hay` (0 for an empty needle).
create or replace function public.hub_check_count(hay text, needle text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case when coalesce(needle, '') = '' then 0
              else (length(hay) - length(replace(hay, needle, ''))) / length(needle) end;
$$;

-- ---------------------------------------------------------------------------
-- 3. What the check reads first: the hubs, and everything it found before.
create or replace function public.hub_check_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'paused', coalesce((select (settings ->> 'hub_check_paused')::boolean from site_settings where id = 1), false),
    'today', (now() at time zone 'America/New_York')::date,
    'hubs', coalesce((select jsonb_agg(jsonb_build_object('slug', d.slug, 'title', d.title, 'updated_at', d.updated_at, 'body', d.body)
                                       order by d.sort_order, d.slug) from admin_documents d), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('hub_slug', i.hub_slug, 'kind', i.kind, 'section', i.section, 'why', i.why,
                                                           'find_text', i.find_text, 'replace_text', i.replace_text, 'status', i.status,
                                                           'found_on', i.found_on)
                                        order by i.created_at) from hub_check_items i), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. What the check sends back.
--
-- payload: {
--   hubs_checked, facts_checked: numbers,
--   items: [{ hub_slug, section, kind, why, find_text, replace_text, source_url }],
--   notes: one short line
-- }
-- A fix's find_text must appear exactly once in that hub as it is now, or it
-- is skipped (counted). The same finding as before, in any status, is
-- skipped. A malformed entry rejects the whole payload so the check can fix
-- it and send again.
create or replace function public.hub_check_apply(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_slug text;
  v_kind text;
  v_section text;
  v_why text;
  v_find text;
  v_replace text;
  v_source text;
  v_body text;
  v_proposed int := 0;
  v_unverified int := 0;
  v_skipped int := 0;
  v_skips text[] := array[]::text[];
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'Payload must be a JSON object'; end if;
  if jsonb_typeof(coalesce(payload -> 'items', '[]'::jsonb)) <> 'array' then raise exception 'items must be a list'; end if;

  for v_item in select * from jsonb_array_elements(coalesce(payload -> 'items', '[]'::jsonb)) loop
    v_slug := coalesce(v_item ->> 'hub_slug', '');
    v_kind := coalesce(v_item ->> 'kind', '');
    v_section := left(trim(coalesce(v_item ->> 'section', '')), 200);
    v_why := trim(coalesce(v_item ->> 'why', ''));
    v_find := v_item ->> 'find_text';
    v_replace := v_item ->> 'replace_text';
    v_source := trim(coalesce(v_item ->> 'source_url', ''));

    select body into v_body from admin_documents where slug = v_slug;
    if not found then raise exception 'No hub %: %', v_slug, left(v_item::text, 200); end if;
    if v_kind not in ('rule', 'standard', 'date', 'link', 'other', 'unverified') or length(v_why) < 3 or length(v_why) > 600
       or (v_source <> '' and (v_source !~* '^https?://[^\s]+$' or length(v_source) > 500)) then
      raise exception 'Bad hub check item: %', left(v_item::text, 300);
    end if;

    if v_kind = 'unverified' then
      if exists (select 1 from hub_check_items i where i.hub_slug = v_slug and i.kind = 'unverified' and i.why = v_why) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      insert into hub_check_items (hub_slug, section, kind, why, source_url) values (v_slug, v_section, 'unverified', v_why, v_source);
      v_unverified := v_unverified + 1;
      continue;
    end if;

    if v_find is null or v_replace is null or length(v_find) < 3 or length(v_find) > 4000 or length(v_replace) > 6000 or v_find = v_replace then
      raise exception 'Bad hub check fix: %', left(v_item::text, 300);
    end if;
    -- The text to replace has to be in the hub, once.
    if hub_check_count(v_body, v_find) <> 1 then
      v_skipped := v_skipped + 1;
      v_skips := array_append(v_skips, 'text not found once in ' || v_slug || ': ' || left(v_find, 60));
      continue;
    end if;
    -- Found before, whatever an admin did with it.
    if exists (select 1 from hub_check_items i where i.hub_slug = v_slug and i.kind <> 'unverified'
                 and i.find_text = v_find and i.replace_text = v_replace) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    insert into hub_check_items (hub_slug, section, kind, why, find_text, replace_text, source_url)
      values (v_slug, v_section, v_kind, v_why, v_find, v_replace, v_source);
    v_proposed := v_proposed + 1;
  end loop;

  insert into hub_check_runs (hubs_checked, facts_checked, proposed, unverified, skipped, notes)
    values (greatest(coalesce((payload ->> 'hubs_checked')::int, 0), 0), greatest(coalesce((payload ->> 'facts_checked')::int, 0), 0),
            v_proposed, v_unverified, v_skipped,
            left(trim(coalesce(payload ->> 'notes', '') ||
                 case when array_length(v_skips, 1) > 0 then ' Skipped: ' || array_to_string(v_skips, '; ') || '.' else '' end), 1000));

  return jsonb_build_object('proposed', v_proposed, 'unverified', v_unverified, 'skipped', v_skipped,
                            'waiting', (select count(*) from hub_check_items where status = 'waiting'));
end $$;

revoke all on function public.hub_check_state() from public, anon, authenticated;
revoke all on function public.hub_check_apply(jsonb) from public, anon, authenticated;
grant execute on function public.hub_check_state() to service_role;
grant execute on function public.hub_check_apply(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Admin: apply (the page sends the whole new body, built with the hub
-- editor's rules), undo, or dismiss. Apply and undo refuse if the hub
-- changed since the page read it.
create or replace function public.admin_apply_hub_item(p_id uuid, p_body text, p_expected timestamptz, p_used text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i hub_check_items%rowtype;
  v_at timestamptz;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_i from hub_check_items where id = p_id for update;
  if not found then raise exception 'That item is gone.'; end if;
  if v_i.status <> 'waiting' or v_i.kind = 'unverified' then raise exception 'That item was already %.', v_i.status; end if;
  if coalesce(p_body, '') = '' or coalesce(p_used, '') = '' then raise exception 'Nothing to save.'; end if;
  select updated_at into v_at from admin_documents where slug = v_i.hub_slug for update;
  if v_at is distinct from p_expected then
    raise exception 'The hub changed since this page read it. Reload and try again.';
  end if;
  update admin_documents set body = p_body, updated_at = now() where slug = v_i.hub_slug;
  update hub_check_items set status = 'applied', decided_on = (now() at time zone 'America/New_York')::date,
                             decided_by = auth.uid(), applied_text = p_used
    where id = p_id;
end $$;

create or replace function public.admin_undo_hub_item(p_id uuid, p_body text, p_expected timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i hub_check_items%rowtype;
  v_at timestamptz;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_i from hub_check_items where id = p_id for update;
  if not found then raise exception 'That item is gone.'; end if;
  if v_i.status <> 'applied' then raise exception 'Only an applied fix can be undone.'; end if;
  if coalesce(p_body, '') = '' then raise exception 'Nothing to save.'; end if;
  select updated_at into v_at from admin_documents where slug = v_i.hub_slug for update;
  if v_at is distinct from p_expected then
    raise exception 'The hub changed since this page read it. Reload and try again.';
  end if;
  update admin_documents set body = p_body, updated_at = now() where slug = v_i.hub_slug;
  update hub_check_items set status = 'undone', decided_on = (now() at time zone 'America/New_York')::date, decided_by = auth.uid()
    where id = p_id;
end $$;

-- 'dismissed': never proposed again. 'stale': the hub's text moved on, so
-- the fix no longer fits (the page marks it when Apply can't find the text).
create or replace function public.admin_set_hub_item(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('dismissed', 'stale') then raise exception 'Unknown status %', p_status; end if;
  update hub_check_items set status = p_status, decided_on = (now() at time zone 'America/New_York')::date, decided_by = auth.uid()
    where id = p_id and status = 'waiting';
  if not found then raise exception 'That item was already decided.'; end if;
end $$;

revoke all on function public.admin_apply_hub_item(uuid, text, timestamptz, text) from public, anon;
revoke all on function public.admin_undo_hub_item(uuid, text, timestamptz) from public, anon;
revoke all on function public.admin_set_hub_item(uuid, text) from public, anon;
grant execute on function public.admin_apply_hub_item(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.admin_undo_hub_item(uuid, text, timestamptz) to authenticated;
grant execute on function public.admin_set_hub_item(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. The Admin switch, with the others.
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
       'hub_check_paused', coalesce(settings -> 'hub_check_paused', 'false'::jsonb))
     from site_settings where id = 1),
    jsonb_build_object('online_dues', 'false'::jsonb, 'reminders_paused', 'false'::jsonb, 'job_sweep_paused', 'false'::jsonb,
                       'event_sweep_paused', 'false'::jsonb, 'hub_check_paused', 'false'::jsonb));
$$;
