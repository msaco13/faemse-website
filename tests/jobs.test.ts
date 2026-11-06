// The Job board's categories and the small rules around them
// (src/lib/jobs.ts, board decision 2026-11-06).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { categoryFromSlug, categoryLabel, categoryOf, countByCategory, isNew, lastChecked } from '../src/lib/jobs.ts';

describe('job board categories', () => {
  it('three categories, with anything unknown counted as Education', () => {
    assert.equal(categoryOf('fire_ems'), 'fire_ems');
    assert.equal(categoryOf('ems'), 'ems');
    assert.equal(categoryOf(undefined), 'education');
    assert.equal(categoryOf('police'), 'education');
    assert.equal(categoryLabel('fire_ems'), 'Fire/EMS');
  });

  it('the ?type= address picks a tab; anything else shows all', () => {
    assert.equal(categoryFromSlug('fire-ems'), 'fire_ems');
    assert.equal(categoryFromSlug('education'), 'education');
    assert.equal(categoryFromSlug('fire_ems'), null);
    assert.equal(categoryFromSlug(null), null);
  });

  it('counts per tab', () => {
    assert.deepEqual(countByCategory([{ category: 'ems' }, { category: 'ems' }, { category: 'fire_ems' }, {}]), {
      fire_ems: 1,
      ems: 2,
      education: 1,
    });
  });

  it('New means found or posted in the last seven days', () => {
    assert.equal(isNew('2026-11-08', '2026-11-08'), true);
    assert.equal(isNew('2026-11-02', '2026-11-08'), true);
    assert.equal(isNew('2026-11-01', '2026-11-08'), false);
    assert.equal(isNew('2026-11-09', '2026-11-08'), false);
    assert.equal(isNew(undefined, '2026-11-08'), false);
  });

  it('"Last checked" is the latest date the sweep saw any of its jobs', () => {
    assert.equal(
      lastChecked([
        { source: 'sweep', lastSeenOn: '2026-11-01' },
        { source: 'sweep', lastSeenOn: '2026-11-08' },
        { source: 'board', lastSeenOn: '2026-11-20' },
      ]),
      '2026-11-08',
    );
    assert.equal(lastChecked([{ source: 'board' }]), null);
  });
});
