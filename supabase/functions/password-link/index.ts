// Password links through Resend.
//
// The sign-in page's "Forgot password" calls this instead of Supabase Auth's
// own mailer. Supabase's built-in mailer only delivers to the project's team
// and is capped at a couple of messages an hour, so a member could not set a
// password at all until the dashboard's custom SMTP is configured. This
// function needs no dashboard step: it mints the same recovery link Supabase
// Auth would have emailed (auth.admin.generateLink) and sends it through the
// Resend account the site already uses for board notifications and renewal
// reminders. Clicking the link lands on the site root with a recovery
// session, exactly like the built-in email, and the portal shows its "Set a
// new password" card.
//
// Behaviour:
//   * Always answers 200 for a well-formed address, whether or not a login
//     exists, so the form cannot be used to discover who is a member.
//   * At most 3 links per address per hour (password_link_log); beyond that
//     it answers 200 and sends nothing.
//   * The link is single use and expires after Supabase Auth's OTP window
//     (one hour by default).
//
// Secrets: RESEND_API_KEY (shared). SUPABASE_SERVICE_ROLE_KEY and
// SUPABASE_URL are provided by the platform.
// Deploy: supabase functions deploy password-link --project-ref iybsnqcffrhzhdpyoaqt
// (verify_jwt stays on: callers must present at least the public anon key,
// which supabase-js sends from the sign-in page.)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SITE = 'https://faemse.org';
const FROM = 'FAEMSE <notifications@faemse.org>';
// Replies go to the board directly: nobody on the project holds a login for
// info@faemse.org (2026-10-01), so a reply there could go unread.
const REPLY_TO = ['Jlanzardo@gmail.com', 'Mbsaco13@gmail.com'];
const PER_HOUR = 3;

const cors = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let email = '';
  try {
    const body = (await req.json()) as { email?: unknown };
    email = String(body.email ?? '').trim().toLowerCase();
  } catch {
    /* fall through to the validation below */
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ error: 'Enter a valid email address.' }, 400);
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  if (!resendKey || !serviceKey || !url) {
    return json({ error: 'Password emails are not switched on yet. Please email info@faemse.org.' }, 503);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Throttle per address before minting anything.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('password_link_log')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .gte('sent_at', since);
  if ((count ?? 0) >= PER_HOUR) {
    console.log(`throttled: ${email}`);
    return json({ ok: true });
  }

  // The same recovery link Supabase Auth would have emailed. Unknown address:
  // say nothing different.
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${SITE}/` },
  });
  const link = data?.properties?.action_link;
  if (error || !link) {
    console.log(`no link for ${email}: ${error?.message ?? 'no action_link'}`);
    return json({ ok: true });
  }

  let firstName = 'there';
  if (data.user?.id) {
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle();
    firstName = (profile?.full_name ?? '').split(' ')[0] || 'there';
  }

  const text = [
    `Hi ${firstName},`,
    '',
    'Use this link to set your password for the FAEMSE member portal. It works',
    'once and expires in one hour:',
    '',
    link,
    '',
    'The page that opens asks you to choose a password. Save it there, then',
    `sign in with it and this email address at ${SITE}/login from any device.`,
    '',
    'If you did not ask for this, you can ignore this message. Nothing changes',
    'until the link is used.',
    '',
    'Questions? Just reply to this email.',
    '',
    'The FAEMSE board',
  ].join('\n');

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [email], subject: 'Set your FAEMSE password', text, reply_to: REPLY_TO }),
  });
  if (!resp.ok) {
    console.error(`Resend refused (${resp.status}) for ${email}`);
    return json({ error: 'The email could not be sent right now. Please try again in a minute, or write to info@faemse.org.' }, 502);
  }
  await admin.from('password_link_log').insert({ email });
  console.log(`password link sent to ${email}`);
  return json({ ok: true });
});
