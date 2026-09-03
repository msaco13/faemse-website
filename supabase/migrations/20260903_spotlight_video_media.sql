-- Spotlight video backdrops + a board-managed media bucket (Sept 2026).
-- Already applied to the FAEMSE WEBSITE project; kept as the source of record.

-- A spotlight may carry a short, muted, looping clip that plays behind the
-- slide (the "cool rotating videos" idea). Direct MP4/WebM links play inline;
-- YouTube/Vimeo links play as a background embed. image_url doubles as the
-- poster/fallback for reduced-motion visitors and while the clip loads.
alter table public.spotlights add column if not exists video_url text not null default '';

-- Public media bucket: admins upload photos and clips from the portal instead
-- of hosting them elsewhere. Public read (the homepage needs it), admin write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media is public" on storage.objects;
create policy "media is public" on storage.objects
  for select using (bucket_id = 'media');
drop policy if exists "admins upload media" on storage.objects;
create policy "admins upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and (select public.is_admin()));
drop policy if exists "admins update media" on storage.objects;
create policy "admins update media" on storage.objects
  for update to authenticated using (bucket_id = 'media' and (select public.is_admin()));
drop policy if exists "admins delete media" on storage.objects;
create policy "admins delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and (select public.is_admin()));
