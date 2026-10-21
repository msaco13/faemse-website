// Real pages for the site's addresses, written into dist/ after the build.
//
// GitHub Pages only knows the files it is given. The site is one page
// (index.html) that draws every address in the browser, so a visit to
// faemse.org/about used to be served by 404.html: it looked right to people,
// but answered "404 Not Found", and search engines skip pages that say that.
//
// This copies index.html to <route>.html for every address below, which
// GitHub Pages serves for /<route> with "200 OK" (2026-10-21). Each copy
// names its own address as the canonical one, so search engines don't read
// them all as copies of the home page. Unknown addresses still get 404.html.
//
// Where a public/ folder has the same name as an address (public/sponsors
// holds the sponsor logos), GitHub Pages may send /sponsors to /sponsors/
// first, so those also get <route>/index.html.
//
// The addresses are the ones in public/sitemap.xml (the pages search engines
// should list) plus EXTRA (pages that should answer 200 but stay out of the
// sitemap). Run by .github/workflows/deploy.yml: node scripts/route-pages.mjs

import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://faemse.org';
const DIST = 'dist';
const EXTRA = ['jobs', 'qa', 'hubs', 'login', 'members', 'admin', 'payment-complete'];

const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const fromSitemap = [...sitemap.matchAll(/<loc>https:\/\/faemse\.org\/([^<]*)<\/loc>/g)].map((m) => m[1]).filter(Boolean);
const routes = [...new Set([...fromSitemap, ...EXTRA])];

const shell = readFileSync(join(DIST, 'index.html'), 'utf8');
const CANONICAL = '<link rel="canonical" href="https://faemse.org/" />';
const OG_URL = '<meta property="og:url" content="https://faemse.org/" />';
if (!shell.includes(CANONICAL) || !shell.includes(OG_URL)) {
  console.error('index.html no longer has the canonical link or og:url this script rewrites; update scripts/route-pages.mjs.');
  process.exit(1);
}

for (const route of routes) {
  if (!/^[a-z0-9-]+$/.test(route)) {
    console.error(`skipping "${route}": only one-level addresses are written`);
    continue;
  }
  const url = `${SITE}/${route}`;
  const html = shell.replace(CANONICAL, `<link rel="canonical" href="${url}" />`).replace(OG_URL, `<meta property="og:url" content="${url}" />`);
  writeFileSync(join(DIST, `${route}.html`), html);
  const dir = join(DIST, route);
  const clash = existsSync(dir) && statSync(dir).isDirectory();
  if (clash) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
  }
  console.log(`${route}.html${clash ? ` and ${route}/index.html` : ''}`);
}
console.log(`${routes.length} addresses written.`);
