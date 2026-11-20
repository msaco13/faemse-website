// Renewal reminders at 90, 60, 30, and 7 days before membership expiration.
//
// Runs daily from a pg_cron job (supabase/migrations/20260914_renewals.sql):
// idempotent — reminder_log's unique constraints guarantee each member and
// each organization gets each reminder at most once per expiration date, so
// re-runs, overlapping schedules, and a stray manual call never double-send.
//
// Two kinds of renewal:
//   * a person's own membership (profiles.expires_at) — emailed to them;
//   * an organization's membership (organizations.expires_at) — emailed to
//     the coordinator, and to the organization's contact address if that is
//     someone else. Representatives are not emailed; it is not their bill.
//
// The board can hold all reminders with the "Renewal reminders" switch in
// the portal (site_settings.reminders_paused). Held reminders are not sent
// later: a member 30 days out when the switch flips back on gets the 30-day
// reminder that day and the 7-day one on time.
//
// Setup (one time, in the Supabase dashboard):
//   1. Create a Resend account (resend.com) and verify the faemse.org domain
//      (Resend shows the DNS records to add at GoDaddy).
//   2. Edge Functions → Secrets → add RESEND_API_KEY = re_...
// Until RESEND_API_KEY is set the function logs what it WOULD send and exits.
//
// Auth: the gateway already requires a JWT signed by this project (verify_jwt).
// Inside, the token's role must be anon (the cron job) or service_role. Anyone
// holding the site's public anon key can only make today's reminders go out
// now instead of at 12:00 UTC — nothing extra ever sends. The response gives
// counts only, never addresses or names (security review, AJ, 2026-11-20):
// who was reminded is in reminder_log, and problems are in the function logs
// (by member or organization id), which only project admins can read.

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
// Replies go to the board directly: the site prints no email address
// (board, 2026-10-21; info@faemse.org has no mailbox), so a member's reply
// must land with people. The board's addresses live only in the NOTIFY_TO
// secret (comma-separated, Supabase -> Edge Functions -> Secrets), never in
// this public repository (security review, AJ, 2026-11-20).
function boardAddresses(): string[] {
  return (Deno.env.get('NOTIFY_TO') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}
const PORTAL = 'https://faemse.org/members';
const RENEW_FORM = 'https://faemse.org/membership';

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
}

function subjectFor(days: number, what: string): string {
  if (days === 7) return `${what} expires in one week`;
  if (days === 30) return `${what} expires in 30 days`;
  return `FAEMSE renewal reminder — ${days} days left`;
}

