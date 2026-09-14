// Stripe → FAEMSE: when a Checkout payment succeeds, extend the member's
// paid-through date and write the receipt to membership_payments.
//
// Setup (one time):
//   1. Stripe dashboard → Developers → Webhooks → Add endpoint:
//        URL:    https://iybsnqcffrhzhdpyoaqt.supabase.co/functions/v1/stripe-webhook
//        Events: checkout.session.completed, checkout.session.async_payment_succeeded
//   2. Copy the endpoint's signing secret (whsec_...) into
//      Supabase → Edge Functions → Secrets → STRIPE_WEBHOOK_SECRET
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt --project-ref iybsnqcffrhzhdpyoaqt
// (Stripe cannot send a Supabase JWT; the Stripe signature is the auth.)
//
// Idempotent: extend_membership() keys on the Checkout Session id, so a
// redelivered event returns the existing receipt and changes nothing.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TOLERANCE_SEC = 300;

async function verify(raw: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_SEC) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

type Session = {
  id: string;
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
  if (!secret || !(await verify(raw, sigHeader, secret))) return new Response('Bad signature', { status: 400 });

  let event: { type: string; data: { object: Session } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('Bad payload', { status: 400 });
  }

  const handled = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
  if (!handled.includes(event.type)) return new Response('ignored', { status: 200 });

  const s = event.data.object;
  if (s.payment_status && s.payment_status !== 'paid') return new Response('not paid yet', { status: 200 });
  const profileId = s.metadata?.profile_id || s.client_reference_id;
  if (!profileId) {
    console.error('No profile id on session', s.id);
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
    console.error('extend_membership failed', error);
    // 500 makes Stripe retry later (up to 3 days), which is what we want.
    return new Response(error.message, { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true, new_expires: data }), { headers: { 'Content-Type': 'application/json' } });
});
