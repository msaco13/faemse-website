// The Job board's categories and the small rules around them
// (src/lib/jobs.ts, board decision 2026-11-06).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { categoryFromSlug, categoryLabel, categoryOf, countByCategory, isNew, jobFormProblem, lastChecked } from '../src/lib/jobs.ts';

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

describe('adding a job from the Job board', () => {
  const ok = { title: 'Paramedic', employer: 'Sample EMS', location: '', category: 'ems', closesOn: '', link: 'https://example.org/job', description: '' };
  it('title, employer and type, plus a link or a description', () => {
    assert.equal(jobFormProblem(ok, '2026-11-08'), null);
    assert.equal(jobFormProblem({ ...ok, link: '', description: 'Evening shifts.' }, '2026-11-08'), null);
    assert.equal(jobFormProblem({ ...ok, link: '', description: '  ' }, '2026-11-08'), 'Add a link to the posting, a description, or both.');
    assert.equal(jobFormProblem({ ...ok, title: ' ' }, '2026-11-08'), 'Give the job title.');
    assert.equal(jobFormProblem({ ...ok, employer: '' }, '2026-11-08'), 'Give the employer.');
    assert.equal(jobFormProblem({ ...ok, category: '' }, '2026-11-08'), 'Pick the type: Fire/EMS, EMS or Education.');
  });

  it('a link has to be a web address; a closing date cannot be past', () => {
    assert.match(jobFormProblem({ ...ok, link: 'javascript:alert(1)' }, '2026-11-08') ?? '', /web address/);
    assert.match(jobFormProblem({ ...ok, link: 'example.org/job' }, '2026-11-08') ?? '', /web address/);
    assert.equal(jobFormProblem({ ...ok, closesOn: '2026-11-07' }, '2026-11-08'), 'The closing date has already passed.');
    assert.equal(jobFormProblem({ ...ok, closesOn: '2026-11-08' }, '2026-11-08'), null);
  });
});
