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

## Deploying / migrating

This folder is fully self-contained. To move it to its own repository
(github.com/msaco13/faemse-website):

```bash
git clone https://github.com/msaco13/faemse-website.git
cp -r faemse-site/. faemse-website/   # excluding node_modules/dist via .gitignore
cd faemse-website && git add -A && git commit -m "Import FAEMSE site" && git push
```

Deploy `dist/` to any static host (Netlify/Vercel). SPA fallback: route all paths
to `index.html`.
