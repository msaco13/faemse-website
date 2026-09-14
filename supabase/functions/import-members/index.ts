// Member import: the board pastes the roster (from the old membership system's
// export, saved as CSV) into the portal; this creates the login for anyone
// who doesn't have one and sets each profile's name, tier, and paid-through
// date. Existing members are updated, never duplicated; the admin role is
// never touched. Members set their own password from the sign-in page's
// "Forgot password" link, so no passwords are ever handled here.
//
// Only board admins can call it: the caller's own session must pass
// is_admin(); the service-role key is used after that to create auth users.
//
// Deploy: supabase functions deploy import-members --project-ref iybsnqcffrhzhdpyoaqt

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SITE = 'https://faemse.org';
const MAX_ROWS = 500;
const TIERS = ['active', 'institutional', 'corporate', 'honorary'];

const cors = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

type Row = {
  email?: string;
  full_name?: string;
  tier?: string;
  expires_at?: string; // YYYY-MM-DD
  county?: string;
  agency?: string;
  cert_level?: string;
};

type Result = { email: string; status: 'created' | 'updated' | 'skipped' | 'error'; message?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
  const { data: isAdmin, error: adminErr } = await asCaller.rpc('is_admin');
  if (adminErr || !isAdmin) return json({ error: 'Admins only.' }, 403);

  let body: { rows?: Row[]; dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad payload' }, 400);
  }
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : [];
  if (rows.length === 0) return json({ error: 'No rows.' }, 400);
  const dryRun = Boolean(body.dry_run);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  // Every existing login, by email. Small association; one or two pages.
  const byEmail = new Map<string, string>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return json({ error: `Could not list users: ${error.message}` }, 500);
    for (const u of data.users) if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }

  const results: Result[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const email = String(r.email ?? '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      results.push({ email: email || '(blank)', status: 'error', message: 'Not a valid email address' });
      continue;
    }
    if (seen.has(email)) {
      results.push({ email, status: 'skipped', message: 'Duplicate row' });
      continue;
    }
    seen.add(email);
    const tier = String(r.tier ?? '').trim().toLowerCase();
    if (tier && !TIERS.includes(tier)) {
      results.push({ email, status: 'error', message: `Unknown tier "${r.tier}" (use active, institutional, corporate, or honorary)` });
      continue;
    }
    const expires = String(r.expires_at ?? '').trim();
    if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
      results.push({ email, status: 'error', message: `Paid-through date "${expires}" is not YYYY-MM-DD` });
      continue;
    }

    let id = byEmail.get(email);
    const existed = Boolean(id);
    if (dryRun) {
      results.push({ email, status: existed ? 'updated' : 'created', message: 'dry run' });
      continue;
    }
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: r.full_name ?? '', tier: tier || 'active' },
      });
      if (error || !data.user) {
        results.push({ email, status: 'error', message: error?.message ?? 'Could not create the login' });
        continue;
      }
      id = data.user.id;
      byEmail.set(email, id);
    }

    // Only the columns the row provides; blank cells leave the profile as is.
    const patch: Record<string, unknown> = { id, email };
    if (r.full_name?.trim()) patch.full_name = r.full_name.trim();
    if (tier) patch.tier = tier;
    if (expires) patch.expires_at = expires;
    if (r.county?.trim()) patch.county = r.county.trim();
    if (r.agency?.trim()) patch.agency = r.agency.trim();
    if (r.cert_level?.trim()) patch.cert_level = r.cert_level.trim();
    const { error: upErr } = await admin.from('profiles').upsert(patch, { onConflict: 'id' });
    if (upErr) {
      results.push({ email, status: 'error', message: upErr.message });
      continue;
    }
    results.push({ email, status: existed ? 'updated' : 'created' });
  }

  const summary = {
    created: results.filter((r) => r.status === 'created').length,
    updated: results.filter((r) => r.status === 'updated').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors: results.filter((r) => r.status === 'error').length,
  };
  return json({ dry_run: dryRun, summary, results });
});
