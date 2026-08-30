import PageHead from '../components/PageHead';
import { contact } from '../content/data';

const sections = [
  {
    h: 'About this site',
    p: `This website is published by the ${contact.legalName}, a ${contact.taxStatus}, to share information about the association, its events, and EMS education in Florida. Content is provided in good faith for general information and may be updated or corrected at any time.`,
  },
  {
    h: 'Membership',
    p: 'Membership classifications, dues, rights, and elections are governed by the association’s bylaws, not by this website. Where the site summarizes membership terms, the bylaws control if the two ever differ.',
  },
  {
    h: 'Member accounts',
    p: 'Portal accounts are issued to current members and are for that member’s own use. Do not share your credentials. The association may suspend accounts that are misused or that belong to lapsed memberships.',
  },
  {
    h: 'External links',
    p: 'The site links to state, federal, and partner-organization resources for convenience. The association does not control those sites and is not responsible for their content.',
  },
  {
    h: 'No warranty',
    p: 'The site is provided as-is. While the association works to keep information accurate and current, it makes no guarantee that every listing, date, or resource is error-free, and is not liable for decisions made in reliance on the site.',
  },
];

export default function Terms() {
  return (
    <>
      <PageHead
        eyebrow="Legal"
        title="Terms of use"
        sub="The ground rules for using this site and the member portal."
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
            <p className="text-muted text-[13.5px] pt-2 border-t border-line">
              {contact.legalName} · Last updated August 2026. Questions:{' '}
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
