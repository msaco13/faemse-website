-- The homepage's welcome slide becomes a spotlight row (Oct 2026), so the
-- board edits it in the Spotlights panel with the same fields and switches
-- as the other slides. is_welcome marks it; the site gives that row the
-- welcome slide's own look (h1 with a gold last line, red join button, tags).
-- At most one welcome row. Seeded with the wording the site showed until now
-- (its headline and kicker were site_text overrides; those rows now go unused).
alter table public.spotlights add column if not exists is_welcome boolean not null default false;
create unique index if not exists spotlights_one_welcome on public.spotlights (is_welcome) where is_welcome;

insert into public.spotlights (sort_order, kicker, title, body, link_url, link_label, starts_on, is_welcome)
select 0,
       'Florida Association of EMS Educators',
       E'Supporting the educators\nwho train Florida''s\nfirst responders',
       'FAEMSE is the statewide professional home for EMS instructors, program directors, and training officers — the network, the resources, and the policy voice behind better EMT and paramedic education.',
       '/events',
       'See what''s coming up',
       '2026-09-03',
       true
where not exists (select 1 from public.spotlights where is_welcome);
