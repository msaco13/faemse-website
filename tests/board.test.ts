// Which board seats vote (bylaws 5.02, 5.02.01, 9.05): the Board of
// Directors page labels every card with it (board, 2026-10-22).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { seatVotes } from '../src/lib/portal.ts';

describe('board seat voting', () => {
  test('officers and directors vote', () => {
    assert.equal(seatVotes({ section: 'officer' }), true);
    assert.equal(seatVotes({ section: 'director' }), true);
    assert.equal(seatVotes({ section: 'director', ex_officio: false }), true);
  });

  test('the ex officio Advisory Council seat does not, though it sits with the directors', () => {
    assert.equal(seatVotes({ section: 'director', ex_officio: true }), false);
  });

  test('appointed staff never vote', () => {
    assert.equal(seatVotes({ section: 'staff' }), false);
    assert.equal(seatVotes({ section: 'staff', ex_officio: false }), false);
  });

  test('a saved copy from before the field existed reads as voting, except staff', () => {
    assert.equal(seatVotes({ section: 'director', ex_officio: null }), true);
    assert.equal(seatVotes({ section: 'staff', ex_officio: null }), false);
  });
});
