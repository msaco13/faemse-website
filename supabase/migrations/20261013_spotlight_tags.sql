-- Homepage spotlights: three small tags under the buttons on every slide
-- (Oct 2026), each with its own show switch, edited in the Spotlights panel.
-- They start as the three the welcome slide always showed (the defaults fill
-- every existing row and any row inserted without them), all switched on.
-- Apply after 20261013_welcome_slide_row.sql.
alter table public.spotlights add column if not exists tag_1 text not null default '501(c)(6) nonprofit';
alter table public.spotlights add column if not exists tag_2 text not null default 'Every program type, statewide';
alter table public.spotlights add column if not exists tag_3 text not null default 'Statewide meetings & workshops';
alter table public.spotlights add column if not exists show_tag_1 boolean not null default true;
alter table public.spotlights add column if not exists show_tag_2 boolean not null default true;
alter table public.spotlights add column if not exists show_tag_3 boolean not null default true;
