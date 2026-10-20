// The member directory's order (board, 2026-10-20): FAEMSE positions first,
// by rank, then everyone else alphabetically by last name.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { lastName, sortDirectory, type DirectoryEntry } from '../src/lib/portal.ts';

const person = (full_name: string, faemse_position: string | null = null): DirectoryEntry => ({
  full_name,
  cert_level: null,
  county: null,
  agency: null,
  faemse_position,
});
const names = (list: DirectoryEntry[]) => list.map((e) => e.full_name);

describe('the member directory order', () => {
  test('positions come first, by rank, whatever the names', () => {
    const sorted = sortDirectory([
      person('Zoe Adams'),
      person('Matt Keeler', 'Member-at-Large'),
      person('Bryan Spangler', 'President-Elect'),
      person('James Dinsch', 'Executive Director'),
      person('Rochelle Goldberg', 'Secretary'),
      person('Jorge Anzardo', 'President'),
      person('Melissa McNally', 'Immediate Past President'),
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

  test('people of the same rank, and everyone else, go by last name', () => {
    const sorted = sortDirectory([
      person('Carlos Tavarez', 'Member-at-Large'),
      person('Garth Richards', 'Member-at-Large'),
      person('Matt Keeler', 'Member-at-Large'),
      person('Pat Young'),
      person('Alex Brown'),
      person('Sam Brown'),
      person('Lee Carter'),
    ]);
    assert.deepEqual(names(sorted), [
      'Matt Keeler',
      'Garth Richards',
      'Carlos Tavarez',
      'Alex Brown',
      'Sam Brown',
      'Lee Carter',
      'Pat Young',
    ]);
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
