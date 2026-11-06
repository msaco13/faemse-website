// The weekly job sweep reads a page only when the site's robots.txt allows
// it (scripts/job-sweep/robots.mjs, RFC 9309). These pin down the reading of
// the rules, including the real files that decided the sweep's design.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { allowed, crawlDelay, parseRobots, verdictForStatus } from '../scripts/job-sweep/robots.mjs';

describe('robots.txt for the job sweep', () => {
  it('governmentjobs.com lets search engines in and every other robot out (as of 2026-11-06)', () => {
    const g = parseRobots(`User-agent: Googlebot
User-agent: bingbot
Allow: /


User-agent: *
Disallow: /`);
    assert.equal(allowed(g, '/careers/browardsheriff/jobs/5178729/certified-firefighter-paramedic'), false);
    assert.equal(allowed(g, '/', 'Googlebot'), true);
  });

  it('FireRescue1 forbids only its search pages and asks for a 10-second delay', () => {
    const g = parseRobots(`User-agent: *
Crawl-delay: 10

Disallow: /search?q=*`);
    assert.equal(allowed(g, '/search?q=florida'), false);
    assert.equal(allowed(g, '/fire-jobs'), true);
    assert.equal(crawlDelay(g), 10);
  });

  it('a group naming the robot replaces the * group', () => {
    const g = parseRobots(`User-agent: *
Disallow: /

User-agent: FAEMSE-job-sweep
Allow: /careers/`);
    assert.equal(allowed(g, '/careers/123'), true);
    assert.equal(allowed(g, '/admin'), true, 'nothing in its own group forbids /admin');
  });

  it('the longest rule wins, and allow wins a tie', () => {
    const g = parseRobots(`User-agent: *
Disallow: /jobs
Allow: /jobs/open
Disallow: /x
Allow: /x`);
    assert.equal(allowed(g, '/jobs/closed'), false);
    assert.equal(allowed(g, '/jobs/open/7'), true);
    assert.equal(allowed(g, '/x'), true);
  });

  it('* and $ in a rule', () => {
    const g = parseRobots(`User-agent: *
Disallow: /*.pdf$
Disallow: /private*/`);
    assert.equal(allowed(g, '/posting.pdf'), false);
    assert.equal(allowed(g, '/posting.pdf?download=1'), true);
    assert.equal(allowed(g, '/private-area/page'), false);
  });

  it('an empty Disallow, comments and unknown lines change nothing', () => {
    const g = parseRobots(`# comment
User-agent: * # all robots
Disallow:
Sitemap: https://example.org/sitemap.xml`);
    assert.equal(allowed(g, '/anything'), true);
  });

  it('no file (4xx) allows everything; a server error or no answer allows nothing', () => {
    assert.equal(verdictForStatus(200), 'read');
    assert.equal(verdictForStatus(404), 'allow-all');
    assert.equal(verdictForStatus(503), 'disallow-all');
    assert.equal(verdictForStatus(0), 'disallow-all');
  });
});
