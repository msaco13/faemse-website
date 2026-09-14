import { useEffect, useState } from 'react';
import type { Profile } from './portal';
import { membershipState } from './portal';
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
};

const SIGNED_OUT: MemberStatus = { checked: true, signedIn: false, current: false, admin: false };

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
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        const p = (prof ?? null) as Profile | null;
        on &&
          setStatus({
            checked: true,
            signedIn: true,
            current: p?.role === 'admin' || membershipState(p) === 'current',
            admin: p?.role === 'admin',
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
