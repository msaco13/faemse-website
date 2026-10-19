// Daily site audit: visits every page of a running copy of the site the way a
// visitor would, at desktop and phone widths, and reports what is broken.
// Used by the site-audit skill (.claude/skills/site-audit/SKILL.md).
//
// Run against a local build:
//   npm run build && npx vite preview --port 4173 &
//   npm run audit                      (defaults to http://localhost:4173)
//   AUDIT_SITE=https://faemse.org npm run audit
//
// Optional member checks: when AUDIT_EMAIL and AUDIT_PASSWORD are set, it also
// signs in as that (member-level, non-admin) test account and checks the
// members-only pages. Without them those checks are skipped.
//
// It never changes anything. Every request that could write is blocked before
// it leaves the browser: only reads, the sign-in call, and a short list of
// read-only database functions get through. Forms are inspected, never
// submitted. Exit code 1 when anything is found.

import { chromium } from 'playwright-core';

const SITE = (process.env.AUDIT_SITE ?? 'http://localhost:4173').replace(/\/$/, '');
const EMAIL = process.env.AUDIT_EMAIL;
const PASSWORD = process.env.AUDIT_PASSWORD;
const SLOW_MS = Number(process.env.AUDIT_SLOW_MS ?? 3000);

// Every route in src/App.tsx. Keep in sync when pages are added.
const PUBLIC = [
  '/', '/about', '/board', '/bylaws', '/membership', '/events', '/news', '/resources', '/sponsors',
  '/jobs', '/classes', '/qa', '/videos', '/program-directors', '/programs', '/hubs', '/contact',
  '/login', '/members', '/payment-complete', '/privacy', '/terms', '/admin/hubs',
];
const NOT_FOUND = '/this-page-does-not-exist';
const MEMBER = ['/members', '/news', '/resources', '/jobs', '/qa', '/hubs'];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
];

// Database functions the pages call that only read. Anything else that is not
// a plain read is blocked. ensure_profile only creates the signed-in test
// account's own profile row the first time it signs in.
const READ_RPCS = ['get_settings', 'get_qa_index', 'get_video_index', 'get_directory', 'my_organizations', 'ensure_profile'];
const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function allowed(req) {
  const url = new URL(req.url());
  if (READ_METHODS.includes(req.method())) return true;
  if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') return true;
  if (url.pathname === '/auth/v1/logout') return true;
  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
  return Boolean(rpc && READ_RPCS.includes(rpc[1]));
}

const findings = []; // { page, width, kind, detail }
const blockedWrites = [];
const unchecked = new Set(); // outside links we could not reach
const slow = [];
const add = (page, width, kind, detail) => findings.push({ page, width, kind, detail });

const browser = await chromium.launch({
  executablePath: process.env.AUDIT_CHROME || undefined,
  args: ['--no-sandbox'],
});

// dbDown: every request to the database fails, the way it would during a
// Supabase outage. Used by the database-down pass below.
async function newContext(vp, { dbDown = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile ?? false,
    hasTouch: vp.hasTouch ?? false,
  });
  // Fetch through Node so it works behind a TLS-inspecting proxy whose CA Node
  // trusts but the bundled browser does not.
  await ctx.route('**/*', async (route) => {
    const req = route.request();
    if (dbDown && new URL(req.url()).host.endsWith('supabase.co')) return route.abort('connectionrefused');
    if (!allowed(req)) {
      blockedWrites.push(`${req.method()} ${req.url().split('?')[0]}`);
      return route.abort('blockedbyclient');
    }
    try {
      await route.fulfill({ response: await route.fetch() });
    } catch {
      await route.abort();
    }
  });
  return ctx;
}

const knownPaths = new Set([...PUBLIC, NOT_FOUND]);
const isKnown = (p) => knownPaths.has(p) || p.startsWith('/hubs/');

