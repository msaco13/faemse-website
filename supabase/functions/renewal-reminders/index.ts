// Renewal reminders at 90, 60, 30, and 7 days before membership expiration.
//
// Runs daily from a pg_cron job (supabase/migrations/20260914_renewals.sql):
// idempotent — reminder_log's unique constraint guarantees each member gets
// each reminder at most once per expiration date, so re-runs, overlapping
// schedules, and a stray manual call never double-send.
//
// Setup (one time, in the Supabase dashboard):
//   1. Create a Resend account (resend.com) and verify the faemse.org domain
//      (Resend shows the DNS records to add at GoDaddy).
//   2. Edge Functions → Secrets → add RESEND_API_KEY = re_...
// That's it: the cron job is already scheduled and this function is deployed.
// Until RESEND_API_KEY is set the function logs what it WOULD send and exits.
//
// Auth: the gateway already requires a JWT signed by this project (verify_jwt).
// Inside, the token's role must be anon (the cron job) or service_role. Anyone
// holding the site's public anon key can only make today's reminders go out
// now instead of at noon — nothing extra ever sends.

import { createClient } from 'jsr:@supabase/supabase-js@2';

function jwtRole(auth: string): string {
  try {
    const token = auth.replace(/^Bearer\s+/i, '');
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.iss === 'supabase' ? String(payload.role ?? '') : '';
  } catch {
    return '';
  }
}

const WINDOWS = [90, 60, 30, 7] as const;
const FROM = 'FAEMSE <renewals@faemse.org>';
const PORTAL = 'https://faemse.org/members';

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
}

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const role = jwtRole(auth);
  if (!serviceKey || (role !== 'anon' && role !== 'service_role')) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const today = new Date();
  const results: Record<string, unknown>[] = [];

  // Mention online payment only once the board has switched it on.
  const { data: settings } = await supabase.rpc('get_settings');
  const onlineDues = Boolean((settings as { online_dues?: boolean } | null)?.online_dues);

  for (const days of WINDOWS) {
    const target = addDays(today, days);
    const { data: due, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, expires_at, tier')
      .eq('expires_at', target)
      .not('email', 'is', null)
      .neq('tier', 'honorary');
    if (error) {
      results.push({ days, error: error.message });
      continue;
    }

    for (const member of due ?? []) {
      // Claim the send first; the unique constraint makes duplicates a no-op.
      const { error: logError } = await supabase.from('reminder_log').insert({
        profile_id: member.id,
        expires_at: member.expires_at,
        days_before: days,
      });
      if (logError) continue; // already sent (unique violation) or transient — skip

      const firstName = (member.full_name ?? '').split(' ')[0] || 'there';
      const when = longDate(member.expires_at);
      const subject =
        days === 7
          ? 'Your FAEMSE membership expires in one week'
          : days === 30
            ? 'Your FAEMSE membership expires in 30 days'
            : `FAEMSE renewal reminder — ${days} days left`;
      const howTo = onlineDues
        ? [
            'Renewing takes two minutes: sign in to the member portal and choose',
            '"Pay dues online". Your membership extends a full year from your current',
            'expiration date, so renewing early never costs you time:',
            '',
            PORTAL,
            '',
            'Prefer to pay by check? Submit the renewal form and the board will follow up:',
            'https://faemse.org/membership',
          ]
        : [
            'Renewing takes a couple of minutes and keeps your access to the Q&A archive,',
            'teaching videos, member library, and directory:',
            '',
            'https://faemse.org/membership',
          ];
      const body = [
        `Hi ${firstName},`,
        '',
        `Your FAEMSE membership expires on ${when} — ${days === 7 ? 'one week' : `${days} days`} from now.`,
        '',
        ...howTo,
        '',
        'Questions? Just reply to this email.',
        '',
        '— The FAEMSE board',
      ].join('\n');

      if (!resendKey) {
        results.push({ days, to: member.email, sent: false, note: 'RESEND_API_KEY not set' });
        // Roll the claim back so the reminder sends for real once email works.
        await supabase
          .from('reminder_log')
          .delete()
          .match({ profile_id: member.id, expires_at: member.expires_at, days_before: days });
        continue;
      }

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: member.email, subject, text: body, reply_to: 'info@faemse.org' }),
      });
      if (!resp.ok) {
        // Send failed — release the claim so tomorrow's run retries.
        await supabase
          .from('reminder_log')
          .delete()
          .match({ profile_id: member.id, expires_at: member.expires_at, days_before: days });
        results.push({ days, to: member.email, sent: false, status: resp.status });
      } else {
        results.push({ days, to: member.email, sent: true });
      }
    }
  }

  return new Response(JSON.stringify({ ran_at: today.toISOString(), email_configured: Boolean(resendKey), results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
