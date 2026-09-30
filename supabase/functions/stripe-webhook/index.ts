// Stripe → FAEMSE: when a Checkout payment succeeds, extend the member's
// paid-through date and write the receipt to membership_payments.
//
// Setup (one time):
//   1. Stripe dashboard → Developers → Webhooks (now "Event destinations") →
//      Add destination:
//        URL:    https://iybsnqcffrhzhdpyoaqt.supabase.co/functions/v1/stripe-webhook
//        Scope:  Your account
//        Events: checkout.session.completed, checkout.session.async_payment_succeeded
//        Payload: snapshot, not thin — a thin payload carries only an id.
//   2. Open the destination and copy its **Signing secret**, which starts
//      `whsec_`, into Supabase → Edge Functions → Secrets as
//      STRIPE_WEBHOOK_SECRET.
//
//      This is the step that bit us on 2026-09-17: an API key (`sk_`/`rk_`)
//      was pasted here instead of the signing secret, and every delivery came
//      back 400. An API key is not a signing secret. Stripe signs each
//      delivery with the per-destination `whsec_` value and nothing else.
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt --project-ref iybsnqcffrhzhdpyoaqt
// (Stripe cannot send a Supabase JWT; the Stripe signature is the auth.)
//
// Idempotent: extend_membership() keys on the Checkout Session id, so a
// redelivered or manually resent event returns the existing receipt and
// changes nothing.
//
// A rejected delivery logs why — secret missing, header malformed, timestamp
// stale, or HMAC mismatch — so the next misconfiguration is one log line
// rather than a guessing game. It never logs the secret or a full signature.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TOLERANCE_SEC = 300;

type Verdict = { ok: boolean; why: string };

async function verify(raw: string, header: string, secret: string): Promise<Verdict> {
  const parts: Record<string, string> = {};
  for (const piece of header.split(',')) {
    const i = piece.indexOf('=');
    if (i > 0) parts[piece.slice(0, i).trim()] = piece.slice(i + 1).trim();
  }
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return { ok: false, why: `header missing t/v1; keys=[${Object.keys(parts).join('|')}]` };

  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (age > TOLERANCE_SEC) return { ok: false, why: `timestamp ${Math.round(age)}s outside ${TOLERANCE_SEC}s tolerance` };

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');

  if (hex.length !== v1.length) return { ok: false, why: `length mismatch computed=${hex.length} received=${v1.length}` };
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  if (diff !== 0) {
    return { ok: false, why: `HMAC mismatch computed=${hex.slice(0, 10)}… received=${v1.slice(0, 10)}… (wrong signing secret)` };
  }
  return { ok: true, why: 'ok' };
}

type Session = {
  id: string;
  object?: string;
  payment_status?: string;
  amount_total?: number;
  client_reference_id?: string | null;
  payment_intent?: string | null;
  customer_details?: { email?: string | null } | null;
  // profile_id: a signed-in member paying from the portal (create-checkout).
  // application_id: someone paying straight from the application form
  // (apply-checkout, board decision 2026-09-30).
  metadata?: { profile_id?: string; application_id?: string; tier?: string; kind?: string } | null;
};

const SITE = 'https://faemse.org';
const FROM = 'FAEMSE <notifications@faemse.org>';
const DEFAULT_BOARD = ['Jlanzardo@gmail.com', 'Mbsaco13@gmail.com'];
const TIER_LABEL: Record<string, string> = { active: 'Active', institutional: 'Institutional', corporate: 'Corporate', honorary: 'Honorary' };

function dollars(cents: number | null | undefined): string {
  return typeof cents === 'number' ? `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}` : 'dues';
}

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
}

