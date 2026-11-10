// Password links (src/lib/recovery.ts). Since 2026-11-10 they open
// faemse.org/set-password and the one-time code is spent only when the
// person presses "Set my password", so a workplace email scanner that opens
// the link first can't use it up.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { linkFailedInHash, passwordLinkParams } from '../src/lib/recovery.ts';

describe('password links', () => {
  const hash = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8';

  it('reads the token hash our emails send', () => {
    assert.deepEqual(passwordLinkParams(`?token_hash=${hash}&type=recovery`), { tokenHash: hash, type: 'recovery' });
  });

  it('refuses anything else, so the page shows "get a new link"', () => {
    assert.equal(passwordLinkParams(''), null);
    assert.equal(passwordLinkParams('?type=recovery'), null);
    assert.equal(passwordLinkParams(`?token_hash=${hash}`), null, 'no type');
    assert.equal(passwordLinkParams(`?token_hash=${hash}&type=signup`), null, 'only recovery links');
    assert.equal(passwordLinkParams('?token_hash=short&type=recovery'), null);
    assert.equal(passwordLinkParams('?token_hash=has%20space%20in%20it%20abcdef&type=recovery'), null);
  });

  it('spots an old link that was used up or expired', () => {
    assert.equal(linkFailedInHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'), true);
    assert.equal(linkFailedInHash('#error=access_denied&error_description=Email+link+is+invalid'), true);
    assert.equal(linkFailedInHash('#access_token=abc&type=recovery'), false, 'a working link');
    assert.equal(linkFailedInHash(''), false);
    assert.equal(linkFailedInHash('#members'), false);
  });
});
