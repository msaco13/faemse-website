# FAEMSE Website

The new website for the Florida Association of EMS Educators (faemse.org).
React + Vite + TypeScript + Tailwind, backed by the association's Supabase project.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
```

## Structure

- `src/content/data.ts` — all site content in one place (board roster, membership tiers,
  resources, sponsors, events, news, FAQ, contact info). Verified against the live
  faemse.org in Aug 2026; items marked SAMPLE need real association data.
- `src/components/Mark.tsx` — the Pulse Star logo (Star of Life with carved EKG channel).
  Brand assets and design philosophy live in `brand/`.
- `src/pages/` — one file per route (Home, About, Board, Bylaws, Membership, Events,
  News, Resources, Sponsors, Contact, 404).
- `src/lib/supabase.ts` — client for the association's Supabase project. The embedded
  anon key is public by design; row-level security governs access. Override with
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars if the project changes.

## Backend

Supabase project `FAEMSE WEBSITE` (ref `iybsnqcffrhzhdpyoaqt`), owned by the
association's Supabase organization.

- `contact_messages` — contact-form submissions. RLS: anon may INSERT only;
  reading requires the service role (dashboard → Table Editor).
- `membership_applications` — join/renew form submissions. Admins review them
  from the portal's Board admin panel.
- `profiles` — member portal profiles (tier, expiration, directory listing,
  role). `role = 'admin'` unlocks the admin panels on the Members page.
- `events`, `news_posts` — the public calendar and news, editable from the
  portal's **Site content** panel (admins only). Schema:
  `supabase/migrations/20260830_editable_content.sql` — paste it once into the
  dashboard SQL Editor to install. Until the tables exist (or while they are
  empty), the public site falls back to the bundled sample listings with a
  visible "sample" label.
- `jobs`, `class_listings` — the public job and class boards. Every row
  carries `expires_on`; the public site hides expired listings automatically
  (RLS filter), while admins keep seeing them in the portal so recurring
  postings can be reposted by editing dates instead of retyped.
- `qa_entries` — the Q&A archive (distilled listserv threads). Questions are
  public via the `get_qa_index()` RPC; full rows (answers) are readable only
  by current members/admins via RLS. Full-text search index included.
- `teaching_videos` — YouTube/Vimeo links embedded members-only; titles are
  public via `get_video_index()`.
- `library_resources` — the members-only resource library (tagged links),
  shown on the Members page.
- `reminder_log` — service-role-only record of which renewal reminder
  (90/60/30 days) went to whom, so the daily job never double-sends.
- Membership gate: `is_current_member()` — true for admins and for profiles
  whose `expires_at` is today or later. One flag; tier stays a billing label.
- Schema for all of the above:
  `supabase/migrations/20260901_brief_features.sql` (already applied to the
  live project on 2026-09-01), then
  `supabase/migrations/20260901_policy_tuning.sql` (also applied) which
  collapses overlapping RLS policies and evaluates the auth checks once per
  query instead of once per row — same access rules, faster queries.

### Renewal reminder emails (90/60/30 days)

`supabase/functions/renewal-reminders/` emails members before their
expiration date. It is idempotent and safe to run daily. **One manual step
remains:** create a Resend account, verify the faemse.org sending domain, and
set `RESEND_API_KEY` as a function secret — full instructions are at the top
of the function file. Until the key is set the function only logs what it
would send.

## Updating the site (board admins — no GitHub needed)

Day-to-day content changes happen inside the website itself:

1. Sign in at `/login` with an account whose profile role is `admin`.
2. The Members page shows three admin panels:
   - **Board admin** — review membership applications, set tiers,
     paid-through dates, and grant the admin role to other members.
   - **Site content** — add, edit, and delete calendar events and news
     posts. Saves publish to the public site immediately.
   - **Boards & library** — jobs, classes, Q&A entries, teaching videos,
     and the member library. Jobs and classes carry an end date and drop
     off the public site automatically when it passes.

Bootstrapping the first admin (one time, in the Supabase dashboard):
Authentication → Users → Add user (email + password, auto-confirm), sign in
once at `/login` so the profile row is created, then run in SQL Editor:
`update public.profiles set role = 'admin' where email = 'their@email';`
After that, further admins are granted from the Board admin panel.

Everything else (page copy, board roster, dues amounts, design) lives in
`src/content/data.ts` and the codebase — edit via GitHub or a Claude session.

## Deploying

`npm run build` outputs a static site to `dist/`; deploy it to any static host
(Netlify/Vercel/Pages). SPA fallback: route all paths to `index.html`. The Vite
base path and router basename honor a `BASE_PATH` env var at build time for
hosts that serve from a subpath.

Two ready-made options in this repo:

1. **GitHub Pages** (`.github/workflows/deploy.yml`, deploys on every push to
   main once activated): make the repo public (or use a plan with
   private-repo Pages) and enable Settings → Pages → Source "GitHub Actions".
   Serves at https://msaco13.github.io/faemse-website/

2. **Supabase Edge Function** (`scripts/deploy-supabase.mjs`) — deploys the
   build as a `site` function on the association's Supabase project.
   ⚠ Supabase's gateway rewrites HTML/XHTML content-types to text/plain on
   `*.supabase.co` function URLs (anti-phishing), so pages will NOT render
   there — assets serve fine. Only useful behind a Supabase custom domain
   (paid add-on), where the rewrite doesn't apply.

For the real faemse.org cutover, connect this repo to Netlify — `netlify.toml`
already carries the build command, SPA fallback, cache headers, and security
headers, so the only dashboard step is adding the custom domain — then point
DNS at it. See PLAN.md §10 phase 5.
