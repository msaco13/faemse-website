// Signed-out smoke check for faemse.org. Runs hourly from
// .github/workflows/smoke.yml and can be run by hand: `node scripts/smoke.mjs`.
//
// The site is built to fail soft: when a live read is refused it shows its
// bundled sample content instead of an error, so an outage for signed-out
// visitors is invisible to anyone testing while signed in (that is how the
// homepage spotlights, jobs and classes were silently sample-only for three
// weeks in September 2026). This script asks for everything the public
// pages ask for, exactly as an anonymous visitor, and fails loudly.
//
// No dependencies, Node 20+. Exit code 1 on any failure.

const SITE = process.env.SMOKE_SITE ?? 'https://faemse.org';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://iybsnqcffrhzhdpyoaqt.supabase.co';
// The anon key is the public client key shipped in the site bundle; RLS is
// what protects the data. Same default as src/lib/supabase.ts.
const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5YnNucWNmZnJoemhkcHlvYXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzg4NDcsImV4cCI6MjEwMzYxNDg0N30.2hOdsxw9ja-TFVV64v7tI31MukUqgeAPqYnkU_Kb-Ts';

const failures = [];
const notes = [];

function ok(label, cond, detail = '') {
  if (cond) notes.push(`ok    ${label}${detail ? ` (${detail})` : ''}`);
  else failures.push(`FAIL  ${label}${detail ? ` (${detail})` : ''}`);
}

async function fetchText(url, init = {}) {
  const t0 = Date.now();
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  return { res, text, ms: Date.now() - t0 };
}

function today() {
  // The site filters by the visitor's local date; the checks below use UTC,
  // which can only differ by a day at the edges and never turns a real
  // outage into a pass.
  return new Date().toISOString().slice(0, 10);
}

// --- 1. The site itself ------------------------------------------------------

async function checkSite() {
  const home = await fetchText(`${SITE}/`);
  ok('homepage responds', home.res.status === 200, `status ${home.res.status}, ${home.ms} ms`);
  ok('homepage is fast enough', home.ms < 5000, `${home.ms} ms`);
  const bundle = home.text.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  ok('homepage references a JS bundle', !!bundle, bundle ?? 'none found');
  if (bundle) {
    const js = await fetchText(`${SITE}${bundle}`);
    ok('JS bundle is served', js.res.status === 200 && js.text.length > 10000, `status ${js.res.status}, ${js.text.length} bytes`);
    ok('bundle points at the right database', js.text.includes(SUPABASE_URL), SUPABASE_URL);
  }
  const css = home.text.match(/\/assets\/index-[A-Za-z0-9_-]+\.css/)?.[0];
  if (css) {
    const c = await fetchText(`${SITE}${css}`);
    ok('CSS is served', c.res.status === 200, `status ${c.res.status}`);
  }
  // Deep links: GitHub Pages serves the app from 404.html with a 404 status
  // (the app then routes client-side). What matters is that the app loads.
  const deep = await fetchText(`${SITE}/members`);
  ok('deep link serves the app', [200, 404].includes(deep.res.status) && deep.text.includes('id="root"'), `status ${deep.res.status}`);
  const login = await fetchText(`${SITE}/login`);
  ok('login page serves the app', [200, 404].includes(login.res.status) && login.text.includes('id="root"'), `status ${login.res.status}`);
}

// --- 2. Every public read, as an anonymous visitor ---------------------------

async function anon(path) {
  const r = await fetchText(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Accept: 'application/json' },
  });
  let json = null;
  try {
    json = JSON.parse(r.text);
  } catch {
    /* not JSON */
  }
  return { ...r, json };
}

async function checkPublicReads() {
  const d = today();
  // [label, path, minimum rows or null]
  const reads = [
    ['events (calendar)', `events?select=id,starts_on&order=starts_on.asc&limit=200`, 1],
    ['news posts', `news_posts?select=id&limit=50`, null],
    ['homepage spotlights (active)', `spotlights?select=id,kicker,title&starts_on=lte.${d}&or=(expires_on.is.null,expires_on.gte.${d})&order=sort_order.asc`, null],
    ['job board', `jobs?select=id&expires_on=gte.${d}`, null],
    ['class board', `class_listings?select=id&expires_on=gte.${d}`, null],
    ['bylaws (public document)', `documents?select=slug,title&slug=eq.bylaws`, 1],
    ['site text overrides', `site_text?select=key&limit=5`, null],
  ];
  for (const [label, path, min] of reads) {
    const r = await anon(path);
    const rows = Array.isArray(r.json) ? r.json : null;
    const detail = `status ${r.res.status}, ${rows ? rows.length + ' rows' : r.text.slice(0, 120)}, ${r.ms} ms`;
    ok(`anon read: ${label}`, r.res.status === 200 && rows !== null && (min === null || rows.length >= min), detail);
    ok(`anon read is fast: ${label}`, r.ms < 4000, `${r.ms} ms`);
  }

  // The failure mode from 2026-09-23: a public policy calling a function the
  // anon role may not execute. Any 42501 anywhere is a hard fail.
  const spot = await anon(`spotlights?select=id&limit=1`);
  ok('no "permission denied" on public tables', !/42501|permission denied/i.test(spot.text), spot.text.slice(0, 120));

  // Public RPCs the pages call while signed out.
  for (const fn of ['get_settings', 'get_qa_index', 'get_video_index']) {
    const r = await fetchText(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    ok(`anon rpc: ${fn}`, r.res.status === 200, `status ${r.res.status}, ${r.text.slice(0, 80)}`);
  }

  // Things anon must NOT be able to do: a pass here is a leak.
  const priv = await anon(`profiles?select=email&limit=1`);
  ok('anon cannot list member profiles', priv.res.status !== 200 || (Array.isArray(priv.json) && priv.json.length === 0), `status ${priv.res.status}, ${priv.text.slice(0, 80)}`);
  const pay = await anon(`membership_payments?select=id&limit=1`);
  ok('anon cannot read the dues ledger', pay.res.status !== 200 || (Array.isArray(pay.json) && pay.json.length === 0), `status ${pay.res.status}`);
  const apps = await anon(`membership_applications?select=email&limit=1`);
  ok('anon cannot read applications', apps.res.status !== 200 || (Array.isArray(apps.json) && apps.json.length === 0), `status ${apps.res.status}`);
  const lib = await anon(`library_resources?select=id&limit=1`);
  ok('anon cannot read the member library', lib.res.status !== 200 || (Array.isArray(lib.json) && lib.json.length === 0), `status ${lib.res.status}`);
}

// --- 3. Payments stay off until the board says otherwise --------------------

async function checkSettings() {
  const r = await fetchText(`${SUPABASE_URL}/rest/v1/rpc/get_settings`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  let s = null;
  try {
    s = JSON.parse(r.text);
  } catch {
    /* handled below */
  }
  ok('settings readable', s !== null && typeof s === 'object', r.text.slice(0, 80));
  if (s) notes.push(`info  online_dues=${s.online_dues} reminders_paused=${s.reminders_paused}`);
}

// --- run ---------------------------------------------------------------------

try {
  await checkSite();
  await checkPublicReads();
  await checkSettings();
} catch (e) {
  failures.push(`FAIL  smoke script threw: ${String(e).slice(0, 200)}`);
}

for (const n of notes) console.log(n);
for (const f of failures) console.error(f);
console.log(`\n${failures.length === 0 ? 'ALL CLEAR' : `${failures.length} FAILURE(S)`} · ${SITE} · ${new Date().toISOString()}`);
process.exit(failures.length === 0 ? 0 : 1);
