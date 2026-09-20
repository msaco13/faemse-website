// Online dues: start a Stripe Checkout session for the signed-in member.
//
// The portal calls this (with the member's session token) when they click
// "Pay dues online". It looks up their tier, prices it from the same table as
// the database (dues_cents), and returns the Stripe-hosted checkout URL. The
// card details never touch the site. When Stripe confirms payment it calls
// the stripe-webhook function, which extends the paid-through date.
//
// Setup (one time, in the Supabase dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY   sk_live_... from Stripe → Developers → API keys
// Until it is set this returns 503 and the portal shows the off-line
// instructions instead of the button. The board also flips "Online dues" on
// in the portal's admin panel so the button appears.
//
// That switch is enforced here as well as in the portal. Hiding a button only
// hides it: the endpoint is reachable by anyone signed in who knows the URL.
// When the board turns online dues off, nobody gets charged — the function
// refuses before it ever talks to Stripe, and no Stripe setting has to change.
//
// Deploy: supabase functions deploy create-checkout --project-ref iybsnqcffrhzhdpyoaqt
// (verify_jwt stays on: only signed-in members can start a checkout.)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SITE = 'https://faemse.org';
const DUES: Record<string, number> = { active: 5000, institutional: 25000, corporate: 20000, honorary: 0 };
const TIER_LABEL: Record<string, string> = { active: 'Active', institutional: 'Institutional', corporate: 'Corporate' };

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

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return json({ error: 'Online payment is not switched on yet.' }, 503);

  // Who is asking: the member's own session, verified by Supabase Auth.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Please sign in first.' }, 401);
  const user = userData.user;

  // The board's "Online dues" switch, checked server-side. get_settings() is a
  // security-definer read of site_settings, so the member's own session can
  // ask. If the read itself fails we refuse rather than charge: a payment the
  // board has switched off is the worse mistake.
  const { data: settings, error: settingsErr } = await supabase.rpc('get_settings');
  const onlineDues = (settings as { online_dues?: boolean } | null)?.online_dues === true;
  if (settingsErr || !onlineDues) {
    if (settingsErr) console.error(`settings read failed: ${settingsErr.message}`);
    return json(
      { error: 'Online dues payment is paused right now. Email info@faemse.org and the board will take your dues directly.' },
      503,
    );
  }

  const { data: profile } = await supabase.from('profiles').select('tier, full_name, email, expires_at').eq('id', user.id).maybeSingle();
  const tier = String(profile?.tier ?? 'active').toLowerCase();
  const amount = DUES[tier] ?? DUES.active;
  if (amount === 0) return json({ error: 'Honorary membership carries no dues.' }, 400);

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${SITE}/members?paid=1`);
  form.set('cancel_url', `${SITE}/members?paid=0`);
  form.set('customer_email', user.email ?? profile?.email ?? '');
  form.set('client_reference_id', user.id);
  form.set('metadata[profile_id]', user.id);
  form.set('metadata[tier]', tier);
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(amount));
  form.set('line_items[0][price_data][product_data][name]', `FAEMSE ${TIER_LABEL[tier] ?? 'Active'} membership — 12 months`);
  form.set(
    'line_items[0][price_data][product_data][description]',
    'Florida Association of EMS Educators annual dues. Your membership extends twelve months from its current expiration date.',
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
  return json({ url: session.url });
});