// Best effort: a failed email never fails the webhook, the membership is
// already active by the time these run.
async function sendMail(to: string[], subject: string, text: string, replyTo = 'info@faemse.org'): Promise<void> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) {
    console.log(`RESEND_API_KEY not set; would email ${to.join(', ')}: ${subject}`);
    return;
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, text, reply_to: replyTo }),
  });
  if (!resp.ok) console.error(`Resend refused (${resp.status}) for ${to.join(', ')}: ${subject}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  const sigHeader = req.headers.get('stripe-signature') ?? '';
  const raw = await req.text();

  if (!secret) {
    console.error('REJECT: STRIPE_WEBHOOK_SECRET is not set on this project.');
    return new Response('Webhook secret not configured', { status: 400 });
  }
  if (!sigHeader) {
    console.error(`REJECT: no stripe-signature header. headers=[${[...req.headers.keys()].join('|')}]`);
    return new Response('Missing signature header', { status: 400 });
  }

  // Tolerate a stray newline or space pasted along with the secret.
  let verdict = await verify(raw, sigHeader, secret);
  if (!verdict.ok && secret !== secret.trim()) verdict = await verify(raw, sigHeader, secret.trim());
  if (!verdict.ok) {
    // Shape of the secret, never its value: enough to spot an API key pasted
    // into the signing-secret slot, which is the usual cause.
    console.error(`REJECT: ${verdict.why} | secret len=${secret.length} prefix=${secret.slice(0, 6)}`);
    return new Response(`Bad signature: ${verdict.why}`, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Session } };
  try {
    event = JSON.parse(raw);
  } catch {
    console.error('REJECT: body is not JSON');
    return new Response('Bad payload', { status: 400 });
  }

  const handled = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
  if (!event.type || !handled.includes(event.type)) {
    return new Response('ignored', { status: 200 });
  }

  const s = event.data?.object;
  if (!s || !s.id) {
    // A "thin" v2 payload carries only an id, not the session itself.
    console.error(`REJECT: no session object on the event — is the destination sending thin payloads? keys=[${Object.keys(event.data ?? {}).join('|')}]`);
    return new Response('No session object; destination must send snapshot payloads', { status: 400 });
  }
  if (s.payment_status && s.payment_status !== 'paid') return new Response('not paid yet', { status: 200 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const note = `Stripe ${s.payment_intent ?? s.id}${s.customer_details?.email ? ` · ${s.customer_details.email}` : ''}`;
  const applicationId = s.metadata?.application_id;

  // ---- Path 1: a signed-in member paid from the portal ---------------------
  if (!applicationId) {
    const profileId = s.metadata?.profile_id || s.client_reference_id;
    if (!profileId) {
      console.error(`REJECT: no profile id on session ${s.id}`);
      return new Response('no profile', { status: 200 });
    }
    const { data, error } = await supabase.rpc('extend_membership', {
      p_profile: profileId,
      p_method: 'stripe',
      p_amount_cents: s.amount_total ?? null,
      p_months: 12,
      p_note: note,
      p_stripe_session: s.id,
      p_recorded_by: null,
    });
    if (error) {
      console.error(`extend_membership failed: ${error.message}`);
      // 500 makes Stripe retry later (up to 3 days), which is what we want.
      return new Response(error.message, { status: 500 });
    }
    console.log(`OK: ${profileId} extended to ${data}`);
    return new Response(JSON.stringify({ ok: true, new_expires: data }), { headers: { 'Content-Type': 'application/json' } });
  }

  // ---- Path 2: paid straight from the application form ---------------------
  // Create the login if there is none, then complete_paid_application() fills
  // the profile, extends the paid-through date, writes the ledger row (once
  // per Stripe session) and marks the application approved, in one
  // transaction. Then the member gets a welcome email with a set-password
  // link and the board gets a receipt.
  const { data: app, error: appErr } = await supabase
    .from('membership_applications')
    .select('id, kind, tier, full_name, email, organization, status')
    .eq('id', applicationId)
    .maybeSingle();
  if (appErr) {
    console.error(`application read failed: ${appErr.message}`);
    return new Response(appErr.message, { status: 500 });
  }
  if (!app) {
    console.error(`REJECT: application ${applicationId} not found for session ${s.id}`);
    return new Response('no application', { status: 200 });
  }
  const email = String(app.email).trim().toLowerCase();

  let profileId: string | undefined;
  let created = false;
  const { data: existing } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle();
  if (existing?.id) {
    profileId = existing.id;
  } else {
    const { data: made, error: mkErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: app.full_name, tier: app.tier },
    });
    if (made?.user) {
      profileId = made.user.id;
      created = true;
    } else {
      // A login can exist without a profile row (never opened the portal).
      for (let page = 1; page <= 20 && !profileId; page++) {
        const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (listErr) break;
        profileId = list.users.find((u) => (u.email ?? '').toLowerCase() === email)?.id;
        if (list.users.length < 1000) break;
      }
      if (!profileId) {
        console.error(`could not create or find a login for application ${app.id}: ${mkErr?.message ?? 'unknown'}`);
        return new Response('no login', { status: 500 });
      }
    }
  }

  const { data: newExpires, error: doneErr } = await supabase.rpc('complete_paid_application', {
    p_application: app.id,
    p_profile: profileId,
    p_amount_cents: s.amount_total ?? null,
    p_stripe_session: s.id,
    p_note: note,
  });
  if (doneErr) {
    console.error(`complete_paid_application failed for ${app.id}: ${doneErr.message}`);
    return new Response(doneErr.message, { status: 500 });
  }
  const through = typeof newExpires === 'string' ? longDate(newExpires) : String(newExpires);
  const tier = String(app.tier ?? 'active').toLowerCase();
  const tierLabel = TIER_LABEL[tier] ?? tier;
  console.log(`OK: application ${app.id} paid; ${profileId} extended to ${newExpires}${created ? ' (login created)' : ''}`);

  // Welcome the member. A new login gets a set-password link (the same one
  // Forgot password would send); an existing member is pointed at sign-in.
  const firstName = String(app.full_name ?? '').split(' ')[0] || 'there';
  let passwordLines: string[];
  if (created) {
    const { data: link } = await supabase.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${SITE}/` } });
    const actionLink = link?.properties?.action_link;
    passwordLines = actionLink
      ? ['Set your portal password with this link (it works once and expires in one hour):', '', actionLink, '', `Your login is this email address. After that, sign in at ${SITE}/login`]
      : [`Your login is this email address. Go to ${SITE}/login and use "Forgot password" to set your password.`];
  } else {
    passwordLines = [`Sign in at ${SITE}/login with this email address. If you have not set a password yet, use "Forgot password" there.`];
  }
  await sendMail(
    [email],
    app.kind === 'renew' ? 'Your FAEMSE membership is renewed' : 'Welcome to FAEMSE',
    [
      `Hi ${firstName},`,
      '',
      `Thank you. Your payment of ${dollars(s.amount_total)} went through and your ${tierLabel} membership is paid through ${through}.`,
      '',
      ...passwordLines,
      '',
      'The member portal has the Q&A archive, teaching videos, the member library, the directory and the job and class boards.',
      '',
      'Questions? Reply to this email or write to info@faemse.org.',
      '',
      'The FAEMSE board',
    ].join('\n'),
  );

  // Tell the board. The application already emailed them when it was
  // submitted; this is the receipt, and the reminder for organizations.
  const boardTo = (Deno.env.get('NOTIFY_TO') ?? DEFAULT_BOARD.join(','))
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const orgLine =
    tier === 'institutional' || tier === 'corporate'
      ? [
          '',
          `This is a ${tierLabel} membership. To seat their representatives, create the organization under Board admin → Organizations and make this person the coordinator.`,
        ]
      : [];
  await sendMail(
    boardTo,
    `[FAEMSE site] Paid online: ${app.full_name} (${tierLabel}, ${dollars(s.amount_total)})`,
    [
      `${app.full_name} paid ${dollars(s.amount_total)} by card through the ${app.kind === 'renew' ? 'renewal' : 'application'} form.`,
      '',
      `Email: ${email}`,
      app.organization ? `Organization: ${app.organization}` : '',
      `Tier: ${tierLabel}`,
      `Paid through: ${through}`,
      created ? 'A portal login was created and they were emailed a set-password link.' : 'They already had a portal login; it was extended.',
      ...orgLine,
      '',
      `The application is marked approved and the payment is in the Dues ledger: ${SITE}/members`,
    ]
      .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
      .join('\n'),
  );

  return new Response(JSON.stringify({ ok: true, application: app.id, new_expires: newExpires, login_created: created }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
