// The Job board's categories and the small rules around them
// (src/lib/jobs.ts, board decision 2026-11-06).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { allSame, applyLinkProblem, categoryFromSlug, categoryLabel, categoryOf, countByCategory, employerKey, groupByEmployer, isApplyLink, isNew, jobFormProblem, lastChecked, placesOf, tabFromSlug } from '../src/lib/jobs.ts';

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

  it('counts per tab; a job with no type yet counts under All only', () => {
    assert.deepEqual(countByCategory([{ category: 'ems' }, { category: 'ems' }, { category: 'fire_ems' }, { category: null }, {}]), {
      fire_ems: 1,
      ems: 2,
      education: 0,
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
  const ok = { title: 'Paramedic', employer: 'Sample EMS', location: '', category: '', closesOn: '', link: 'https://example.org/job', description: '' };
  it('the link to apply, the title and the employer; the type is optional', () => {
    assert.equal(jobFormProblem(ok, '2026-11-08'), null);
    assert.equal(jobFormProblem({ ...ok, category: 'ems' }, '2026-11-08'), null);
    assert.equal(jobFormProblem({ ...ok, link: '', description: 'Evening shifts.' }, '2026-11-08'), 'Add the link to apply. Every job on the board needs one.');
    assert.equal(jobFormProblem({ ...ok, title: ' ' }, '2026-11-08'), 'Give the job title.');
    assert.equal(jobFormProblem({ ...ok, employer: '' }, '2026-11-08'), 'Give the employer.');
    assert.equal(jobFormProblem({ ...ok, category: 'police' }, '2026-11-08'), 'Pick the type: Fire/EMS, EMS or Education.');
  });

  it('a link has to be a web address; a closing date cannot be past', () => {
    assert.match(jobFormProblem({ ...ok, link: 'javascript:alert(1)' }, '2026-11-08') ?? '', /web address/);
    assert.match(jobFormProblem({ ...ok, link: 'example.org/job' }, '2026-11-08') ?? '', /web address/);
    assert.equal(jobFormProblem({ ...ok, closesOn: '2026-11-07' }, '2026-11-08'), 'The closing date has already passed.');
    assert.equal(jobFormProblem({ ...ok, closesOn: '2026-11-08' }, '2026-11-08'), null);
  });
});

describe('every job needs a link to apply (board, 2026-11-06)', () => {
  it('a web address, whoever adds the job', () => {
    assert.equal(isApplyLink('https://example.org/jobs/123'), true);
    assert.equal(isApplyLink('  http://example.org/apply  '), true);
    assert.equal(isApplyLink(''), false);
    assert.equal(isApplyLink('example.org/jobs'), false);
    assert.equal(isApplyLink('mailto:hr@example.org'), false);
    assert.equal(isApplyLink('https://example.org/a b'), false);
    assert.equal(isApplyLink(`https://example.org/${'x'.repeat(1000)}`), false);
  });

  it('says what is missing in plain words', () => {
    assert.equal(applyLinkProblem(''), 'Add the link to apply. Every job on the board needs one.');
    assert.equal(applyLinkProblem('www.example.org'), 'The link has to be a web address starting with https://');
    assert.equal(applyLinkProblem('https://example.org/apply'), null);
  });
});

describe('three tabs, no All (board, 2026-11-06)', () => {
  it('opens on Fire/EMS; an old or unknown ?type= lands there too', () => {
    assert.equal(tabFromSlug(null), 'fire_ems');
    assert.equal(tabFromSlug('all'), 'fire_ems');
    assert.equal(tabFromSlug('nonsense'), 'fire_ems');
    assert.equal(tabFromSlug('ems'), 'ems');
    assert.equal(tabFromSlug('education'), 'education');
  });
});

describe('one card per employer (board, 2026-11-06)', () => {
  const job = (title: string, employer: string | null, location = '') => ({ title, employer, location });

  it('groups an employer\'s openings, keeping the order of its first job', () => {
    const groups = groupByEmployer([
      job('AMR Paramedic', 'AMR and Medics Ambulance Service', 'Medley'),
      job('Paramedic', 'Sunstar Paramedics'),
      job('Medics EMT-Basic', 'AMR and Medics Ambulance Service', 'Lake Worth'),
      job('AMR EMT-Basic', 'AMR and Medics Ambulance Service', 'Pompano Beach'),
    ]);
    assert.deepEqual(groups.map((g) => g.map((j) => j.title)), [
      ['AMR Paramedic', 'Medics EMT-Basic', 'AMR EMT-Basic'],
      ['Paramedic'],
    ]);
  });

  it('matches names whatever the case or spacing, and never by a blank name', () => {
    assert.equal(employerKey('  Lake County   Fire Rescue '), employerKey('lake county fire rescue'));
    const groups = groupByEmployer([job('A', 'Lake County Fire Rescue'), job('B', 'LAKE COUNTY FIRE RESCUE'), job('C', ''), job('D', null), job('E', '  ')]);
    assert.deepEqual(groups.map((g) => g.length), [2, 1, 1, 1]);
  });

  it('different names stay apart: the sweep writes one name per employer', () => {
    const groups = groupByEmployer([job('A', 'AMR (American Medical Response)'), job('B', 'Medics Ambulance Service (AMR)')]);
    assert.equal(groups.length, 2);
  });

  it('what every opening shares shows once; places in order without repeats', () => {
    const g = [job('A', 'X', 'Medley'), job('B', 'X', 'medley'), job('C', 'X', 'Pompano Beach'), job('D', 'X', '')];
    assert.equal(allSame(g, (j) => j.employer), true);
    assert.equal(allSame(g, (j) => j.location), false);
    assert.deepEqual(placesOf(g), ['Medley', 'Pompano Beach']);
  });
});
