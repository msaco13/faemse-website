#!/usr/bin/env node
// Reads one page for the weekly job and event sweeps and the monthly hub
// check, only if the site allows it (.claude/skills/job-sweep,
// .claude/skills/event-sweep, .claude/skills/hub-check).
//
//   node scripts/job-sweep/fetch.mjs <url>
//   node scripts/job-sweep/fetch.mjs --links <url>   also lists the page's links
//   node scripts/job-sweep/fetch.mjs --full --links <url>
//                                          the whole page and every link, for
//                                          long listings (National Testing
//                                          Network's openings run past the
//                                          usual 20,000 characters and 300 links)
//
// Prints "OK <final url>" and the page's readable text (all of a PDF's text
// through pdftotext, and of a Word file's through LibreOffice: flrules.org
// serves rule text as .doc), or one line saying why it did not read it:
//   BLOCKED <url>: <reason>   robots.txt says no, or the site is on the
//                             never-read list below. Not an error: use the
//                             search listing for that job instead.
//   FAILED <url>: <reason>    the page could not be loaded.
// Exit code 0 for OK, 2 for BLOCKED, 1 for FAILED.
//
// Rules it keeps (.claude/skills/job-sweep/SKILL.md):
// - robots.txt first, for this robot's name, every time; a site whose
//   robots.txt can't be loaded (server error) is not read.
// - Job aggregators are never read; they only point the sweep at employers.
// - One request at a time per site, waiting the site's Crawl-delay (or two
//   seconds) between them.
// - It says who it is in its user agent. It never pretends to be a browser
//   to get past a block: a page that needs scripts is opened in Chromium only
//   when robots.txt allows it, with the same user agent.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allowed, crawlDelay, parseRobots, ROBOT, verdictForStatus } from './robots.mjs';

const UA = `${ROBOT}/1.0 (+https://faemse.org/jobs; weekly Florida EMS job and event listing for faemse.org)`;

// Never read, whatever robots.txt says: aggregators and boards whose terms
// forbid automated collection, and the government job sites that forbid
// every robot but search engines (checked 2026-11-06).
const NEVER = [
  'governmentjobs.com', 'schooljobs.com', 'indeed.com', 'linkedin.com', 'ziprecruiter.com', 'glassdoor.com',
  'monster.com', 'careerbuilder.com', 'simplyhired.com', 'talent.com', 'tallo.com', 'joinhandshake.com', 'higheredjobs.com',
];

const say = (kind, url, why) => {
  console.log(`${kind} ${url}${why ? `: ${why}` : ''}`);
  process.exit(kind === 'OK' ? 0 : kind === 'BLOCKED' ? 2 : 1);
};

const args = process.argv.slice(2);
const wantLinks = args.includes('--links');
const wantFull = args.includes('--full');
const target = args.filter((a) => a !== '--links' && a !== '--full')[0];
let url;
try {
  url = new URL(target);
} catch {
  say('FAILED', String(target), 'not a web address');
}
if (!/^https?:$/.test(url.protocol)) say('FAILED', url.href, 'only http and https pages');
const host = url.hostname.toLowerCase();
if (NEVER.some((d) => host === d || host.endsWith(`.${d}`))) say('BLOCKED', url.href, `${host} is on the never-read list`);

async function get(u, ms = 20000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(u, { headers: { 'User-Agent': UA, Accept: 'text/html,text/plain;q=0.9,*/*;q=0.5' }, redirect: 'follow', signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// One request at a time per site: remember when we last asked each host.
const stateDir = join(tmpdir(), 'faemse-job-sweep');
if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
const stamp = join(stateDir, `${host.replace(/[^a-z0-9.-]/g, '_')}.last`);
async function waitTurn(delaySec) {
  const last = existsSync(stamp) ? Number(readFileSync(stamp, 'utf8')) : 0;
  const wait = last + Math.max(delaySec ?? 2, 2) * 1000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, Math.min(wait, 60000)));
  writeFileSync(stamp, String(Date.now()));
}

async function robotsFor(u) {
  try {
    const res = await get(`${u.protocol}//${u.host}/robots.txt`);
    const verdict = verdictForStatus(res.status);
    if (verdict === 'read') return parseRobots(await res.text());
    if (verdict === 'allow-all') return [];
    return null;
  } catch {
    return null;
  }
}

// The page's links, as "LINK text -> absolute url", for following a careers
// page to its individual postings (each one read with this helper too).
function links(html, base) {
  const out = [];
  const seen = new Set();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href;
    try {
      href = new URL(m[1].replace(/&amp;/g, '&'), base).href;
    } catch {
      continue;
    }
    if (!/^https?:/.test(href) || seen.has(href)) continue;
    seen.add(href);
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    if (text) out.push(`LINK ${text.slice(0, 120)} -> ${href}`);
  }
  return out;
}

