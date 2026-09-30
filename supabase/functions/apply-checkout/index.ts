// Pay right after applying: start a Stripe Checkout session for a membership
// application that was just submitted through the public form.
//
// Board decision 2026-09-30 (Jorge): the application form leads straight to
// the payment page; nobody waits for an approval before paying. The public
// form inserts the application (status 'new') with an id it made up, then
// calls this with that id. This function prices the tier, opens the Stripe
// session with the application id in its metadata, and returns the Stripe
// URL. When the card clears, stripe-webhook completes the application:
// creates the login if needed, extends the paid-through date, writes the
// ledger row, marks the application approved, and emails the member and
// the board.
//
// Guards, all server-side:
//   * the board's Online dues switch (get_settings) must be on;
//   * the application must exist and still be 'new';
//   * free tiers (honorary) never reach Stripe.
// Anyone holding the site's public anon key can call this, and all they can
// do with it is open a checkout page for an application that already exists.
//
// Secrets: STRIPE_SECRET_KEY (shared with create-checkout).
// Deploy: supabase functions deploy apply-checkout --project-ref iybsnqcffrhzhdpyoaqt

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SITE = 'https://faemse.org';
const DUES: Record<string, number> = { active: 5000, institutional: 25000, corporate: 20000, honorary: 0 };
const TIER_LABEL: Record<string, string> = { active: 'Active', institutional: 'Institutional', corporate: 'Corporate' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  let applicationId = '';
  try {
    const body = (await req.json()) as { application_id?: unknown };
    applicationId = String(body.application_id ?? '').trim();
  } catch {
    /* validated below */
  }
  if (!UUID.test(applicationId)) return json({ error: 'Missing application.' }, 400);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  if (!stripeKey || !serviceKey || !url) return json({ error: 'Online payment is not switched on yet.' }, 503);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // The board's switch, checked here and not only in the page.
  const { data: settings, error: settingsErr } = await admin.rpc('get_settings');
  if (settingsErr || (settings as { online_dues?: boolean } | null)?.online_dues !== true) {
    return json({ error: 'Online dues payment is paused right now. The board will follow up about your application by email.' }, 503);
  }

  const { data: app, error: appErr } = await admin
    .from('membership_applications')
    .select('id, kind, tier, full_name, email, status')
    .eq('id', applicationId)
    .maybeSingle();
  if (appErr || !app) return json({ error: 'Application not found.' }, 404);
  if (app.status !== 'new') return json({ error: 'This application has already been handled.' }, 409);

  const tier = String(app.tier ?? 'active').toLowerCase();
  const amount = DUES[tier];
  if (amount === undefined) return json({ error: 'Unknown membership tier.' }, 400);
  if (amount === 0) return json({ error: 'This membership type carries no dues.' }, 400);

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${SITE}/membership?paid=1`);
  form.set('cancel_url', `${SITE}/membership?paid=0`);
  form.set('customer_email', String(app.email).trim().toLowerCase());
  form.set('client_reference_id', app.id);
  form.set('metadata[application_id]', app.id);
  form.set('metadata[tier]', tier);
  form.set('metadata[kind]', String(app.kind ?? 'join'));
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(amount));
  form.set('line_items[0][price_data][product_data][name]', `FAEMSE ${TIER_LABEL[tier] ?? 'Active'} membership — 12 months`);
  form.set(
    'line_items[0][price_data][product_data][description]',
    'Florida Association of EMS Educators annual dues. Your membership runs twelve months from today, or from your current expiration date if you are renewing early.',
  );
  form.set('submit_type', 'pay');
  form.set('billing_address_collection', 'auto');

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const session = (await resp.json()) as { url?: string; error?: { message?: string } };
  if (!resp.ok || !session.url) {
    console.error('Stripe error', session.error);
    return json({ error: session.error?.message ?? 'Stripe could not start the checkout.' }, 502);
  }
  console.log(`checkout opened for application ${app.id} (${tier})`);
  return json({ url: session.url });
});
