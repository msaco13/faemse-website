// Board notifications: email the board the moment someone sends a
// contact-form message or submits a membership application, so nothing sits
// unseen in a database table.
//
// Triggered by Supabase Database Webhooks (one per table):
//   Dashboard → Database → Webhooks → Create:
//     name:    notify-board-messages        (and notify-board-applications)
//     table:   public.contact_messages      (and public.membership_applications)
//     events:  INSERT
//     type:    Supabase Edge Function → notify-board
//     headers: x-webhook-secret: <the WEBHOOK_SECRET value below>
//
// Secrets (supabase secrets set ... --project-ref iybsnqcffrhzhdpyoaqt):
//   WEBHOOK_SECRET   any long random string; the webhook must send it back
//   RESEND_API_KEY   from resend.com (same account as renewal-reminders)
//   NOTIFY_TO        comma-separated recipients; defaults to the interim
//                    board inbox below until info@faemse.org is confirmed
//
// Deploy: supabase functions deploy notify-board --no-verify-jwt --project-ref iybsnqcffrhzhdpyoaqt
// Until RESEND_API_KEY is set, the function logs what it would send and
// returns 200 (the webhook stays healthy).

const DEFAULT_TO = ['Jlanzardo@gmail.com', 'Mbsaco13@gmail.com'];
const FROM = 'FAEMSE website <notifications@faemse.org>';
const PORTAL = 'https://msaco13.github.io/faemse-website/members';

type Payload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown>;
};

function line(label: string, v: unknown): string {
  return v ? `${label}: ${String(v)}` : '';
}

function compose(p: Payload): { subject: string; text: string } | null {
  const r = p.record;
  if (p.table === 'contact_messages') {
    return {
      subject: `[FAEMSE site] Message: ${String(r.subject || '(no subject)')}`,
      text: [
        `New message through the Contact page.`,
        '',
        line('From', r.name),
        line('Email', r.email),
        line('Subject', r.subject),
        '',
        String(r.message ?? ''),
        '',
        `Reply directly to ${String(r.email)}, then mark it handled in the portal: ${PORTAL}`,
      ]
        .filter((l) => l !== undefined)
        .join('\n'),
    };
  }
  if (p.table === 'membership_applications') {
    return {
      subject: `[FAEMSE site] ${r.kind === 'renew' ? 'Renewal' : 'New membership'} application: ${String(r.full_name ?? '')}`,
      text: [
        `Someone ${r.kind === 'renew' ? 'asked to renew' : 'applied to join'} through the website.`,
        '',
        line('Name', r.full_name),
        line('Email', r.email),
        line('Phone', r.phone),
        line('Tier', r.tier),
        line('Organization', r.organization),
        line('County', r.county),
        line('Certification', r.cert_level),
        line('Note', r.note),
        '',
        `Review it in the Board admin panel: ${PORTAL}`,
        `(Dues are collected off-site; once paid, set their paid-through date there.)`,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }
  return null;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET') ?? '';
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return new Response('Bad payload', { status: 400 });
  }
  if (payload.type !== 'INSERT') return new Response('ignored', { status: 200 });

  const mail = compose(payload);
  if (!mail) return new Response('ignored table', { status: 200 });

  const to = (Deno.env.get('NOTIFY_TO') ?? DEFAULT_TO.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.log('RESEND_API_KEY not set; would send:', { to, subject: mail.subject });
    return new Response(JSON.stringify({ sent: false, reason: 'no RESEND_API_KEY' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject: mail.subject, text: mail.text, reply_to: String(payload.record.email ?? '') || undefined }),
  });
  return new Response(JSON.stringify({ sent: resp.ok, status: resp.status }), {
    status: resp.ok ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
});
