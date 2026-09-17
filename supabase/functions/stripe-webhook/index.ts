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
  metadata?: { profile_id?: string; tier?: string } | null;
};

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

  const profileId = s.metadata?.profile_id || s.client_reference_id;
  if (!profileId) {
    console.error(`REJECT: no profile id on session ${s.id}`);
    return new Response('no profile', { status: 200 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data, error } = await supabase.rpc('extend_membership', {
    p_profile: profileId,
    p_method: 'stripe',
    p_amount_cents: s.amount_total ?? null,
    p_months: 12,
    p_note: `Stripe ${s.payment_intent ?? s.id}${s.customer_details?.email ? ` · ${s.customer_details.email}` : ''}`,
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
});
