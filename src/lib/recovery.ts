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
