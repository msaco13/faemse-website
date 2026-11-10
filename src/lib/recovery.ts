// Did this page load come from a password link?
//
// The link Supabase Auth mints (and password-link emails) lands on the site
// root with `type=recovery` in the URL hash. supabase-js reads that hash while
// it starts up and turns it into a signed-in session; this flag is read once,
// synchronously, before that happens, so the portal knows to put "Set your
// password" first even if the PASSWORD_RECOVERY event fired before anything
// had subscribed to it. Nothing here touches the URL: supabase-js must see
// the hash untouched.
export const arrivedByPasswordLink =
  typeof window !== 'undefined' && /(^#|&)type=recovery(&|$)/.test(window.location.hash);

// Password links since 2026-11-10 point at faemse.org/set-password with the
// link's token_hash, not at Supabase's /auth/v1/verify. Workplace email
// scanners (Microsoft 365 Safe Links) open every link in a message to check
// it, which used up the single-use Supabase link seconds after it was sent:
// 3B Scientific's representatives on 2026-10-29 and an SF College reset on
// 2026-11-10 were both spent before the person clicked. The new page only
// spends the code when the person presses its button (verifyOtp), which a
// scanner does not do. Supabase's docs recommend exactly this ("Email
// prefetching").
export type PasswordLink = { tokenHash: string; type: 'recovery' };

// The token_hash and type from /set-password's query string, or null when
// either is missing or not what our emails send.
export function passwordLinkParams(search: string): PasswordLink | null {
  const p = new URLSearchParams(search);
  const tokenHash = (p.get('token_hash') ?? '').trim();
  if (p.get('type') !== 'recovery' || !/^[A-Za-z0-9_-]{16,200}$/.test(tokenHash)) return null;
  return { tokenHash, type: 'recovery' };
}

// Supabase sends someone whose /verify link was already used or expired to
// the site root with the reason in the hash (#error=access_denied&
// error_code=otp_expired...). Emails sent before 2026-11-10 still carry that
// kind of link, so the site turns it into a clear "get a new link" page
// instead of the homepage.
export function linkFailedInHash(hash: string): boolean {
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  return h.get('error_code') === 'otp_expired' || (h.get('error') === 'access_denied' && h.has('error_description'));
}

export const arrivedByFailedLink = typeof window !== 'undefined' && linkFailedInHash(window.location.hash);
