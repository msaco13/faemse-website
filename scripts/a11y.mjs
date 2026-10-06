// Accessibility audit for faemse.org: axe-core's WCAG 2.1 A and AA rules
// (plus its best-practice rules) on every public page, as a signed-out
// visitor. The ADA Title II rule for public bodies points at WCAG 2.1 AA;
// FAEMSE is a nonprofit, not a public body, but its members work for
// colleges and counties that are, so the site holds itself to the same bar.
//
// Run: npm run a11y            (audits https://faemse.org)
//      A11Y_SITE=http://localhost:4173 npm run a11y   (a `vite preview`)
//
// Needs the dev dependencies (axe-core, playwright-core) and a Chromium that
// Playwright can find: `npx playwright install chromium`, or point
// A11Y_CHROME at a Chromium or headless-shell binary. Exit code 1 when any
// page has a violation. "Incomplete" results (text over photos or gradients
// that the engine cannot judge) are listed but do not fail the run; check
// those by eye.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const SITE = (process.env.A11Y_SITE ?? 'https://faemse.org').replace(/\/$/, '');
const PAGES = [
  '/', '/about', '/board', '/bylaws', '/membership', '/events', '/news', '/resources', '/sponsors',
  '/jobs', '/classes', '/qa', '/videos', '/program-directors', '/programs', '/contact', '/login',
  '/privacy', '/terms', '/this-page-does-not-exist',
];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const browser = await chromium.launch({
  executablePath: process.env.A11Y_CHROME || undefined,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
// Fetch through Node so the audit also works behind a TLS-inspecting proxy
// whose CA Node trusts but the bundled browser does not.
await context.route('**/*', async (route) => {
  try {
    await route.fulfill({ response: await route.fetch() });
  } catch {
    await route.abort();
  }
});

let failed = false;
for (const path of PAGES) {
  const page = await context.newPage();
  try {
    await page.goto(SITE + path, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(
      (tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] }),
      TAGS,
    );
    const v = result.violations;
    const needsReview = result.incomplete.reduce((n, r) => n + r.nodes.length, 0);
    console.log(`${v.length ? 'FAIL' : 'ok  '}  ${path.padEnd(28)} ${v.length} violation(s), ${needsReview} to check by eye`);
    for (const r of v) {
      failed = true;
      console.log(`      ${r.id} [${r.impact}] ${r.help} (${r.tags.filter((t) => t.startsWith('wcag')).join(', ') || 'best practice'})`);
      for (const n of r.nodes.slice(0, 5)) console.log(`        - ${n.target.join(' ')}`);
      if (r.nodes.length > 5) console.log(`        … and ${r.nodes.length - 5} more`);
    }
  } catch (e) {
    failed = true;
    console.log(`FAIL  ${path.padEnd(28)} could not audit: ${String(e.message ?? e).split('\n')[0]}`);
  } finally {
    await page.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
