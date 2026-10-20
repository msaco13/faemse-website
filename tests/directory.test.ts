// The member directory's order (board, 2026-10-20): board seats first, in
// the board page's order, then everyone else alphabetically by last name.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { lastName, sortDirectory, type DirectoryEntry } from '../src/lib/portal.ts';

// position_rank as get_directory returns it: officers 0..., directors
// 100000..., staff 200000..., plus the seat's order on the board page.
const person = (full_name: string, faemse_position: string | null = null, position_rank: number | null = null): DirectoryEntry => ({
  full_name,
  cert_level: null,
  county: null,
  agency: null,
  faemse_position,
  position_rank,
});
const names = (list: DirectoryEntry[]) => list.map((e) => e.full_name);

describe('the member directory order', () => {
  test('board seats come first, in the board page order, whatever the names', () => {
    const sorted = sortDirectory([
      person('Zoe Adams'),
      person('Matt Keeler', 'Member-at-Large', 100020),
      person('Bryan Spangler', 'President-Elect', 20),
      person('James Dinsch', 'Executive Director', 200010),
      person('Rochelle Goldberg', 'Secretary', 30),
      person('Jorge Anzardo', 'President', 10),
      person('Melissa McNally', 'Immediate Past President', 100010),
    ]);
    assert.deepEqual(names(sorted), [
      'Jorge Anzardo',
      'Bryan Spangler',
      'Rochelle Goldberg',
      'Melissa McNally',
      'Matt Keeler',
      'James Dinsch',
      'Zoe Adams',
    ]);
  });

  test('everyone without a seat goes by last name, then first name', () => {
    const sorted = sortDirectory([person('Pat Young'), person('Alex Brown'), person('Sam Brown'), person('Lee Carter')]);
    assert.deepEqual(names(sorted), ['Alex Brown', 'Sam Brown', 'Lee Carter', 'Pat Young']);
  });

  test('a position without a rank still sorts ahead of members without one', () => {
    assert.deepEqual(names(sortDirectory([person('Bo Adams'), person('Cy Zeta', 'Treasurer')])), ['Cy Zeta', 'Bo Adams']);
  });

  test('last names ignore suffixes and case', () => {
    assert.equal(lastName('Robert Smith Jr.'), 'Smith');
    assert.equal(lastName('Robert Smith, III'), 'Smith');
    assert.equal(lastName('Ana de la Cruz'), 'Cruz');
    assert.equal(lastName('Cher'), 'Cher');
    assert.equal(lastName(null), '');
    assert.deepEqual(names(sortDirectory([person('amy zimmer'), person('Bo Adams')])), ['Bo Adams', 'amy zimmer']);
  });
});