async function checkPage(ctx, path, vp, label = path) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(`Uncaught: ${e.message}`));
  page.on('requestfailed', (r) => {
    const host = new URL(r.url()).host;
    if (r.failure()?.errorText.includes('BLOCKED_BY_CLIENT')) return;
    if (new URL(SITE).host === host) errors.push(`Failed to load ${r.url()}`);
    else if (host.endsWith('supabase.co')) errors.push(`Database request failed: ${r.url().split('?')[0]}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && new URL(r.url()).host === new URL(SITE).host) errors.push(`HTTP ${r.status()} for ${r.url()}`);
  });

  const t0 = Date.now();
  try {
    await page.goto(SITE + path, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    add(label, vp.name, 'did not load', String(e.message).split('\n')[0]);
    await page.close();
    return [];
  }
  const ms = Date.now() - t0;
  if (ms > SLOW_MS) slow.push(`${label} (${vp.name}): ${(ms / 1000).toFixed(1)}s`);
  await page.waitForTimeout(800);

  const facts = await page.evaluate(() => {
    const doc = document.documentElement;
    const text = document.body.innerText;
    const imgs = [...document.images]
      .filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy')
      .map((i) => i.currentSrc || i.src);
    const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    const forms = [...document.querySelectorAll('form')].map((f) => {
      const submit = f.querySelector('button[type=submit], button:not([type]), input[type=submit]');
      const fields = [...f.querySelectorAll('input, select, textarea')].filter((el) => el.type !== 'hidden');
      return {
        name: f.getAttribute('aria-label') || f.querySelector('h2,h3,legend')?.textContent?.trim() || f.id || '(unnamed form)',
        fields: fields.length,
        unlabeled: fields.filter((el) => !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map((el) => el.name || el.type),
        hasSubmit: Boolean(submit),
        submitDisabled: Boolean(submit?.disabled),
      };
    });
    // The elements that stick out past the screen edge (and are not clipped by
    // a parent) are what make the page scroll sideways.
    const clipped = (el) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.overflowX !== 'visible') return true;
      }
      return false;
    };
    const wide = doc.scrollWidth > window.innerWidth + 1
      ? [...document.querySelectorAll('body *')]
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && !clipped(el))
          .slice(0, 3)
          .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 40)}"`)
      : [];
    return {
      title: document.title,
      notFound: /page not found|404/i.test(text) && document.title.toLowerCase().includes('not found'),
      crashed: /something went wrong on this page/i.test(text),
      overflow: doc.scrollWidth - window.innerWidth,
      wide,
      imgs,
      links,
      forms,
    };
  });

  for (const e of [...new Set(errors)]) add(label, vp.name, 'console error', e.slice(0, 300));
  if (facts.crashed) add(label, vp.name, 'error screen', 'The page shows the "something went wrong" card.');
  if (path !== NOT_FOUND && !path.startsWith('/admin/') && facts.notFound) add(label, vp.name, 'not found', 'A real route shows the 404 page.');
  if (facts.overflow > 1) add(label, vp.name, 'layout', `Page is ${facts.overflow}px wider than the screen (${facts.wide.join(', ') || 'source not found'}).`);
  for (const src of facts.imgs) add(label, vp.name, 'missing image', src);
  if (vp.name === 'desktop') {
    for (const f of facts.forms) {
      if (!f.hasSubmit) add(label, vp.name, 'form', `${f.name}: no submit button.`);
      if (f.unlabeled.length) add(label, vp.name, 'form', `${f.name}: fields without a label: ${f.unlabeled.join(', ')}.`);
    }
  }
  await page.close();
  return facts.links;
}

const allLinks = new Map(); // href -> first page seen on

for (const vp of VIEWPORTS) {
  const ctx = await newContext(vp);
  for (const path of [...PUBLIC, NOT_FOUND]) {
    const links = await checkPage(ctx, path, vp);
    for (const l of links) if (!allLinks.has(l)) allLinks.set(l, path);
  }
  await ctx.close();
}

// Internal links: every one must point at a real route or a file that exists.
for (const [href, from] of allLinks) {
  if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/.test(href)) continue;
  const url = new URL(href, SITE + from);
  if (url.origin !== new URL(SITE).origin) {
    unchecked.add(url.origin);
    continue;
  }
  if (/\.[a-z0-9]+$/i.test(url.pathname)) {
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) add(from, 'desktop', 'dead link', `${href} (${res ? res.status : 'no response'})`);
  } else if (!isKnown(url.pathname.replace(/\/$/, '') || '/')) {
    add(from, 'desktop', 'dead link', `${href} goes to a page that does not exist.`);
  }
}

