import { useState } from 'react';
import PageHead from '../components/PageHead';
import { contact } from '../content/data';
import { supabase } from '../lib/supabase';

export default function Contact() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus('sending');
    const { error } = await supabase.from('contact_messages').insert({
      name: String(data.name),
      email: String(data.email),
      subject: String(data.subject),
      message: String(data.message),
    });
    if (error) {
      setStatus('error');
    } else {
      setStatus('sent');
      form.reset();
    }
  }

  return (
    <>
      <PageHead
        eyebrow="Get in touch"
        title="Contact"
        sub="Questions about membership, events, or EMS education in Florida — we read everything."
      />
      <section className="py-20 bg-paper">
        <div className="wrap grid lg:grid-cols-[1fr_1.2fr] gap-10">
          <div className="space-y-5">
            <div className="card p-7">
              <h2 className="font-disp font-bold uppercase text-xl mb-2">Business information</h2>
              <p className="text-muted text-[15px]">{contact.legalName}</p>
              <p className="text-muted text-[15px]">{contact.taxStatus}</p>
              <p className="text-muted text-[15px] mt-3">{contact.address}</p>
              <a className="font-bold text-brand-blue hover:underline" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            </div>
            <div className="card p-7">
              <h2 className="font-disp font-bold uppercase text-xl mb-2">Follow us</h2>
              <div className="flex flex-col gap-2">
                <a className="font-semibold text-brand-blue hover:underline" href={contact.facebook} target="_blank" rel="noreferrer">
                  Facebook ↗
                </a>
                <a className="font-semibold text-brand-blue hover:underline" href={contact.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn ↗
                </a>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="card p-8">
            <h2 className="font-disp font-bold uppercase text-2xl mb-5">Send us a message</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="text-[13px] font-bold uppercase tracking-wide text-muted">Name</span>
                <input name="name" required className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 focus:border-brand-blue outline-none" />
              </label>
              <label className="block">
                <span className="text-[13px] font-bold uppercase tracking-wide text-muted">Email</span>
                <input name="email" type="email" required className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 focus:border-brand-blue outline-none" />
              </label>
            </div>
            <label className="block mb-4">
              <span className="text-[13px] font-bold uppercase tracking-wide text-muted">Subject</span>
              <input name="subject" required className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 focus:border-brand-blue outline-none" />
            </label>
            <label className="block mb-6">
              <span className="text-[13px] font-bold uppercase tracking-wide text-muted">Message</span>
              <textarea name="message" required rows={5} className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 focus:border-brand-blue outline-none" />
            </label>
            <button type="submit" disabled={status === 'sending'} className="btn-red w-full disabled:opacity-60">
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>
            {status === 'sent' && (
              <p className="mt-4 text-[#0E7A4A] font-semibold">Message sent — we&apos;ll get back to you soon.</p>
            )}
            {status === 'error' && (
              <p className="mt-4 text-brand-red font-semibold">
                Something went wrong sending your message. Email us directly at {contact.email}.
              </p>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
