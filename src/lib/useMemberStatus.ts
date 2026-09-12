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
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id;
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
    })();
    return () => {
      on = false;
    };
  }, []);
  return status;
}
