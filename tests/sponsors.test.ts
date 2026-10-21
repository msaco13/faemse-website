// Initials shown in place of a logo until a sponsor's logo is uploaded.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { sponsorInitials } from '../src/lib/sponsors.ts';

describe('initials for a sponsor without a logo', () => {
  test('the five sponsors with no logo on file today', () => {
    assert.equal(sponsorInitials('3B Scientific'), '3B');
    assert.equal(sponsorInitials('Braxton College'), 'BC');
    assert.equal(sponsorInitials('Dinsch Consulting Group'), 'DCG');
    assert.equal(sponsorInitials('First Response Training Group'), 'FRTG');
    assert.equal(sponsorInitials('Limmer Education'), 'LE');
  });

  test('small words, suffixes and punctuation are skipped', () => {
    assert.equal(sponsorInitials('Emergency Educational Training Institute, Inc.'), 'EETI');
    assert.equal(sponsorInitials('Coral Springs Regional Institute of Public Safety'), 'CSRI');
    assert.equal(sponsorInitials('The Rescue Company 1'), 'RC1');
  });

  test('never more than four letters, never empty for a real name', () => {
    assert.ok(sponsorInitials('A Very Long Name With Many Words').length <= 4);
    assert.equal(sponsorInitials('The'), 'T');
    assert.equal(sponsorInitials('   '), '');
  });
});
