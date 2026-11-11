-- Job sweep keeps jobs it couldn't read, and reports its work
-- (AJ, 2026-11-11).
--
-- The 2026-11-08 run re-found only 7 of the 18 jobs (AMR's postings refused
-- the robot), and the other 11 were one miss from coming down, and set to
-- lapse on 2026-11-20 anyway (open-until-filled jobs stayed up only 14 days
-- past their last sighting). Now:
--   * a job comes down when the sweep shows it closed (its link on the
--     closed list, a 404, or its closing date passed), or after 4 complete
--     runs in a row without it (about a month), not 2;
--   * an open-until-filled job stays up 5 weeks past its last sighting;
--   * the run log records how hard the run looked: searches run, agencies
--     on the watch list checked (of how many), and Florida openings on
--     National Testing Network; Admin shows them, so a thin run stands out.
-- The 11 jobs waiting on a second miss get their dates moved out now.

alter table public.job_sweep_runs add column if not exists searches integer;
alter table public.job_sweep_runs add column if not exists agencies_checked integer;
alter table public.job_sweep_runs add column if not exists agencies_total integer;
alter table public.job_sweep_runs add column if not exists ntn_florida integer;

-- As in 20261110_job_opens_on.sql, with the 5-week open-until-filled window,
-- the 4-run backstop and the new run counts.
create or replace function public.job_sweep_apply(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'America/New_York')::date;
  v_complete boolean := coalesce((payload ->> 'complete')::boolean, false);
  v_item jsonb;
  v_url text;
  v_title text;
  v_closes date;
  v_opens date;
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
    v_opens := nullif(v_item ->> 'opens_on', '')::date;
    if v_opens is not null and v_closes is not null and v_opens > v_closes then
      raise exception 'Bad job entry (opens after it closes): %', left(v_item::text, 300);
    end if;
    if v_opens <= v_today then v_opens := null; end if; -- already open
    if v_closes is null then v_open := true; end if;
    if v_closes is not null and v_closes < v_today then
      v_closed_urls := array_append(v_closed_urls, lower(v_url));
      continue;
    end if;
    -- Open until filled: up for 5 weeks past the last sighting, so only the
    -- 4-run backstop below takes it down when the sweep can't see it.
    v_expires := case when v_open then v_today + 35 else v_closes end;
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
      opens_on = v_opens,
      apply_link_tba = coalesce((v_item ->> 'apply_link_tba')::boolean, false),
      confirmed = coalesce((v_item ->> 'confirmed')::boolean, false),
      last_seen_on = v_today,
      missed_runs = 0
    where source = 'sweep' and lower(apply_url) = lower(v_url);
    get diagnostics v_n = row_count;
    if v_n > 0 then
      v_kept := v_kept + 1;
    else
      insert into jobs (source, apply_url, title, employer, location, category, description, posted_on, expires_on,
                        open_until_filled, opens_on, apply_link_tba, confirmed, last_seen_on, missed_runs)
      values ('sweep', v_url, v_title,
              left(trim(coalesce(v_item ->> 'employer', '')), 200),
              left(trim(coalesce(v_item ->> 'location', '')), 200),
              v_category,
              left(trim(coalesce(v_item ->> 'summary', '')), 500),
              v_today, v_expires, v_open, v_opens, coalesce((v_item ->> 'apply_link_tba')::boolean, false),
              coalesce((v_item ->> 'confirmed')::boolean, false), v_today, 0);
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
    v_opens := nullif(v_item ->> 'opens_on', '')::date;
    if v_opens is not null and v_closes is not null and v_opens > v_closes then
      raise exception 'Bad member job update (opens after it closes): %', left(v_item::text, 300);
    end if;
    if v_opens <= v_today then v_opens := null; end if;
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
      opens_on = case when v_item ? 'opens_on' then v_opens when opens_on <= v_today then null else opens_on end,
      apply_link_tba = case when v_item ? 'apply_link_tba' then coalesce((v_item ->> 'apply_link_tba')::boolean, false) else apply_link_tba end,
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

  -- Not seen this time: a miss, counted only on a complete run. A job comes
  -- down when the sweep shows it closed (closed list, closing date passed,
  -- above); only after 4 complete runs in a row without it (about a month)
  -- does not being found take it down (AJ, 2026-11-11: two misses took down
  -- jobs the sweep simply couldn't read).
  if v_complete then
    update jobs set missed_runs = missed_runs + 1
      where source = 'sweep' and not hidden and not (lower(apply_url) = any (v_found_urls));
    delete from jobs where source = 'sweep' and not hidden and missed_runs >= 4;
    get diagnostics v_n = row_count;
    v_removed := v_removed + v_n;
  end if;

  insert into job_sweep_runs (complete, found, added, kept, removed, hidden_skipped, already_listed, members_checked, members_filled, unreadable, notes,
                              searches, agencies_checked, agencies_total, ntn_florida)
  values (v_complete, jsonb_array_length(coalesce(payload -> 'found', '[]'::jsonb)), v_added, v_kept, v_removed, v_hidden, v_listed, v_mchecked, v_mfilled,
          greatest(coalesce((payload ->> 'unreadable')::integer, 0), 0), left(coalesce(payload ->> 'notes', ''), 500),
          greatest((payload ->> 'searches')::integer, 0), greatest((payload ->> 'agencies_checked')::integer, 0),
          greatest((payload ->> 'agencies_total')::integer, 0), greatest((payload ->> 'ntn_florida')::integer, 0));

  return jsonb_build_object('added', v_added, 'kept', v_kept, 'removed', v_removed, 'hidden_skipped', v_hidden, 'already_listed', v_listed,
                            'members_checked', v_mchecked, 'members_filled', v_mfilled,
                            'on_board', (select count(*) from jobs where source = 'sweep' and not hidden and expires_on >= v_today));
end $$;

revoke all on function public.job_sweep_apply(jsonb) from public, anon, authenticated;
grant execute on function public.job_sweep_apply(jsonb) to service_role;

-- The 11 jobs on one miss (and any other open-until-filled sweep job) stay up
-- under the new window instead of lapsing on 2026-11-20.
update public.jobs set expires_on = greatest(expires_on, (now() at time zone 'America/New_York')::date + 35)
  where source = 'sweep' and not hidden and open_until_filled;
