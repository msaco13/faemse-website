// Renewal reminders at 90, 60, and 30 days before membership expiration.
//
// Run daily (idempotent — reminder_log's unique constraint guarantees each
// member gets each reminder at most once per expiration date, so re-runs and
// overlapping schedules never double-send).
//
// Setup (one time):
//   1. Create a Resend account (resend.com) and verify the faemse.org domain.
//   2. supabase secrets set RESEND_API_KEY=re_... --project-ref iybsnqcffrhzhdpyoaqt
//   3. supabase functions deploy renewal-reminders --project-ref iybsnqcffrhzhdpyoaqt
//   4. Schedule it daily: Supabase dashboard → Integrations → Cron →
//      "0 12 * * *" → HTTP request → this function's URL with the
//      Authorization: Bearer <service role key> header.
//
// Until RESEND_API_KEY is set the function logs what it WOULD send and exits —
// safe to deploy and schedule before email is configured.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const WINDOWS = [90, 60, 30] as const;
const FROM = 'FAEMSE <renewals@faemse.org>';

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  // Only the service role (the cron job) may trigger sends.
  const auth = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const today = new Date();
  const results: Record<string, unknown>[] = [];

  for (const days of WINDOWS) {
    const target = addDays(today, days);
    const { data: due, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, expires_at')
      .eq('expires_at', target)
      .not('email', 'is', null);
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
      const subject =
        days === 30
          ? 'Your FAEMSE membership expires in 30 days'
          : `FAEMSE renewal reminder — ${days} days left`;
      const body = [
        `Hi ${firstName},`,
        '',
        `Your FAEMSE membership expires on ${member.expires_at} — ${days} days from now.`,
        '',
        'Renewing takes a couple of minutes and keeps your access to the Q&A archive,',
        'teaching videos, member library, and directory:',
        '',
        'https://faemse.org/membership',
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
        body: JSON.stringify({ from: FROM, to: member.email, subject, text: body }),
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

  return new Response(JSON.stringify({ ran_at: today.toISOString(), results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
