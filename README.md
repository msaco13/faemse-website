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

## Deploying

`npm run build` outputs a static site to `dist/`; deploy it to any static host
(Netlify/Vercel/Pages). SPA fallback: route all paths to `index.html`. The Vite
base path and router basename honor a `BASE_PATH` env var at build time for
hosts that serve from a subpath.

Two ready-made options in this repo:

1. **Supabase Edge Function** (interim public URL on the association's own
   project — no extra accounts needed):

   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/deploy-supabase.mjs
   ```

   Builds and deploys a `site` function serving the static build at
   https://iybsnqcffrhzhdpyoaqt.supabase.co/functions/v1/site/

2. **GitHub Pages** (`.github/workflows/deploy.yml`, currently manual-only):
   make the repo public (or use a plan with private-repo Pages), enable
   Settings → Pages → Source "GitHub Actions", run the workflow, then restore
   its push trigger for deploy-on-push (see the note in the workflow file).
   Serves at https://msaco13.github.io/faemse-website/

For the real faemse.org cutover, connect this repo to Netlify or Vercel
(build command `npm run build`, output `dist/`, SPA fallback on) and point DNS
at it — see PLAN.md §10 phase 5.
