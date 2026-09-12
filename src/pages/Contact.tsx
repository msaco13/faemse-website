import { useState } from 'react';
import PageHead from '../components/PageHead';
import { contact } from '../content/data';
import { supabase } from '../lib/supabase';
import { T } from '../lib/text';

export default function Contact() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    // Honeypot: real visitors never see or fill this field. Report success so
    // bots don't learn they were caught, but write nothing.
    if (String(data.website ?? '') !== '') {
      setStatus('sent');
      form.reset();
      return;
    }
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
        id="contact"
        eyebrow="Get in touch"
        title="Contact"
        sub="Questions about membership, events, or EMS education in Florida — we read everything."
      />
      <section className="py-20 bg-paper">
        <div className="wrap grid lg:grid-cols-[1fr_1.2fr] gap-10">
          <div className="space-y-5">
            <div className="card p-7">
              <h2 className="font-disp font-bold uppercase text-xl mb-2">
                <T id="contact.info.h2">Business information</T>
              </h2>
              <p className="text-muted text-[15px]">{contact.legalName}</p>
              <p className="text-muted text-[15px]">
                <T id="contact.info.tax">{contact.taxStatus}</T>
              </p>
              <p className="text-muted text-[15px] mt-3">{contact.address}</p>
              <a className="font-bold text-brand-blue hover:underline" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            </div>
            <div className="card p-7">
              <h2 className="font-disp font-bold uppercase text-xl mb-2">
                <T id="contact.follow.h2">Follow us</T>
              </h2>
              <div className="flex flex-col gap-2">
                <a className="font-semibold text-brand-blue hover:underline" href={contact.facebook} target="_blank" rel="noreferrer">
                  <T id="contact.follow.facebook">Facebook ↗</T>
                </a>
                <a className="font-semibold text-brand-blue hover:underline" href={contact.linkedin} target="_blank" rel="noreferrer">
                  <T id="contact.follow.linkedin">LinkedIn ↗</T>
                </a>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="card p-8">
            <h2 className="font-disp font-bold uppercase text-2xl mb-5">
              <T id="contact.form.h2">Send us a message</T>
            </h2>
            <div className="absolute w-px h-px overflow-hidden [clip:rect(0,0,0,0)]" aria-hidden>
              <label>
                Leave this field empty
                <input name="website" type="text" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="text-[13px] font-bold uppercase tracking-wide text-muted">
                  <T id="contact.form.name.label">Name</T>
                </span>
                <input name="name" required maxLength={120} className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 focus:border-brand-blue outline-none" />
              </label>
              <label className="block">
                <span className="text-[13px] font-bold uppercase tracking-wide text-muted">
                  <T id="contact.form.email.label">Email</T>
                </span>
                <input name="email" type="email" required maxLength={254} className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 focus:border-brand-blue outline-none" />
              </label>
            </div>
            <label className="block mb-4">
              <span className="text-[13px] font-bold uppercase tracking-wide text-muted">
                <T id="contact.form.subject.label">Subject</T>
              </span>
              <input name="subject" required maxLength={200} className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 focus:border-brand-blue outline-none" />
            </label>
            <label className="block mb-6">
              <span className="text-[13px] font-bold uppercase tracking-wide text-muted">
                <T id="contact.form.message.label">Message</T>
              </span>
              <textarea name="message" required maxLength={4000} rows={5} className="mt-1.5 w-full rounded-xl border border-line px-4 py-3 focus:border-brand-blue outline-none" />
            </label>
            <button type="submit" disabled={status === 'sending'} className="btn-red w-full disabled:opacity-60">
              {status === 'sending' ? (
                <T id="contact.form.submit.sending">Sending…</T>
              ) : (
                <T id="contact.form.submit">Send message</T>
              )}
            </button>
            {status === 'sent' && (
              <p className="mt-4 text-[#0E7A4A] font-semibold" role="status">
                <T id="contact.form.sent">Message sent — we&apos;ll get back to you soon.</T>
              </p>
            )}
            {status === 'error' && (
              <p className="mt-4 text-brand-red font-semibold" role="alert">
                <T id="contact.form.error.a">Something went wrong sending your message. Email us directly at</T>{' '}
                {contact.email}
                <T id="contact.form.error.b">.</T>
              </p>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