function readable(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim();
  // The page's main content when it marks one, so menus don't crowd it out.
  const main = html.match(/<main[\s>][\s\S]*<\/main>/i)?.[0];
  const text = (main && main.length > 1500 ? main : html)
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article|dd|dt)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  return { title, text };
}

const groups = await robotsFor(url);
if (groups === null) say('BLOCKED', url.href, 'robots.txt could not be loaded, so the site is not read');
const path = url.pathname + url.search;
if (!allowed(groups, path)) say('BLOCKED', url.href, `robots.txt does not allow ${ROBOT} here`);

await waitTurn(crawlDelay(groups));
let res;
try {
  res = await get(url.href);
} catch (e) {
  say('FAILED', url.href, e?.name === 'AbortError' ? 'timed out' : String(e?.cause?.code ?? e?.message ?? e));
}
if (!res.ok) say('FAILED', url.href, `HTTP ${res.status}`);
const finalUrl = new URL(res.url || url.href);
if (finalUrl.host !== url.host) {
  // Redirected to another site: that site's rules apply too.
  const fh = finalUrl.hostname.toLowerCase();
  if (NEVER.some((d) => fh === d || fh.endsWith(`.${d}`))) say('BLOCKED', finalUrl.href, `redirected to ${fh}, which is on the never-read list`);
  const g2 = await robotsFor(finalUrl);
  if (g2 === null || !allowed(g2, finalUrl.pathname + finalUrl.search)) say('BLOCKED', finalUrl.href, 'redirected to a page robots.txt does not allow');
}
// A PDF (CoAEMSP and CAAHEP keep their standards, FAQs and policies as
// PDFs): its text through pdftotext, whole, since rules sit deep inside.
const bytes = Buffer.from(await res.arrayBuffer());
if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') {
  const file = join(stateDir, `read-${process.pid}.pdf`);
  writeFileSync(file, bytes);
  let pdfText;
  try {
    pdfText = execFileSync('pdftotext', ['-layout', file, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
  } catch (e) {
    say('FAILED', finalUrl.href, e?.code === 'ENOENT' ? 'a PDF, and pdftotext is not installed here' : 'a PDF that pdftotext could not read');
  } finally {
    rmSync(file, { force: true });
  }
  console.log(`OK ${finalUrl.href}`);
  console.log('TITLE (PDF)');
  console.log(pdfText.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim());
  process.exit(0);
}
// A Word file (.doc, or .docx: a zip holding word/): its text through
// LibreOffice, whole.
const ole = bytes.subarray(0, 4).toString('hex') === 'd0cf11e0';
const docx = bytes.subarray(0, 2).toString('latin1') === 'PK' && bytes.includes('word/');
if (ole || docx) {
  const dir = mkdtempSync(join(stateDir, 'word-'));
  const file = join(dir, `read.${docx ? 'docx' : 'doc'}`);
  writeFileSync(file, bytes);
  let wordText;
  try {
    execFileSync('soffice', ['--headless', `-env:UserInstallation=file://${dir}/profile`, '--convert-to', 'txt:Text (encoded):UTF8', '--outdir', dir, file], { stdio: 'ignore', timeout: 120000 });
    wordText = readFileSync(join(dir, 'read.txt'), 'utf8');
  } catch (e) {
    say('FAILED', finalUrl.href, e?.code === 'ENOENT' ? 'a Word file, and LibreOffice is not installed here' : 'a Word file that LibreOffice could not read');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(`OK ${finalUrl.href}`);
  console.log('TITLE (Word file)');
  console.log(wordText.replace(/^\uFEFF/, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim());
  process.exit(0);
}
let html = bytes.toString('utf8');
let { title, text } = readable(html);

// Pages that build their listing with scripts: open them in Chromium, same
// user agent, only because robots.txt already said yes.
if (text.length < 600 && process.env.JOB_SWEEP_NO_BROWSER !== '1') {
  try {
    // Playwright as installed here: the container's global copy (found the
    // way require finds it, since import ignores NODE_PATH), or
    // playwright-core from the repo after npm ci.
    let chromium;
    try {
      ({ chromium } = createRequire(import.meta.url)('playwright'));
    } catch {
      ({ chromium } = await import('playwright-core'));
    }
    const exe = process.env.JOB_SWEEP_CHROME || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
    const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
    const page = await (await browser.newContext({ userAgent: UA })).newPage();
    await page.goto(finalUrl.href, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const rendered = await page.content();
    await browser.close();
    const r = readable(rendered);
    if (r.text.length > text.length) {
      ({ title, text } = r);
      html = rendered;
    }
  } catch {
    /* keep what plain fetch got */
  }
}

console.log(`OK ${finalUrl.href}`);
if (title) console.log(`TITLE ${title}`);
console.log(wantFull ? text : text.slice(0, 20000));
if (wantLinks) console.log((wantFull ? links(html, finalUrl.href) : links(html, finalUrl.href).slice(0, 300)).join('\n'));
