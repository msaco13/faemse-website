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
- `src/content/programs.ts` — the 59 Florida EMT and paramedic programs, one
  row per school with its campus city, coordinates, and homepage. Schools that
  share a city also carry `campus` (where the campus actually is, for the
  zoomed-in map) and, where the full name is long, a `short` map label. Feeds
  the map and the Programs page (`src/pages/Programs.tsx`); edit it to add or
  correct a school.
- `src/components/FloridaNetwork.tsx` — the Florida map on the homepage hero
  and the Programs page: a solid navy state with a gold coastline and one
  pulsing dot per city with an EMS program. Hover or tap a city to open its
  programs with links. The comet links are a minimum spanning tree lit
  outward from Orlando until the state is joined (geometry in
  `src/lib/florida.ts`). The map zooms: click it (or a numbered city, or a
  region button under it) and the wheel zooms toward the cursor up to 5×,
  drag pans, pinch works on a phone; names grow as you go in and a city with
  several schools folds open into one dot per campus. Until the map is
  clicked the wheel scrolls the page as usual. Esc zooms out and releases it.
  Steps aside when a spotlight brings a photo or clip; still for reduced
  motion.
- `src/lib/text.tsx` — admin-editable wording: the `<T id>` wrapper every
  static string sits in, the provider that loads overrides from `site_text`,
  and the in-page editor. `src/components/EditModeBar.tsx` is the admin toggle.
- `src/components/Seal.tsx` — the association's seal, the site's one logo:
  header and footer lockups, login, 404, the honors band, the About heritage
  strip, the final CTA, the favicon and Apple touch icon, and the social card
  (`public/og.png`). Source render: `brand/seal-3d.webp`; the site serves two
  circular crops of it, `public/seal-192.webp` for chrome-sized placements
  and `public/seal-crest.webp` (800px) for large ones. The earlier Pulse Star
  mark and the flat drawn seal are retired; their files stay in `brand/` for
  reference only.
- `src/components/HeroCrest.tsx` — the seal ghosted behind the homepage hero
  copy at 8%, turning on its vertical axis like a coin once every 20 seconds.
  Off on phones and for reduced motion.
- Design philosophy lives in `brand/PHILOSOPHY.md`.
- `src/pages/` — one file per route (Home, About, Board, Bylaws, Membership, Events,
  News, Resources, Programs, Sponsors, Contact, 404).
- `src/lib/supabase.ts` — client for the association's Supabase project. The embedded
  anon key is public by design; row-level security governs access. Override with
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars if the project changes.

## Backend

Supabase project `FAEMSE WEBSITE` (ref `iybsnqcffrhzhdpyoaqt`), owned by the
association's Supabase organization.

- `contact_messages` — contact-form submissions. Anyone may INSERT; board
  admins read them and mark them handled from the portal's Board admin panel.
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
- `spotlights` — the homepage hero rotator ("one main screen that flips
  through"): kicker, headline, body, optional photo, optional **video**,
  button, show-from and stop-after dates. A video plays muted on loop behind
  the slide (direct MP4/WebM, or a YouTube/Vimeo link as a background embed);
  the photo is the still frame for reduced-motion and data-saver visitors.
  Board-editable from the portal's Boards & library panel; the hero falls
  back to a bundled evergreen set if the table is unreachable.
- Storage bucket `media` — public-read, admin-write. The spotlight form's
  Upload buttons put photos and clips here (50 MB cap, images and
  MP4/WebM/MOV only) so the board never needs outside hosting. Guidance in
  the form: clips of 10–20 seconds, 1080p, under 20 MB; no audio needed.
- `qa_entries.published` — Q&A review queue. Unpublished entries are visible
  only to admins (badge: "Draft · admins only") until the board flips the
  Published box in the portal. Ten researched drafts were loaded unpublished
  on 2026-09-02 for the board to verify.
- `site_text` — admin-edited wording. One row per editable string on the
  public site, keyed by the dotted id in the code (`home.hero.h1`). No row
  means "use the words in the code", which is also what happens if the table
  is unreachable, so an outage can never blank the site. Public read,
  admin-only write. Schema: `supabase/migrations/20260912_site_text.sql`
  (paste it once into the dashboard SQL Editor; until then the edit bar shows
  setup instructions instead of failing).
- `reminder_log` — service-role-only record of which renewal reminder
  (90/60/30 days) went to whom, so the daily job never double-sends.
- Membership gate: `is_current_member()` — true for admins and for profiles
  whose `expires_at` is today or later. One flag; tier stays a billing label.
- Schema for all of the above:
  `supabase/migrations/20260901_brief_features.sql` (already applied to the
  live project on 2026-09-01), then
  `supabase/migrations/20260901_policy_tuning.sql` (also applied) which
  collapses overlapping RLS policies and evaluates the auth checks once per
  query instead of once per row — same access rules, faster queries; then
  `supabase/migrations/20260902_links_bodies_messages.sql` (also applied):
  event links, full news bodies, admin-readable contact messages; then
  `supabase/migrations/20260902_spotlights_qa_publish.sql` and
  `supabase/migrations/20260903_spotlight_video_media.sql` (both applied):
  the spotlight rotator, Q&A review queue, spotlight video, media bucket.

### Email routing (interim)

faemse.org mail is hosted on Microsoft 365 by the association, so
`info@faemse.org` is real — but until the board confirms who monitors it,
every "send us a posting / class / resource / video" button on the site
addresses info@faemse.org **and copies the interim board inbox**
(`contact.boardCc` in `src/content/data.ts`: Jorge Anzardo and Michael
Saco). Change that one constant when the association mailbox is confirmed.

### Board notifications (contact form + applications)

`supabase/functions/notify-board/` emails the board whenever a contact-form
message or membership application is inserted, via Supabase Database
Webhooks. Setup steps (webhooks, `WEBHOOK_SECRET`, `RESEND_API_KEY`,
`NOTIFY_TO`) are at the top of the function file. It shares the Resend
account with the renewal reminders, so one setup unlocks both. Until then,
messages and applications are still visible in the portal's Board admin
panel — nothing is lost, it just isn't pushed.

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
   - **Boards & library** — homepage spotlights (with photo/video upload),
     jobs, classes, Q&A entries, teaching videos, and the member library.
     Jobs, classes, and spotlights carry an end date and drop off the public
     site automatically when it passes.

### Editing the words on the site (admins)

Any signed-in admin sees a small **Board tools** bar at the bottom-left of
every page. Turn on **Edit text** and every piece of site wording lights up:
gold means the original words from the code, green means the board has
already changed it. Click a phrase, change it in the panel, **Save** — it is
live for everyone on their next page load. **Restore original** puts the
code's words back. The "N edited" button lists everything the board has
changed, with a Restore next to each.

What it covers: headlines, paragraphs, buttons, card copy, page banners,
navigation labels, footer text, form labels, and empty-state messages on the
public pages and the member portal. What it does not cover: content that
already has its own editor (events, news, jobs, classes, Q&A, videos,
spotlights, library), names, addresses, emails, prices, and layout. For
visitors the page is unchanged — with edit mode off the wording renders with
no extra markup.

Under the hood: `src/lib/text.tsx`. Each string in the code is wrapped as
`<T id="page.section.slot">original words</T>`; the words in the code are the
fallback and the `site_text` row is the override. Adding a new editable
string is one wrapper; there is no registry to keep in sync. Overrides are
cached per browser so returning visitors never see the code's wording flash
before the saved wording arrives.

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
   Serves at https://faemse.org/

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
