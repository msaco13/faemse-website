-- 2026-10-10: board-only documents (the Program Directors hub and its
-- companion hubs, while they are drafts). Paste once into the dashboard SQL
-- Editor (Supabase project FAEMSE WEBSITE). Safe to re-run.
--
-- Admins only, for every operation. Members and signed-out visitors get no
-- rows: no anon grant at all, and the only policy checks is_admin(). This is
-- a separate table rather than more rows in `documents` because every
-- current member can read every row there.
--
-- The document text is NOT in this repository. The repository is public, so
-- anything committed here is readable by anyone on GitHub. The text is
-- loaded straight into the table (SQL Editor, or a later admin upload), and
-- the site fetches it only for a signed-in admin.

create table if not exists public.admin_documents (
  slug text primary key,
  title text not null,
  -- One line shown under the title on the hubs index.
  summary text not null default '',
  -- Markdown: "#" title, "##" pillars, "###" subsections (see src/lib/hubs.ts).
  body text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.admin_documents enable row level security;

drop policy if exists "admins manage admin documents" on public.admin_documents;
create policy "admins manage admin documents" on public.admin_documents
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.admin_documents from anon;
grant select, insert, update, delete on public.admin_documents to authenticated;
