// Change a member's login email (board, 2026-10-20): Admin → People → the
// person's editor. A login email can only be changed with the service-role
// key, which never ships in the website, so the People editor calls this.
//
// Only board admins: the caller's own session must pass is_admin(); the
// service-role key is used after that. The new address is confirmed on the
// spot (the admin vouches for it), and the profile's email changes with it,
// so the People list, exports and payment matching follow. Nothing is
// emailed from here; the editor can then send the usual set-password link.
//
// Body: { profile_id: uuid, email: string }
// Deploy: supabase functions deploy change-login-email --project-ref iybsnqcffrhzhdpyoaqt

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SITE = 'https://faemse.org';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
  const { data: isAdmin, error: adminErr } = await asCaller.rpc('is_admin');
  if (adminErr || !isAdmin) return json({ error: 'Admins only.' }, 403);

  let body: { profile_id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad payload' }, 400);
  }
  const id = String(body.profile_id ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!UUID.test(id)) return json({ error: 'Pick a person first.' }, 400);
  if (!EMAIL.test(email)) return json({ error: 'That is not a valid email address.' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data: found, error: getErr } = await admin.auth.admin.getUserById(id);
  if (getErr || !found?.user) return json({ error: 'That login was not found.' }, 404);
  const oldEmail = (found.user.email ?? '').toLowerCase();
  if (oldEmail === email) return json({ ok: true, email, unchanged: true });

  // Another login already using the address would make the change fail with
  // a vague message; say plainly whose it is not, just that it is taken.
  const { data: clash } = await admin.from('profiles').select('id').ilike('email', email).neq('id', id).limit(1);
  if (clash && clash.length > 0) return json({ error: 'Another login already uses that email address.' }, 409);

  const { error: updErr } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true });
  if (updErr) {
    const taken = /already|registered|exists/i.test(updErr.message);
    return json({ error: taken ? 'Another login already uses that email address.' : `Could not change it: ${updErr.message}` }, taken ? 409 : 500);
  }
  const { error: profErr } = await admin.from('profiles').update({ email }).eq('id', id);
  if (profErr) console.error(`login ${id} changed to ${email}, but the profile kept the old address: ${profErr.message}`);

  console.log(`login email changed: ${oldEmail} -> ${email} (profile ${id})`);
  return json({ ok: true, old_email: oldEmail, email, profile_updated: !profErr });
});
