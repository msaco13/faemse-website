import PageHead from '../components/PageHead';
import { contact } from '../content/data';

const sections = [
  {
    h: 'What we collect',
    p: 'If you use the contact form, we store the name, email address, subject, and message you submit so the board can respond. If you hold a member account, we store your login email and the profile details you choose to provide. This site does not run advertising or third-party tracking.',
  },
  {
    h: 'How we use it',
    p: 'Contact submissions are used only to reply to you. Member account information is used to operate the member portal and administer your membership. We do not sell, rent, or share personal information with third parties.',
  },
  {
    h: 'Where it lives',
    p: 'Site data is stored with our hosting and database provider (Supabase) under access controls limited to the association. Passwords are handled by the authentication provider and are never visible to the association.',
  },
];

export default function Privacy() {
  return (
    <>
      <PageHead
        eyebrow="Legal"
        title="Privacy policy"
        sub="What this site collects, why, and the choices you have."
      />
      <section className="py-20 bg-paper">
        <div className="wrap max-w-[760px]">
          <div className="card p-8 space-y-7">
            {sections.map((s) => (
              <div key={s.h}>
                <h2 className="font-disp font-bold uppercase text-xl mb-2">{s.h}</h2>
                <p className="text-muted text-[15.5px]">{s.p}</p>
              </div>
            ))}
            <div>
              <h2 className="font-disp font-bold uppercase text-xl mb-2">Your choices</h2>
              <p className="text-muted text-[15.5px]">
                You can ask us to correct or delete information we hold about you at any time —
                email{' '}
                <a className="font-semibold text-brand-blue hover:underline" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
                . Deleting a member account ends portal access; membership itself is governed by the
                association&apos;s bylaws.
              </p>
            </div>
            <p className="text-muted text-[13.5px] pt-2 border-t border-line">
              {contact.legalName} · Last updated August 2026. Questions about this policy:{' '}
              <a className="font-semibold text-brand-blue hover:underline" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
