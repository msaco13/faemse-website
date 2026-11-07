// Applying and undoing a monthly hub check fix (src/lib/hubCheck.ts,
// AJ 2026-11-07).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanHubDraft } from '../src/lib/hubDraft.ts';
import { countOf, swapOnce as swap } from '../src/lib/hubCheck.ts';

const swapOnce = (body: string, from: string, to: string) => swap(body, from, to, cleanHubDraft);

const hub = '# Sample hub\n\n## The Job Itself\n\nThe annual report is due May 15, 2026.\n\nSee famsy.org for more.\n';

describe('monthly hub check fixes', () => {
  it('counts whole matches without overlap', () => {
    assert.equal(countOf('aaaa', 'aa'), 2);
    assert.equal(countOf('abc', ''), 0);
    assert.equal(countOf(hub, 'May 15, 2026'), 1);
  });

  it('replaces the text once and runs the hub editor rules on the result', () => {
    const r = swapOnce(hub, 'The annual report is due May 15, 2026.', 'The annual report is due May 15, 2027 (see famse.org).');
    assert.ok('body' in r);
    if (!('body' in r)) return;
    assert.match(r.body, /due May 15, 2027 \(see faemse\.org\)\./);
    assert.doesNotMatch(r.body, /May 15, 2026/);
    // The editor's domain fix runs on the whole hub, as on any save.
    assert.match(r.body, /See faemse\.org for more\./);
    assert.equal(r.used, 'The annual report is due May 15, 2027 (see faemse.org).');
  });

  it('undo is the same swap the other way', () => {
    const fixed = swapOnce(hub, 'May 15, 2026', 'May 15, 2027');
    assert.ok('body' in fixed);
    if (!('body' in fixed)) return;
    const back = swapOnce(fixed.body, fixed.used, 'May 15, 2026');
    assert.ok('body' in back);
    if ('body' in back) assert.match(back.body, /due May 15, 2026\./);
  });

  it('refuses when the text is gone, repeated, or the new text is empty', () => {
    assert.match((swapOnce(hub, 'Not in the hub', 'x') as { problem: string }).problem, /no longer in the hub/);
    assert.match((swapOnce(hub + 'May 15, 2026', 'May 15, 2026', 'x') as { problem: string }).problem, /more than once/);
    assert.match((swapOnce(hub, 'May 15, 2026', '   ') as { problem: string }).problem, /empty/);
  });
});
