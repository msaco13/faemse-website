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
  programs with links; click pins the card. The comet links are a minimum
  spanning tree lit outward from Tallahassee until the state is joined
  (geometry in `src/lib/florida.ts`). No zoom (removed by board decision,
  Sept 2026): the map is a fixed picture and the wheel always scrolls the
  page. Steps aside when a spotlight brings a photo or clip; still for
  reduced motion. The homepage sponsor strip below it runs one pass every
  90 seconds, pauses under the pointer, and each name links to the
  sponsor's site (`url` in `src/content/data.ts`).
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
- Palette: the site's navies are sampled from the seal render's own backdrop
  (lit top `#143257`, field `#0A213B`, shadowed corners `#04152A`; the `ink`
  and `ink2` tokens in `tailwind.config.js` and the section gradients in the
  pages). Every dark section carries the `velvet` class (`src/index.css`),
  which lays the backdrop's soft mottling over it as a few percent of noise.
  In the FAEMSE wordmark (header and footer) the EMS is set in the gold
  gradient (`.gold-text`), matching the seal's ring; FA and E stay white.
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
  (90/60/30/7 days) went to whom, so the daily job never double-sends.
- `membership_payments` — the dues ledger: one row per payment with method,
  amount, and the paid-through date before and after. Members read their own
  rows, admins read all; writes only through `extend_membership()` (Stripe
  webhook) and `admin_record_payment()`. See "Membership renewals" below.
- `site_settings.settings.online_dues` — the board's switch for the
  Pay-dues-online button (portal → Board admin → Online dues).
