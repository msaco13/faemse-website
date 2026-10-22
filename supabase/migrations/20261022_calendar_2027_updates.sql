-- Calendar dates from the board's recommendations (2026-10-22). Already
-- applied: the EMSAC entry by insert, the EMS World Live change as migration
-- calendar_ems_world_live_2027. Kept here as the record; safe to run again.
--
-- EMSAC: January 6–8, 2027. The Department of Health had not posted the
-- notice, so the location stays TBA. EMS World Live: June 2–4, 2027, Las
-- Vegas, as the board received them; HMP had not posted them yet.

insert into public.events (starts_on, title, detail, location, tag, tag_color, url)
select '2027-01-06', 'Florida EMS Advisory Council (EMSAC) meeting',
  'Jan 6–8. Location to be confirmed; last January the council met alongside the Florida Fire & EMS Conference in Orlando.',
  'TBA', 'Florida', 'gold',
  'https://www.floridahealth.gov/provider-and-partner-resources/advisory-councils-stakeholder-groups/ems-advisory-council/index.html'
where not exists (select 1 from public.events where title ilike '%Advisory Council (EMSAC)%' and starts_on = '2027-01-06');

update public.events
set starts_on = '2027-06-02',
    location = 'Las Vegas, NV',
    detail = 'June 2–4. Dates and city as the board received them; HMP has not posted them on its site yet. Not a FAEMSE meeting; shared for members'' planning.'
where title = 'EMS World Live 2027';
