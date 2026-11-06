#!/usr/bin/env node
// Reads one page for the weekly job sweep, only if the site allows it.
//
//   node scripts/job-sweep/fetch.mjs <url>
//
// Prints "OK <final url>" and the page's readable text, or one line saying
// why it did not read it:
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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allowed, crawlDelay, parseRobots, ROBOT, verdictForStatus } from './robots.mjs';

const UA = `${ROBOT}/1.0 (+https://faemse.org/jobs; weekly Florida EMS job listing for the FAEMSE job board)`;

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

const target = process.argv[2];
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
let { title, text } = readable(await res.text());

// Pages that build their listing with scripts: open them in Chromium, same
// user agent, only because robots.txt already said yes.
if (text.length < 600 && process.env.JOB_SWEEP_NO_BROWSER !== '1') {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    const page = await (await browser.newContext({ userAgent: UA })).newPage();
    await page.goto(finalUrl.href, { waitUntil: 'networkidle', timeout: 30000 });
    const r = readable(await page.content());
    await browser.close();
    if (r.text.length > text.length) ({ title, text } = r);
  } catch {
    /* keep what plain fetch got */
  }
}

console.log(`OK ${finalUrl.href}`);
if (title) console.log(`TITLE ${title}`);
console.log(text.slice(0, 20000));
