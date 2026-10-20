// The standing rules for hub text, applied on save in Admin → Program hubs
// (CLAUDE.md, board decisions 2026-10-13).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanHubDraft } from '../src/lib/hubDraft.ts';

const draft = [
  '# Instructors Hub',
  '',
  '*Companion hub to the Program Directors Hub.*',
  '',
  'Draft for famsy.org · October 12, 2026 · @msaco',
  '',
  '## How to use this hub',
  'Click a pillar, then a topic.',
  '### Tips',
  'Bookmark it.',
  '',
  '## Teaching',
  '### Lesson plans',
  'See FAMSE.ORG/hubs and famsee.org for more.',
  '',
  '## Maintenance notes',
  'Review every January.',
].join('\n');

describe('hub text on save', () => {
  const { body, notes } = cleanHubDraft(draft);

  test('misspelled domains become faemse.org, and say how many', () => {
    assert.ok(!/fams[a-z]*\.org/i.test(body));
    assert.ok(body.includes('See faemse.org/hubs and faemse.org for more.'));
    assert.ok(notes.includes('Corrected 3 misspellings of faemse.org.'));
  });

  test('the how-to section, companion line and byline are left out', () => {
    assert.ok(!body.includes('How to use this hub'));
    assert.ok(!body.includes('Click a pillar'));
    assert.ok(!body.includes('Bookmark it'));
    assert.ok(!body.includes('Companion hub'));
    assert.ok(!body.includes('Draft for'));
    assert.equal(notes.length, 4);
  });

  test('everything else stays, maintenance notes included', () => {
    assert.equal(
      body,
      ['# Instructors Hub', '', '## Teaching', '### Lesson plans', 'See faemse.org/hubs and faemse.org for more.', '', '## Maintenance notes', 'Review every January.'].join('\n'),
    );
  });

  test('clean text comes back unchanged, with nothing to report', () => {
    const clean = '# Hub\n\n## One\n### Two\nText about faemse.org.';
    assert.deepEqual(cleanHubDraft(clean), { body: clean, notes: [] });
  });
});
