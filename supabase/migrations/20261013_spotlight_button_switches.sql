-- Homepage spotlights: per-slide switches for the two buttons (Oct 2026).
-- show_link hides the gold "Button text" button, show_join hides
-- "Become a member". Both default on, so every existing slide looks the same
-- until the board unticks one in the Spotlights panel.
alter table public.spotlights add column if not exists show_link boolean not null default true;
alter table public.spotlights add column if not exists show_join boolean not null default true;
