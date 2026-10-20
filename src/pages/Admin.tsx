import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import AdminWorkspace from '../components/admin/AdminWorkspace';
import { useMemberStatus } from '../lib/useMemberStatus';

// The header's Admin tab (board, 2026-10-20): one place for everything an
// administrator can change. It is the same workspace as the member portal's
// Board tools tab, opened on the page wording launch pad; nothing was moved
// out of its old place. Shown only to admins, and every write it makes is
// checked by is_admin() in the database, so this page gates nothing itself.
export default function Admin() {
  const status = useMemberStatus();
  return (
    <>
      <PageHead
        id="admin"
        eyebrow="Administrators only"
        title="Admin"
        sub="Everything an administrator can change, in one place. Nothing moved: each tool still works where it does today."
      />
      <section className="py-12 md:py-16 bg-paper min-h-[40vh]">
        <div className="wrap">
          {!status.checked ? (
            <div className="card p-8 text-muted text-[15px]" role="status">
              Checking your account…
            </div>
          ) : status.admin ? (
            <AdminWorkspace defaultTab="wording" />
          ) : (
            <div className="card p-8 md:p-10 max-w-[760px]">
              <h2 className="font-disp font-bold uppercase text-2xl mb-2">Administrators only</h2>
              <p className="text-muted text-[15px] mb-5">
                {status.signedIn
                  ? 'This account is not an administrator. Board members who need admin access can ask the President or the Executive Director.'
                  : 'Sign in with an administrator account to use these tools.'}
              </p>
              {!status.signedIn && (
                <Link to="/login" className="btn-red">
                  Member sign in
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