// Database-down pass: every page again at desktop width with the database
// unreachable. Console errors about the failed requests are expected; what
// must not happen is a page that fails to load, shows the crash card, throws
// an uncaught error, or is still "Loading" after the site's own 5-second
// database timeout has passed.
const DB_DOWN = '(database down)';
{
  const ctx = await newContext(VIEWPORTS[0], { dbDown: true });
  for (const path of PUBLIC) {
    const page = await ctx.newPage();
    const uncaught = [];
    page.on('pageerror', (e) => uncaught.push(e.message));
    try {
      await page.goto(SITE + path, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(6500);
      const { crashed, stuck } = await page.evaluate(() => {
        const text = document.body.innerText;
        return { crashed: /something went wrong on this page/i.test(text), stuck: (text.match(/^.*\bLoading\b.*$/im) || [''])[0].trim() };
      });
      if (crashed) add(`${path} ${DB_DOWN}`, 'desktop', 'error screen', 'The page shows the crash card when the database is unreachable.');
      if (stuck) add(`${path} ${DB_DOWN}`, 'desktop', 'stuck loading', `Still showing "${stuck.slice(0, 80)}" 6 seconds after the database failed.`);
      for (const m of [...new Set(uncaught)]) add(`${path} ${DB_DOWN}`, 'desktop', 'uncaught error', m.slice(0, 300));
    } catch (e) {
      add(`${path} ${DB_DOWN}`, 'desktop', 'did not load', String(e.message).split('\n')[0]);
    }
    await page.close();
  }
  await ctx.close();
}

// Members-only pages, signed in as the test account.
let memberNote = 'skipped (no test account configured)';
if (EMAIL && PASSWORD) {
  for (const vp of VIEWPORTS) {
    const ctx = await newContext(vp);
    const page = await ctx.newPage();
    await page.goto(SITE + '/login', { waitUntil: 'networkidle' });
    await page.fill('input[name=email]', EMAIL);
    await page.fill('input[name=password]', PASSWORD);
    await page.locator('form button[type=submit], form button:not([type])').first().click();
    const ok = await page.waitForURL(/\/members/, { timeout: 15000 }).then(() => true, () => false);
    await page.close();
    if (!ok) {
      memberNote = 'FAILED: the test account could not sign in';
      add('/login', vp.name, 'sign-in', 'The test account could not sign in.');
      await ctx.close();
      break;
    }
    memberNote = 'checked';
    for (const path of MEMBER) await checkPage(ctx, path, vp, `${path} (signed in)`);
    await ctx.close();
  }
}

await browser.close();

// Report
const byPage = new Map();
for (const f of findings) {
  const k = `${f.page}  [${f.kind}]  ${f.detail}`;
  byPage.set(k, [...(byPage.get(k) ?? []), f.width]);
}
console.log(`Site audit of ${SITE}`);
console.log(`Pages: ${PUBLIC.length + 1} at ${VIEWPORTS.map((v) => v.name).join(' and ')} widths. Database-down pass: ${PUBLIC.length} pages. Members-only pages: ${memberNote}.`);
console.log('');
if (byPage.size) {
  console.log(`FOUND ${byPage.size} issue(s):`);
  for (const [k, widths] of byPage) console.log(`  - ${k}  (${[...new Set(widths)].join(', ')})`);
} else {
  console.log('No broken pages, links, images, layouts, forms, or console errors found.');
}
if (slow.length) {
  console.log('');
  console.log(`Slower than ${SLOW_MS / 1000}s:`);
  for (const s of slow) console.log(`  - ${s}`);
}
if (blockedWrites.length) {
  console.log('');
  console.log('Write requests blocked (expected if a page saves something on load; check if new):');
  for (const w of [...new Set(blockedWrites)]) console.log(`  - ${w}`);
}
console.log('');
console.log(`Outside sites linked but not checked (${unchecked.size}): ${[...unchecked].map((o) => new URL(o).host).join(', ') || 'none'}`);
process.exit(byPage.size || slow.length ? 1 : 0);
