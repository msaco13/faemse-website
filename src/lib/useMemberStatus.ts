import { useEffect, useState } from 'react';
import type { MyOrganization, Profile } from './portal';
import { overallState } from './portal';
import { supabase } from './supabase';

export type MemberStatus = {
  checked: boolean;
  signedIn: boolean;
  // Current member or admin — the client-side mirror of what RLS enforces
  // server-side; used only to choose which UI to show.
  current: boolean;
  // Board admin. Also only a UI signal: every admin-only write is gated by
  // is_admin() in the database, so flipping this in a browser gains nothing.
  admin: boolean;
  // For the header's "My portal" button: the member's initials.
  name: string;
};

const SIGNED_OUT: MemberStatus = { checked: true, signedIn: false, current: false, admin: false, name: '' };

export function useMemberStatus(): MemberStatus {
  const [status, setStatus] = useState<MemberStatus>({ ...SIGNED_OUT, checked: false });
  useEffect(() => {
    let on = true;
    // Re-evaluated on every auth change, not just on mount: the site is a
    // single-page app, so signing in on /login and landing on /members never
    // reloads the page. Long-lived consumers (the edit-mode provider, the
    // Board tools bar) would otherwise keep the signed-out answer until the
    // next full reload.
    const evaluate = async (uid: string | undefined) => {
      try {
        if (!uid) {
          on && setStatus(SIGNED_OUT);
          return;
        }
        // Seats count too: someone covered only by their organization's
        // membership is current, the same as is_current_member() decides in
        // the database (60 such people in Oct 2026). A failed org lookup
        // just leaves their own dues to decide.
        const [{ data: prof }, orgs] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
          supabase.rpc('my_organizations'),
        ]);
        const p = (prof ?? null) as Profile | null;
        const myOrgs = (orgs.error ? [] : orgs.data ?? []) as MyOrganization[];
        on &&
          setStatus({
            checked: true,
            signedIn: true,
            // 'grace' counts: bylaws 2.05 keep access for 90 days past the
            // paid-through date, and is_current_member() applies the same
            // window, so the paywall must not appear before the server's does.
            current: p?.role === 'admin' || ['current', 'grace'].includes(overallState(p, myOrgs)),
            admin: p?.role === 'admin',
            name: p?.full_name ?? p?.email ?? '',
          });
      } catch {
        on && setStatus(SIGNED_OUT);
      }
    };
    // supabase-js also fires SIGNED_IN when a tab regains focus; the same
    // user doesn't need their profile fetched again for that.
    let lastUid: string | undefined;
    const check = (uid: string | undefined, force = false) => {
      if (!force && uid && uid === lastUid) return;
      lastUid = uid;
      evaluate(uid);
    };
    supabase.auth.getSession().then(({ data }) => check(data.session?.user.id), () => check(undefined));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') check(session?.user.id);
      else if (event === 'USER_UPDATED') check(session?.user.id, true);
    });
    return () => {
      on = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return status;
}