- `documents` — text documents members can read in the portal; today the
  full bylaws (slug `bylaws`, plain text, one line per paragraph, rendered
  with the document's own numbering as headings). Current members read,
  admins manage, the public gets nothing (RLS). The public Bylaws page shows
  an article-by-article outline instead. Schema and the bylaws text:
  `supabase/migrations/20260913_bylaws_documents.sql`. That file was written
  to be pasted into the SQL Editor and sat unapplied for a week — the portal's
  Bylaws card errored for every member, and the 90-day grace gate below never
  took effect — until the 2026-09-20 review applied both halves through the
  migration tool. Re-running it refreshes the text.
- Membership gate: `is_current_member()` — true for admins and for profiles
  whose `expires_at` plus a 90-day grace window is today or later (bylaws
  2.05 allows revocation only once dues are 90 days past due; the same
  migration installs the window). The portal shows "Renewal due" during the
  grace window and "lapsed" after it. One flag; tier stays a billing label.
  Membership runs twelve months from the last payment (board decision).
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

### Membership renewals

How a membership stays current (schema: `supabase/migrations/20260914_renewals.sql`,
applied 2026-09-14):

- **The paid-through date** (`profiles.expires_at`) is the one flag. Access
  continues 90 days past it (bylaws 2.05), then the portal shows "lapsed".
- **Every renewal is a payment row** in `membership_payments` (who, how much,
  check/cash/online/waived, the date before and after). The only writers are
  `extend_membership()` (service role: the Stripe webhook) and
  `admin_record_payment()` (the portal's Record-payment button). Both add
  twelve months to the *later* of today and the current paid-through date, so
  paying early never costs a member time.
- **Board side (portal → Board admin):** each member row has *Record a
  payment* (method + note → "Record $50 · +1 year"); a renewal form from an
  existing member shows *Paid · +1 year*, which records the payment and
  approves the form in one click; the *Dues ledger* lists every payment; the
  *Online dues* switch shows or hides the Pay-online button for members; and
  *Import the member roster* takes the old system's CSV (headers matched
  automatically: email, name, tier, paid-through, county, organization,
  certification), creates logins for anyone new, updates the rest by email,
  and never touches admin roles. "Check" runs it without writing anything.
- **Member side (portal):** a *Membership dues* card shows their tier, paid-
  through date, and recent payments. With online dues on, *Pay dues online*
  opens Stripe Checkout; the webhook extends their date and the portal shows
  it within seconds of returning. With it off, the card and the
  renewal-due/lapsed banners point to the renewal form instead.

#### Renewal reminder emails (90/60/30/7 days)

`supabase/functions/renewal-reminders/` emails members before their
expiration date; a `pg_cron` job (`renewal-reminders-daily`, 12:00 UTC)
calls it every day. Idempotent: `reminder_log` guarantees one email per
member per window per expiration date. **One manual step remains:** in
Supabase → Edge Functions → Secrets add `RESEND_API_KEY` (Resend account with
the faemse.org sending domain verified — Resend lists the DNS records to add
at GoDaddy). Until then the job runs daily and sends nothing. To test after
the key is in: Supabase → Edge Functions → renewal-reminders → Invoke, or
temporarily set a test member's paid-through date to today + 30.

#### Online dues (Stripe)

Functions `create-checkout` (starts a Stripe Checkout session for the
signed-in member, priced from their tier) and `stripe-webhook` (Stripe calls
it when a payment succeeds; it extends the member and writes the ledger row)
are deployed and inert until configured. One-time setup:

1. Stripe → Developers → API keys → copy the **secret key** (`sk_`) into
   Supabase → Edge Functions → Secrets as `STRIPE_SECRET_KEY`.
2. Stripe → Developers → Webhooks, now called **Event destinations** → Add
   destination. Scope **Your account**, payload style **snapshot** (a thin
   payload carries only an id and the function rejects it), events
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`,
   URL `https://iybsnqcffrhzhdpyoaqt.supabase.co/functions/v1/stripe-webhook`.
   Then open the destination and copy **its own signing secret**, the value
   starting `whsec_`, into Secrets as `STRIPE_WEBHOOK_SECRET`.

   > The one that bites: `STRIPE_WEBHOOK_SECRET` is **not** an API key. An
   > `sk_` or `rk_` pasted here makes every delivery fail signature
   > verification with a 400, and Stripe's dashboard shows a 100% error rate
   > on the destination. Each destination has its own `whsec_`, shown on that
   > destination's page, and it is not interchangeable with the one on the
   > API keys page. The function logs the reason for any rejection, including
   > the length and prefix of whatever it was given, so check the Supabase
   > edge function logs first.

3. In the portal's Board admin panel, switch **Online dues** on.

**Pausing payments (currently paused, 2026-09-20).** Online dues is switched
**off** at the board's request. Turning it back on is one click: portal →
Board admin → **Online dues** → On. Nothing in Stripe was changed — the keys,
the destination, and the past payments are all still there, so there is no
Stripe work to redo either way.

Off is enforced in two places, not one. The portal hides the button, and
`create-checkout` reads the same switch through `get_settings()` and refuses
before it ever calls Stripe. That second check is the one that matters: hiding
a button only hides it, and a member sitting on a page loaded before the
switch was flipped would otherwise still reach a live checkout. With the
switch off, a stale page gets a plain "payment is paused" message and no card
is charged. While it is off, the portal's renewal-due and lapsed banners point
members at the application form, and the Membership page drops its "renew
online in two minutes" line.

Quickest way to shortcut Stripe's moving dashboard: `dashboard.stripe.com/test/apikeys`
and `dashboard.stripe.com/test/webhooks` jump straight to the test-mode pages.
A failed delivery can be replayed from Workbench → Events → the event →
**Resend**, so debugging costs no further payments.

Test with Stripe's test keys first (card 4242 4242 4242 4242): the payment
shows in the ledger with method "Online (Stripe)". Stripe's fee is 2.9% +
30¢ per card payment (about $1.75 on $50). The site never sees card numbers.

#### Adding people

**One person:** Board admin → **Add a person**. Name, email, membership type,
paid-through date, and access level (Member or Board admin). No password is
set here by design: the account is created without one and the person chooses
their own with *Forgot password* on the sign-in page, so a password is never
typed by one person and emailed to another. Choosing Board admin runs a second
call to `admin_set_member`, the same database-gated route as the Role dropdown
on a member's row; the import path never grants access on its own.

**A whole roster:** *Import a whole roster from a spreadsheet*, below the
member list. Export the old system's members to Excel, save as CSV, and paste
it or drop the file in. A header row is matched by its column names (email,
name, tier, paid-through, county, organization, certification). **Without a
header row each value is matched by what it looks like**, so
`someone@example.org  Melissa  June 30, 2027` on one line is read correctly,
which is what a person types by hand. *Check (no changes)* reports what would
happen without writing anything. Existing people are matched by email and
updated, never duplicated.

The parsing is `src/lib/roster.ts`, kept free of React and network calls so it
can be exercised directly; `toRows()` is the entry point.

New members receive no email from either path; they set a password with
*Forgot password* on the sign-in page. That email goes out through Supabase
Auth, whose built-in mailer is limited to a few messages an hour — before
inviting the whole roster, set Supabase → Authentication → SMTP to the Resend
account (host `smtp.resend.com`, user `resend`, password = the API key).

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
every page. Turn on **Edit page** and every piece of site wording lights up:
gold means the original words from the code, green means the board has
already changed it. Click a phrase, change it in the panel, **Save** — it is
live for everyone on their next page load. **Restore original** puts the
code's words back. The "N edited" button lists everything the board has
changed, with a Restore next to each.

Logos and pictures work the same way. In edit mode every seal placement
(header, footer, sign-in page, honors band, final CTA, About page, 404) gets a
dashed frame; the spinning hero crest shows an **Edit hero crest** button at
its center. Click one to open the picture editor: a size slider (with the
default marked), an **Upload new image** button that stores the file in the
public `media` bucket, **Use the original image**, and **Restore original**.
Each placement is its own slot, so the header logo can be 56px while the
footer stays at 40px. Under the hood: `src/lib/media.tsx` — a `<Pic id=...>`
renders a plain `<img>` for visitors, and an override is one `site_text` row
(key `media.<slot>`, value `{"src": ..., "size": ...}`), so pictures ride on
the same table, cache, and permissions as the wording.

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

## Accessibility

The target is **WCAG 2.1 Level AA**, the checklist courts, settlements, and the
Justice Department's 2024 rule all point at when they say "ADA compliant
website". There is no certificate to obtain; there is only the checklist.

As of Sept 2026 the site reports **zero violations** under axe-core (WCAG 2.0/2.1
A and AA rules) across all 19 routes at 1366px and 390px, with every page
scrolled first so lazy sections mount. Already in place: a skip-to-content
link, a visible focus ring on every control, labeled form fields, alt text,
correct heading order, and `prefers-reduced-motion` handling on every
animation.

Two colors were darkened in Sept 2026 to clear contrast, and both are worth
leaving alone:

| Token | Was | Now | Ratio |
|---|---|---|---|
| `brand.blue` (links, eyebrows) | `#2F6BFF` | `#2560E8` | 4.49 → 5.36 on white, 4.15 → 4.95 on paper |
| Videos track numerals | `brand-gold/70` | `brand-golddeep` | 1.63 → 3.37 (large text needs 3.0) |

Re-check after any color or type change. Serve `dist/` and run axe against
each route; the quickest route is a Claude session, which has done exactly
this twice.

Two known items automated tools cannot catch, both currently **unaddressed**:
the sponsor marquee scrolls continuously and only pauses on mouse hover, so a
keyboard-only visitor cannot stop it (WCAG 2.2.2), and the hero slideshow
auto-advances every 8 s, though it does pause on focus. Both stop entirely
under `prefers-reduced-motion`. A pause button on the marquee would close it.

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
