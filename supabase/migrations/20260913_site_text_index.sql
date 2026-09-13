-- Cover the site_text.updated_by foreign key (Supabase performance advisor,
-- Sept 2026). Already applied to the FAEMSE WEBSITE project.
create index if not exists site_text_updated_by_idx on public.site_text (updated_by);