function howToRenew(onlineDues: boolean): string[] {
  return onlineDues
    ? [
        'Renewing takes two minutes: sign in to the member portal and choose',
        '"Pay dues online". Your membership extends a full year from your current',
        'expiration date, so renewing early never costs you time:',
        '',
        PORTAL,
        '',
        'First time signing in? Your login is this email address. Use "Forgot',
        'password" on the sign-in page to set your password.',
        '',
        'Prefer to pay by check? Submit the renewal form and the board will follow up:',
        RENEW_FORM,
      ]
    : [
        'Renewing takes a couple of minutes and keeps your access to the Q&A archive,',
        'teaching videos, member library, and directory:',
        '',
        RENEW_FORM,
      ];
}

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const role = jwtRole(auth);
  if (!serviceKey || (role !== 'anon' && role !== 'service_role')) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const today = new Date();
  // Counts only: the response and the logs never carry an address or a name.
  const counts = { sent: 0, failed: 0, skipped: 0, errors: 0 };
  const reply = (paused: boolean) =>
    new Response(JSON.stringify({ ran_at: today.toISOString(), paused, email_configured: Boolean(resendKey), ...counts }), {
      headers: { 'Content-Type': 'application/json' },
    });

  const { data: settings } = await supabase.rpc('get_settings');
  const s = (settings ?? {}) as { online_dues?: boolean; reminders_paused?: boolean };
  if (s.reminders_paused === true) return reply(true);
  const onlineDues = s.online_dues === true;
  const replyTo = boardAddresses();
  if (replyTo.length === 0) console.error('NOTIFY_TO is not set: reminders go out without a reply-to, so member replies are lost');

  // One send, with the claim-then-send dance that makes re-runs safe.
  async function send(
    claim: { profile_id?: string; organization_id?: string; expires_at: string; days_before: number },
    to: string[],
    subject: string,
    body: string,
  ) {
    const who = claim.profile_id ? `member ${claim.profile_id}` : `organization ${claim.organization_id}`;
    const { error: logError } = await supabase.from('reminder_log').insert(claim);
    if (logError) return; // already sent (unique violation) or transient — skip
    if (!resendKey) {
      counts.skipped++;
      console.log(`RESEND_API_KEY not set: ${claim.days_before}-day reminder for ${who} not sent`);
      await supabase.from('reminder_log').delete().match(claim);
      return;
    }
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, text: body, ...(replyTo.length ? { reply_to: replyTo } : {}) }),
    });
    if (!resp.ok) {
      await supabase.from('reminder_log').delete().match(claim); // retry tomorrow
      counts.failed++;
      console.error(`Resend refused (${resp.status}) the ${claim.days_before}-day reminder for ${who}; it retries tomorrow`);
    } else {
      counts.sent++;
    }
  }

  for (const days of WINDOWS) {
    const target = addDays(today, days);
    const when = longDate(target);
    const left = days === 7 ? 'one week' : `${days} days`;

    // People renewing their own membership.
    const { data: due, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, expires_at, tier')
      .eq('expires_at', target)
      .not('email', 'is', null)
      .neq('tier', 'honorary');
    if (error) {
      counts.errors++;
      console.error(`${days}-day members query failed: ${error.message}`);
    }
    for (const m of due ?? []) {
      const firstName = (m.full_name ?? '').split(' ')[0] || 'there';
      const body = [
        `Hi ${firstName},`,
        '',
        `Your FAEMSE membership expires on ${when} — ${left} from now.`,
        '',
        ...howToRenew(onlineDues),
        '',
        'Questions? Just reply to this email.',
        '',
        '— The FAEMSE board',
      ].join('\n');
      await send({ profile_id: m.id, expires_at: m.expires_at, days_before: days }, [m.email], subjectFor(days, 'Your FAEMSE membership'), body);
    }

    // Organizations, to whoever pays for them.
    const { data: orgs, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, kind, expires_at, contact_email, coordinator:profiles!organizations_coordinator_id_fkey(email, full_name)')
      .eq('expires_at', target);
    if (orgErr) {
      counts.errors++;
      console.error(`${days}-day organizations query failed: ${orgErr.message}`);
    }
    for (const o of orgs ?? []) {
      const coord = (Array.isArray(o.coordinator) ? o.coordinator[0] : o.coordinator) as { email?: string; full_name?: string } | null;
      const to = [...new Set([coord?.email, o.contact_email].filter((e): e is string => Boolean(e)).map((e) => e.toLowerCase()))];
      if (to.length === 0) {
        counts.skipped++;
        console.log(`${days}-day reminder for organization ${o.id} not sent: no coordinator or contact email`);
        continue;
      }
      const firstName = (coord?.full_name ?? '').split(' ')[0] || 'there';
      const body = [
        `Hi ${firstName},`,
        '',
        `${o.name}'s ${o.kind} membership in FAEMSE expires on ${when} — ${left} from now.`,
        '',
        'Renewing keeps every representative’s access to the Q&A archive, teaching videos,',
        'member library, and directory. Renew on the membership form: choose "I\'m renewing",',
        'pick your membership type, enter the organization name, and list the people you',
        `want seated this year, up to ${o.kind === 'corporate' ? 'two' : 'four'} plus you. They do not have to be the same people`,
        'as last year.',
        '',
        RENEW_FORM,
        '',
        'Questions? Just reply to this email.',
        '',
        '— The FAEMSE board',
      ].join('\n');
      await send({ organization_id: o.id, expires_at: o.expires_at, days_before: days }, to, subjectFor(days, `${o.name}'s FAEMSE membership`), body);
    }
  }

  console.log(`renewal reminders: ${counts.sent} sent, ${counts.failed} failed, ${counts.skipped} skipped, ${counts.errors} query errors`);
  return reply(false);
});
