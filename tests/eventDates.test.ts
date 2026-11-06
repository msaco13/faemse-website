// Event date ranges on the calendar (src/lib/eventDates.ts, board 2026-11-06).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eventDates, eventRangeProblem } from '../src/lib/eventDates.ts';

describe('event dates', () => {
  it('one day: no last day, or a last day that is not after the first', () => {
    for (const end of [undefined, null, '', '2027-01-04', '2027-01-03', 'soon']) {
      const d = eventDates('2027-01-04', end);
      assert.equal(d.days, '04');
      assert.equal(d.months, 'JAN');
      assert.equal(d.years, '2027');
      assert.equal(d.label, 'January 4, 2027');
      assert.equal(d.lastDay, '2027-01-04');
    }
  });

  it('a conference in one month shows the range of days', () => {
    const d = eventDates('2027-01-04', '2027-01-08');
    assert.deepEqual([d.days, d.months, d.years, d.label, d.lastDay], ['04–08', 'JAN', '2027', 'January 4–8, 2027', '2027-01-08']);
    assert.deepEqual([d.day, d.month, d.year], ['04', 'JAN', '2027']);
  });

  it('across two months, and across the new year', () => {
    const d = eventDates('2027-09-27', '2027-10-01');
    assert.deepEqual([d.days, d.months, d.years, d.label], ['27–01', 'SEP–OCT', '2027', 'September 27 – October 1, 2027']);
    const y = eventDates('2026-12-30', '2027-01-02');
    assert.deepEqual([y.days, y.months, y.years, y.label], ['30–02', 'DEC–JAN', '2026–27', 'December 30, 2026 – January 2, 2027']);
  });

  it('a last day before the first is refused in Admin; blank is fine', () => {
    assert.equal(eventRangeProblem('2027-01-04', ''), null);
    assert.equal(eventRangeProblem('2027-01-04', '2027-01-08'), null);
    assert.equal(eventRangeProblem('2027-01-04', '2027-01-04'), null);
    assert.match(eventRangeProblem('2027-01-04', '2027-01-03') ?? '', /before the first day/);
  });
});
