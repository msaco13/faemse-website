// Membership date rules, as the member portal shows them. If the board
// changes a membership term (the 12-month term, the 90-day grace window in
// bylaws 2.05), update these tests in the same change; see CLAUDE.md.
//
// These cover the website's copy of the rules. The database applies the same
// window in is_current_member() and the renewal-reminders function has its
// own schedule; neither is exercised here.
//
// Run with `npm test`. Uses Node's built-in test runner, so there is nothing
// to install; needs Node 22.18 or later, which runs TypeScript directly.

process.env.TZ = 'America/New_York'; // Florida time; npm test also sets it.

import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { toISODate, todayISO } from '../src/lib/dates.ts';
import { GRACE_DAYS, dateState, formatDate, graceEnd, overallState, type MyOrganization, type Profile } from '../src/lib/portal.ts';

// Pin "now" to a local Florida date and time.
function at(y: number, m: number, d: number, hh = 12, mm = 0) {
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now: new Date(y, m - 1, d, hh, mm) });
}
afterEach(() => mock.timers.reset());

const profile = (expires_at: string | null) => ({ expires_at }) as Profile;
const org = (expires_at: string | null) => ({ expires_at }) as MyOrganization;

describe('the rules themselves', () => {
  it('grace is 90 days (bylaws 2.05, same as is_current_member in the database)', () => {
    assert.equal(GRACE_DAYS, 90);
  });

  it('runs in Florida time', () => {
    assert.equal(Intl.DateTimeFormat().resolvedOptions().timeZone, 'America/New_York');
  });
});

describe('one paid-through date', () => {
  it('no date means the membership is pending', () => {
    assert.equal(dateState(null), 'pending');
    assert.equal(dateState(undefined), 'pending');
    assert.equal(dateState(''), 'pending');
  });

  it('is current before the date', () => {
    at(2026, 10, 30);
    assert.equal(dateState('2026-10-31'), 'current');
  });

  it('is current all of the last day, including late evening', () => {
    at(2026, 10, 31, 0, 1);
    assert.equal(dateState('2026-10-31'), 'current');
    at(2026, 10, 31, 23, 59);
    assert.equal(dateState('2026-10-31'), 'current');
  });

  it('turns to grace the next morning', () => {
    at(2026, 11, 1, 0, 1);
    assert.equal(dateState('2026-10-31'), 'grace');
  });

  it('is still grace on day 90, across the November clock change', () => {
    at(2027, 1, 29, 23, 59);
    assert.equal(dateState('2026-10-31'), 'grace');
  });

  it('lapses on day 91', () => {
    at(2027, 1, 30, 0, 1);
    assert.equal(dateState('2026-10-31'), 'lapsed');
  });

  it('counts the grace window through a leap year', () => {
    // Dec 15, 2027 + 90 days = March 14, 2028 (February 2028 has 29 days).
    assert.equal(toISODate(graceEnd('2027-12-15')), '2028-03-14');
    at(2028, 3, 14, 20);
    assert.equal(dateState('2027-12-15'), 'grace');
    at(2028, 3, 15, 8);
    assert.equal(dateState('2027-12-15'), 'lapsed');
  });

  it('reads a full timestamp by its calendar date', () => {
    at(2026, 10, 31, 21, 30);
    assert.equal(dateState('2026-10-31T00:00:00+00:00'), 'current');
  });
});

describe('the grace end date', () => {
  it('is 90 calendar days after the paid-through date', () => {
    assert.equal(toISODate(graceEnd('2026-10-31')), '2027-01-29');
    assert.equal(toISODate(graceEnd('2026-09-30')), '2026-12-29');
  });
});

describe('a person with organization memberships', () => {
  it('is as current as their best membership', () => {
    at(2026, 12, 1);
    assert.equal(overallState(profile('2026-01-01'), [org('2027-06-30')]), 'current');
    assert.equal(overallState(profile('2026-11-15'), [org('2026-01-01')]), 'grace');
    assert.equal(overallState(profile(null), [org('2026-11-15')]), 'grace');
    assert.equal(overallState(profile('2027-01-01'), [org(null)]), 'current');
  });

  it('is pending with no profile and no organizations', () => {
    assert.equal(overallState(null, []), 'pending');
  });

  it('is lapsed when every membership is past grace', () => {
    at(2026, 12, 1);
    assert.equal(overallState(profile('2026-01-01'), [org('2026-02-01')]), 'lapsed');
  });
});

describe('calendar dates in the browser', () => {
  it('"today" stays today in the evening (UTC is already tomorrow)', () => {
    at(2026, 10, 31, 21, 30);
    assert.equal(todayISO(), '2026-10-31');
  });

  it('shows a paid-through date as written', () => {
    assert.equal(formatDate('2026-10-31'), 'October 31, 2026');
    assert.equal(formatDate('2026-10-31T23:00:00Z'), 'October 31, 2026');
  });
});
