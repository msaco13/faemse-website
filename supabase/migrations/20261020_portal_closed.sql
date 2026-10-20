-- The member portal stays closed until the board opens it (board,
-- 2026-10-20). The board's plan was always to open the portal with a launch
-- email; until then nobody but the admins should be in it, but renewal
-- reminders and payment emails had been inviting members to sign in.
--
-- 1. site_settings.settings.portal_open: the switch (Board tools → Dues &
--    tools → Member portal), set to closed here. get_settings() reports it,
--    so the site, the reminders and the payment emails all read one value.
-- 2. is_current_member(): admins always; everyone else only while the portal
--    is open and their membership (own dues or an organization's) is current
--    or in its 90-day grace window. It guards exactly the members-only
--    content (program hubs, documents, Q&A answers, teaching videos, member
--    library) and the member directory, so closing the portal locks those in
--    the database, not just on the page. Nothing else uses it: payments,
--    dues, the listserv and the voting roll are unaffected.

-- Reading site_settings briefly takes a lock profiles readers never wait on,
-- but keep the same short timeout as the other changes here.
set lock_timeout = '5s';

update public.site_settings
set settings = coalesce(settings, '{}'::jsonb) || '{"portal_open": false}'::jsonb,
    updated_at = now()
where id = 1 and not (coalesce(settings, '{}'::jsonb) ? 'portal_open');

create or replace function public.portal_is_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (settings ->> 'portal_open')::boolean from site_settings where id = 1), false);
$$;
-- Only other functions call it; clients read the switch through get_settings().
revoke all on function public.portal_is_open() from public, anon, authenticated;

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
        'portal_open', coalesce(settings -> 'portal_open', 'false'::jsonb))
       from site_settings where id = 1),
    jsonb_build_object('online_dues', 'false'::jsonb, 'reminders_paused', 'false'::jsonb, 'portal_open', 'false'::jsonb)
  );
$$;

create or replace function public.is_current_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or (
    public.portal_is_open()
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.expires_at is not null and p.expires_at + 90 >= current_date
      )
      or exists (
        select 1 from public.organization_members om
        join public.organizations o on o.id = om.organization_id
        where om.profile_id = auth.uid()
          and o.expires_at is not null and o.expires_at + 90 >= current_date
      )
    )
  );
$$;
