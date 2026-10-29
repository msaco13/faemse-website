// Browser check of the save guards (review, 2026-10-29): the hub editor and
// the member profile form must never save a record that did not load. It
// opens the real pages as a made-up admin and made-up members, and answers
// every database request itself, so nothing reaches the real database and
// every save is captured here instead of sent. Pages and scripts come from
// the site given; only the database is played.
//
// Cases: a hub whose text fails to load, is missing, or loads slowly, each
// followed by a title edit and Save; Try again after a failure; a profile
// that fails or loads slowly while the member clicks Save; an opted-out
// member saving an unrelated change; ordinary saves, including deliberate
// edits (clearing a field, opting in).
//
//   npm run build && npx vite preview --port 4173 &
//   node scripts/save-guards.mjs
//   GUARDS_SITE=https://faemse.org node scripts/save-guards.mjs   (the live pages)
//
// GUARDS_CHROME points at a Chrome or Chromium if Playwright has none of its own.
// Exit code 0 when every case passes, 1 when any fails.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const SITE = (process.env.GUARDS_SITE ?? 'http://localhost:4173').replace(/\/$/, '');
const ORIGIN = new URL(SITE).origin;
const src = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const REF = src.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];

const now = Math.floor(Date.now() / 1000);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function person(id, profile) {
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, role: 'authenticated', aud: 'authenticated', exp: now + 7200 })}.sig`;
  const user = { id, aud: 'authenticated', role: 'authenticated', email: profile.email, app_metadata: { provider: 'email' }, user_metadata: {} };
  return {
    user,
    session: { access_token: jwt, token_type: 'bearer', expires_in: 7200, expires_at: now + 7200, refresh_token: 'x', user },
    profile: { id, tier: 'active', expires_at: '2027-06-30', ...profile },
  };
}
// Made-up people; example.org addresses never reach anyone.
const ADMIN = person('00000000-0000-4000-8000-0000000000aa', { email: 'test.admin@example.org', full_name: 'Test Admin', role: 'admin', show_in_directory: true, cert_level: 'Paramedic', agency: 'Example College', county: 'Leon' });
const OPTED_OUT = person('00000000-0000-4000-8000-000000000001', { email: 'pat@example.org', full_name: 'Pat Example', role: 'member', show_in_directory: false, cert_level: 'Paramedic', agency: 'Example College', county: 'Leon' });
const LISTED = person('00000000-0000-4000-8000-000000000002', { email: 'sam@example.org', full_name: 'Sam Example', role: 'member', show_in_directory: true, cert_level: 'EMT', agency: 'Example Fire Rescue', county: 'Wakulla' });

const HUBS = [
  { slug: 'program-directors', title: 'Program Directors Hub', summary: 'For program directors.', sort_order: 10, updated_at: '2026-10-13T12:00:00Z' },
  { slug: 'instructors', title: 'Instructors Hub', summary: 'For instructors.', sort_order: 20, updated_at: '2026-10-13T12:00:00Z' },
];
// Already clean under the hub rules (lib/hubDraft.ts), so Save sends it unchanged.
const HUB_BODY = '# Program Directors Hub\n\nA starting point for program directors.\n\n## Accreditation\n### Deadlines\nPlaceholder text for this check.\n\n## Maintenance notes\nNotes for admins.';

// Database functions the pages call to read; anything else that writes is captured.
const READ_RPCS = new Set(['ensure_profile', 'get_directory', 'my_organizations', 'get_settings', 'get_qa_index', 'get_video_index', 'admin_list_members', 'admin_list_payments', 'get_listserv', 'get_voting_roll']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: process.env.GUARDS_CHROME || undefined, args: ['--no-sandbox'] });

// One browser context per case. `reads` says how the record under test
// answers: { mode: 'ok' | 'fail' | 'missing' | 'network', delay: ms }; a
// case can change it mid-way (Try again). 'fail' is a 500, which the
// database client reports at once; 'network' is a dropped connection, which
// it retries three times (1, 2 and 4 s) before reporting, so the error shows
// after about 7 s.
async function open(who, path, reads) {
  const writes = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify(who.session)]);
  await ctx.route('**/*', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (!u.host.endsWith('.supabase.co')) return u.origin === ORIGIN ? route.continue() : route.abort();
    const p = u.pathname;
    const m = req.method();
    const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const played = async (ctl, row) => {
      if (ctl.delay) await sleep(ctl.delay);
      if (ctl.mode === 'network') return route.abort('failed');
      if (ctl.mode === 'fail') return json({ code: 'XX000', message: 'Internal error (save-guards check)', details: null, hint: null }, 500);
      if (ctl.mode === 'missing') return json(one ? null : []);
      return json(one ? row : [row]);
    };
    if (p.startsWith('/auth/v1/user')) return json(who.user);
    if (p.startsWith('/auth/v1/token')) return json(who.session);
    if (p.startsWith('/auth/v1/')) return json({});
    if (p === '/rest/v1/profiles' && m === 'GET') return played(reads.profile ?? { mode: 'ok' }, who.profile);
    if (p === '/rest/v1/admin_documents' && m === 'GET') {
      if ((u.searchParams.get('select') || '').includes('body')) return played(reads.hub ?? { mode: 'ok' }, { body: HUB_BODY });
      return json(HUBS);
    }
    if (p.startsWith('/rest/v1/rpc/') && READ_RPCS.has(p.slice('/rest/v1/rpc/'.length))) {
      if (p.endsWith('/ensure_profile')) return route.fulfill({ status: 204, body: '' });
      if (p.endsWith('/get_settings')) return json({});
      return json([]);
    }
    if (m === 'GET' || m === 'HEAD') return json(one ? null : []);
    let body = null;
    try {
      body = req.postDataJSON();
    } catch {
      body = req.postData();
    }
    writes.push({ method: m, path: p, query: u.search, body });
    return route.fulfill({ status: 204, body: '' });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(SITE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page, writes, errors, reads };
}

const results = [];
async function run(name, fn) {
  const facts = [];
  const note = (s) => facts.push(s);
  let failure = '';
  try {
    failure = (await fn(note)) || '';
  } catch (e) {
    failure = `could not finish: ${e.message.split('\n')[0]}`;
  }
  results.push({ name, ok: !failure });
  console.log(`${failure ? 'FAIL' : 'PASS'}  ${name}`);
  for (const f of facts) console.log(`      ${f}`);
  if (failure) console.log(`      -> ${failure}`);
}

const enabled = async (loc) => (await loc.count()) > 0 && (await loc.first().isEnabled());
// Waits for the screen's "didn't load" error, up to 15 s (past the client's retries).
async function loadError(page) {
  const alert = page.getByRole('alert').filter({ hasText: "didn't load" });
  await alert.waitFor({ timeout: 15000 }).catch(() => undefined);
  return (await alert.count()) > 0;
}

// Hub editor --------------------------------------------------------------

async function openHub(reads) {
  const s = await open(ADMIN, '/admin#hubs', reads);
  await s.page.getByText('/hubs/program-directors').waitFor({ timeout: 20000 });
  await s.page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  return s;
}
// Tries what an admin would: change the title, then Save. Returns what the page allowed.
async function editTitleAndSave(page, title) {
  const titleBox = page.getByLabel('Title', { exact: true });
  const save = page.getByRole('button', { name: 'Save this hub' });
  const titleEditable = await enabled(titleBox);
  if (titleEditable) await titleBox.fill(title);
  const saveEnabled = await enabled(save);
  if (saveEnabled) await save.click();
  await sleep(800);
  return { titleEditable, saveEnabled };
}
const hubWrites = (writes) => writes.filter((w) => w.path === '/rest/v1/admin_documents');

for (const [label, ctl] of [
  ['fails to load', { mode: 'fail' }],
  ['is missing', { mode: 'missing' }],
]) {
  await run(`Hub: text ${label}, then a title edit and Save`, async (note) => {
    const { ctx, page, writes } = await openHub({ hub: ctl });
    const alert = await loadError(page);
    const tried = await editTitleAndSave(page, 'Program Directors Hub (edited)');
    const retry = await page.getByRole('button', { name: 'Try again' }).count();
    note(`title editable: ${tried.titleEditable}; Save enabled: ${tried.saveEnabled}; error shown: ${alert}; Try again: ${retry > 0}`);
    const sent = hubWrites(writes);
    for (const w of sent) note(`SENT ${w.method} ${w.path}${w.query} body: ${JSON.stringify(w.body).slice(0, 160)}`);
    await ctx.close();
    if (sent.length) return `Save wrote the hub (body ${JSON.stringify(sent[0].body?.body ?? '')}): the real text would be replaced`;
    if (tried.titleEditable) return 'the title could still be edited although the text never loaded';
    if (!alert || !retry) return 'no error with a Try again button';
    return '';
  });
}

await run('Hub: Try again after a failed load, then a title edit saves the real text', async (note) => {
  const s = await openHub({ hub: { mode: 'fail' } });
  await loadError(s.page);
  s.reads.hub = { mode: 'ok' };
  const retry = s.page.getByRole('button', { name: 'Try again' });
  if (!(await retry.count())) {
    await s.ctx.close();
    return 'no Try again button';
  }
  await retry.click();
  await s.page.getByRole('textbox', { name: 'Program Directors Hub text' }).waitFor({ timeout: 10000 });
  const tried = await editTitleAndSave(s.page, 'Program Directors Hub (edited)');
  const sent = hubWrites(s.writes);
  note(`title editable: ${tried.titleEditable}; Save enabled: ${tried.saveEnabled}; saves sent: ${sent.length}`);
  await s.ctx.close();
  if (sent.length !== 1) return `expected one save, got ${sent.length}`;
  if (sent[0].body?.body !== HUB_BODY) return `the save changed the text: ${JSON.stringify(sent[0].body?.body).slice(0, 120)}`;
  if (sent[0].body?.title !== 'Program Directors Hub (edited)') return 'the new title was not sent';
  note('sent: the new title with the hub text exactly as loaded');
  return '';
});

await run('Hub: text slow to load (3 s), title edit and Save tried during the wait, then a normal save', async (note) => {
  const { ctx, page, writes } = await openHub({ hub: { mode: 'ok', delay: 3000 } });
  await sleep(400);
  const during = await editTitleAndSave(page, 'Edited while loading');
  const waiting = await page.getByRole('status').filter({ hasText: 'Loading the text' }).count();
  note(`during the wait: title editable: ${during.titleEditable}; Save enabled: ${during.saveEnabled}; loading shown: ${waiting > 0}`);
  const early = hubWrites(writes).length;
  await page.getByRole('textbox', { name: 'Program Directors Hub text' }).waitFor({ timeout: 10000 });
  const titleNow = await page.getByLabel('Title', { exact: true }).inputValue();
  const summary = page.getByLabel('One-line summary (on the hub cards)');
  await summary.fill('For program directors, updated.');
  await page.getByRole('button', { name: 'Save this hub' }).click();
  await sleep(800);
  const sent = hubWrites(writes);
  note(`title after loading: "${titleNow}"; saves sent: ${sent.length}`);
  await ctx.close();
  if (early) return 'Save wrote the hub before its text loaded';
  if (during.titleEditable) return 'the title could be edited before the text loaded';
  if (sent.length !== 1 || sent[0].body?.body !== HUB_BODY || sent[0].body?.summary !== 'For program directors, updated.') return 'the normal save after loading did not send the loaded text with the new summary';
  return '';
});

// Profile form ------------------------------------------------------------

const profileWrites = (writes) => writes.filter((w) => w.path === '/rest/v1/rpc/update_my_profile');
async function formValues(page) {
  const val = async (name) => ((await page.locator(`input[name="${name}"]`).count()) ? page.locator(`input[name="${name}"]`).inputValue() : null);
  const box = page.locator('input[name="show_in_directory"]');
  return {
    full_name: await val('full_name'),
    cert_level: await val('cert_level'),
    county: await val('county'),
    agency: await val('agency'),
    listed: (await box.count()) ? await box.isChecked() : null,
  };
}
async function clickSaveIfThere(page) {
  const save = page.getByRole('button', { name: 'Save profile' });
  const can = await enabled(save);
  if (can) await save.click();
  await sleep(800);
  return can;
}

await run('Profile: read fails (network), member clicks Save', async (note) => {
  const { ctx, page, writes } = await open(OPTED_OUT, '/members/account', { profile: { mode: 'network' } });
  await page.getByRole('heading', { name: 'Your profile' }).waitFor({ timeout: 20000 });
  await sleep(1500);
  // While the client is still retrying, then again once it has given up.
  const retrying = await formValues(page);
  const clickedRetrying = await clickSaveIfThere(page);
  const alert = await loadError(page);
  const form = await formValues(page);
  const clicked = await clickSaveIfThere(page);
  const retry = await page.getByRole('button', { name: 'Try again' }).count();
  note(`while retrying: form shown: ${retrying.full_name !== null} ${retrying.full_name !== null ? JSON.stringify(retrying) : ''}; Save clicked: ${clickedRetrying}`);
  note(`after the read failed: form shown: ${form.full_name !== null}; Save clicked: ${clicked}; error shown: ${alert}; Try again: ${retry > 0}`);
  const sent = profileWrites(writes);
  for (const w of sent) note(`SENT update_my_profile ${JSON.stringify(w.body)}`);
  await ctx.close();
  if (sent.length) return 'Save sent unloaded values: the member\'s fields would be blanked' + (sent[0].body?.p_show ? ' and an opted-out member listed' : '');
  if (form.full_name !== null || retrying.full_name !== null) return 'the form showed although the profile never loaded';
  if (!alert || !retry) return 'no error with a Try again button';
  return '';
});

await run('Profile: Try again after a failed read fills the form from the record', async (note) => {
  const s = await open(OPTED_OUT, '/members/account', { profile: { mode: 'fail' } });
  await s.page.getByRole('heading', { name: 'Your profile' }).waitFor({ timeout: 20000 });
  await loadError(s.page);
  s.reads.profile = { mode: 'ok' };
  const retry = s.page.getByRole('button', { name: 'Try again' });
  if (!(await retry.count())) {
    await s.ctx.close();
    return 'no Try again button';
  }
  await retry.click();
  await s.page.locator('input[name="full_name"]').waitFor({ timeout: 10000 });
  const form = await formValues(s.page);
  note(`form after Try again: ${JSON.stringify(form)}`);
  await s.ctx.close();
  if (form.full_name !== 'Pat Example' || form.county !== 'Leon' || form.listed !== false) return 'the form did not match the loaded record';
  return '';
});

await run('Profile: read slow (3 s), member clicks Save during the wait', async (note) => {
  const { ctx, page, writes } = await open(OPTED_OUT, '/members/account', { profile: { mode: 'ok', delay: 3000 } });
  await page.getByRole('heading', { name: 'Your profile' }).waitFor({ timeout: 20000 });
  const during = await formValues(page);
  const clicked = await clickSaveIfThere(page);
  const waiting = await page.getByRole('status').filter({ hasText: 'Loading your profile' }).count();
  note(`during the wait: form shown: ${during.full_name !== null} ${during.full_name !== null ? JSON.stringify(during) : ''}; Save clicked: ${clicked}; loading shown: ${waiting > 0}`);
  const early = profileWrites(writes);
  for (const w of early) note(`SENT update_my_profile ${JSON.stringify(w.body)}`);
  await sleep(3500);
  const after = await formValues(page);
  note(`after loading: ${JSON.stringify(after)}`);
  await ctx.close();
  if (early.length) return 'Save sent values before the profile loaded' + (early[0].body?.p_show ? ': an opted-out member would be listed' : '');
  if (during.full_name !== null) return 'the form showed before the profile loaded';
  if (after.full_name !== 'Pat Example' || after.listed !== false) return 'the form did not fill from the record after loading';
  return '';
});

await run('Profile: opted-out member changes only the agency and stays unlisted', async (note) => {
  const { ctx, page, writes } = await open(OPTED_OUT, '/members/account', {});
  await page.locator('input[name="full_name"]').waitFor({ timeout: 20000 });
  await sleep(1000);
  const before = await formValues(page);
  await page.locator('input[name="agency"]').fill('Example State College');
  await clickSaveIfThere(page);
  const sent = profileWrites(writes);
  note(`form as loaded: ${JSON.stringify(before)}`);
  for (const w of sent) note(`SENT update_my_profile ${JSON.stringify(w.body)}`);
  const saved = await page.getByRole('status').filter({ hasText: 'Profile saved' }).count();
  await ctx.close();
  const want = { p_full_name: 'Pat Example', p_cert_level: 'Paramedic', p_county: 'Leon', p_agency: 'Example State College', p_show: false };
  if (sent.length !== 1) return `expected one save, got ${sent.length}`;
  if (JSON.stringify(sent[0].body) !== JSON.stringify(want)) return `sent ${JSON.stringify(sent[0].body)}, expected ${JSON.stringify(want)}`;
  if (!saved) return 'no "Profile saved" message';
  return '';
});

await run('Profile: listed member changes the certification and stays listed', async (note) => {
  const { ctx, page, writes } = await open(LISTED, '/members/account', {});
  await page.locator('input[name="full_name"]').waitFor({ timeout: 20000 });
  await sleep(1000);
  await page.locator('input[name="cert_level"]').fill('Paramedic');
  await clickSaveIfThere(page);
  const sent = profileWrites(writes);
  for (const w of sent) note(`SENT update_my_profile ${JSON.stringify(w.body)}`);
  await ctx.close();
  const want = { p_full_name: 'Sam Example', p_cert_level: 'Paramedic', p_county: 'Wakulla', p_agency: 'Example Fire Rescue', p_show: true };
  if (sent.length !== 1 || JSON.stringify(sent[0].body) !== JSON.stringify(want)) return `expected ${JSON.stringify(want)}`;
  return '';
});

await run('Profile: deliberate edits go through (clear the county, opt in)', async (note) => {
  const { ctx, page, writes } = await open(OPTED_OUT, '/members/account', {});
  await page.locator('input[name="full_name"]').waitFor({ timeout: 20000 });
  await sleep(1000);
  await page.locator('input[name="county"]').fill('');
  await page.locator('input[name="show_in_directory"]').check();
  await clickSaveIfThere(page);
  const sent = profileWrites(writes);
  for (const w of sent) note(`SENT update_my_profile ${JSON.stringify(w.body)}`);
  await ctx.close();
  const want = { p_full_name: 'Pat Example', p_cert_level: 'Paramedic', p_county: '', p_agency: 'Example College', p_show: true };
  if (sent.length !== 1 || JSON.stringify(sent[0].body) !== JSON.stringify(want)) return `expected ${JSON.stringify(want)}`;
  return '';
});

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\nSave guards: ${passed} of ${results.length} cases pass (${SITE}). Database played by this script; nothing was sent to it.`);
process.exit(passed === results.length ? 0 : 1);
