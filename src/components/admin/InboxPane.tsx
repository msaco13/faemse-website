import { useState } from 'react';
import type { Application, ContactMessage, Profile } from '../../lib/portal';
import { duesCents, formatDate } from '../../lib/portal';
import { supabase } from '../../lib/supabase';

// Applications and contact-form messages that still need a decision. The
// data and the actions are the ones the old Board admin card carried at its
// top; here they have a tab of their own so nothing sits unseen.

const statusChip: Record<Application['status'], string> = {
  new: 'text-[#1A47B8] bg-[#E7EEFF]',
  approved: 'text-[#0E7A4A] bg-[#E2F7EC]',
  declined: 'text-muted bg-paper',
};

export default function InboxPane({
  applications,
  messages,
  members,
  onChanged,
  onError,
}: {
  applications: Application[];
  messages: ContactMessage[];
  members: Profile[];
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [showHandled, setShowHandled] = useState(false);
  const [showDecided, setShowDecided] = useState(false);

  // A renewal form from someone who already has a member record: one button
  // approves it and records the payment (the board clicks it once the check
  // or transfer is in hand).
  const memberByEmail = new Map(members.map((m) => [String(m.email ?? '').toLowerCase(), m]));

  async function setHandled(id: string, handled: boolean) {
    const { error } = await supabase.from('contact_messages').update({ handled }).eq('id', id);
    if (error) onError(error.message);
    else onChanged();
  }

  async function setAppStatus(id: string, status: Application['status']) {
    const { error } = await supabase.from('membership_applications').update({ status }).eq('id', id);
    if (error) onError(error.message);
    else onChanged();
  }

  async function approvePaid(a: Application) {
    const m = memberByEmail.get(a.email.toLowerCase());
    if (!m) return;
    const { error } = await supabase.rpc('admin_record_payment', {
      p_target: m.id,
      p_method: 'other',
      p_amount_cents: duesCents(m.tier),
      p_note: `Renewal form ${formatDate(a.created_at)}`,
      p_months: 12,
    });
    if (error) {
      onError(error.message);
      return;
    }
    await setAppStatus(a.id, 'approved');
  }

  const openApps = applications.filter((a) => a.status === 'new');
  const decidedApps = applications.filter((a) => a.status !== 'new');
  const openMsgs = messages.filter((m) => !m.handled);
  const handledMsgs = messages.filter((m) => m.handled);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h3 className="font-disp font-bold uppercase text-2xl">Inbox</h3>
        <p className="text-muted text-[13px]">Applications and contact messages that still need a decision. Newest first.</p>
      </div>
      <p className="text-muted text-[13.5px] mb-5 max-w-[80ch]">
        Approving an application does not create the person&apos;s login on its own. Use &ldquo;Add a person&rdquo; under
        People for that, then record their payment on their row.
      </p>

      <h4 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted mb-2">
        Applications
        {openApps.length > 0 && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full text-brand-red bg-[#FDEAEB]">{openApps.length} new</span>}
      </h4>
      {openApps.length === 0 && !showDecided ? (
        <p className="text-muted text-[14px] mb-2">Nothing waiting.</p>
      ) : (
        <div className="border border-line rounded-2xl overflow-hidden mb-2">
          {[...openApps, ...(showDecided ? decidedApps : [])].map((a) => (
            <div key={a.id} className={`grid md:grid-cols-[1.5fr_auto_auto] gap-3 items-center px-5 py-4 border-b border-line last:border-b-0 ${a.status !== 'new' ? 'opacity-70' : ''}`}>
              <div className="min-w-0">
                <b className="block text-[14.5px]">
                  {a.full_name}
                  <span className="ml-2 font-normal text-muted text-[13px]">
                    {a.kind === 'renew' ? 'renewal' : 'new'} · {a.tier}
                  </span>
                </b>
                <span className="text-[13px] text-muted block truncate">
                  {a.email}
                  {a.organization ? ` · ${a.organization}` : ''}
                  {a.county ? ` · ${a.county}` : ''}
                </span>
                {a.note && <span className="text-[13px] text-muted block truncate">&ldquo;{a.note}&rdquo;</span>}
              </div>
              <span className="text-[13px] text-muted">{formatDate(a.created_at)}</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-bold tracking-[0.09em] uppercase px-2.5 py-1 rounded-full ${statusChip[a.status]}`}>{a.status}</span>
                {a.status === 'new' && (
                  <>
                    {a.kind === 'renew' && memberByEmail.has(a.email.toLowerCase()) && (
                      <button onClick={() => approvePaid(a)} className="btn-outline !py-1.5 !px-3.5 text-[12.5px]" title="Records the dues payment and extends their membership a year">
                        Paid · +1 year
                      </button>
                    )}
                    <button onClick={() => setAppStatus(a.id, 'approved')} className="btn-outline !py-1.5 !px-3.5 text-[12.5px]">
                      Approve
                    </button>
                    <button onClick={() => setAppStatus(a.id, 'declined')} className="text-muted font-semibold text-[12.5px] hover:text-ink">
                      Decline
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {decidedApps.length > 0 && (
        <button onClick={() => setShowDecided(!showDecided)} className="text-muted font-semibold text-[12.5px] hover:text-ink mb-6 block">
          {showDecided ? 'Hide decided applications' : `Show ${decidedApps.length} decided`}
        </button>
      )}

      <h4 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted mt-6 mb-2">
        Contact-form messages
        {openMsgs.length > 0 && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full text-brand-red bg-[#FDEAEB]">{openMsgs.length} new</span>}
      </h4>
      {openMsgs.length === 0 && !showHandled ? (
        <p className="text-muted text-[14px] mb-2">
          {messages.length === 0 ? 'No messages yet — anything sent through the Contact page lands here.' : 'All caught up — every message is handled.'}
        </p>
      ) : (
        <div className="border border-line rounded-2xl overflow-hidden mb-2">
          {[...openMsgs, ...(showHandled ? handledMsgs : [])].map((m) => (
            <div key={m.id} className={`px-5 py-4 border-b border-line last:border-b-0 ${m.handled ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                <b className="text-[14.5px]">
                  {m.subject || '(no subject)'}
                  <span className="ml-2 font-normal text-muted text-[13px]">
                    from {m.name} · {m.email}
                  </span>
                </b>
                <span className="text-[13px] text-muted">{formatDate(m.created_at)}</span>
              </div>
              <p className="text-[14px] text-body whitespace-pre-line max-w-[80ch] mb-2">{m.message}</p>
              <div className="flex items-center gap-3">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'your message to FAEMSE'}`)}`} className="btn-outline !py-1.5 !px-3.5 text-[12.5px]">
                  Reply by email
                </a>
                <button onClick={() => setHandled(m.id, !m.handled)} className="text-muted font-semibold text-[12.5px] hover:text-ink">
                  {m.handled ? 'Mark as new' : 'Mark handled'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {handledMsgs.length > 0 && (
        <button onClick={() => setShowHandled(!showHandled)} className="text-muted font-semibold text-[12.5px] hover:text-ink block">
          {showHandled ? 'Hide handled messages' : `Show ${handledMsgs.length} handled`}
        </button>
      )}
    </div>
  );
}
