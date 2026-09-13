// Verified content from the live faemse.org crawl (Aug 2026) unless marked SAMPLE.

// Flip to true only after President Anzardo signs off on the events calendar,
// news posts, association statistics, and his welcome message. While false,
// sample sections are hidden or visibly labeled as previews on the public site.
export const CONTENT_VERIFIED = false;

// Composition per bylaws 5.02: President, President-Elect, Immediate Past
// President, Secretary, and three Members-at-Large (seven voting seats). The
// EMS Educator representative to the state EMS Advisory Council sits ex
// officio without a vote (5.02.01). The Executive Director is appointed staff
// (9.05), not a director. Names confirmed current by the board, Sept 2026.
// Headshots and personal bios still to come from the board.
export type BoardMember = {
  role: string;
  name: string;
  blurb: string;
  kind: 'officer' | 'director' | 'staff';
};

const atLarge = 'One of three directors elected by the Active membership to represent it on the board.';

export const board: BoardMember[] = [
  {
    kind: 'officer',
    role: 'President',
    name: 'Jorge Anzardo',
    blurb:
      'Chief executive officer of the association. Presides at board and membership meetings, conducts its routine business with the Executive Director, and sits ex officio on every committee.',
  },
  {
    kind: 'officer',
    role: 'President-Elect',
    name: 'Bryan Spangler',
    blurb:
      'Acts for the President whenever the President is absent, and succeeds to the presidency at the end of the term.',
  },
  {
    kind: 'officer',
    role: 'Secretary',
    name: 'Rochelle Goldberg',
    blurb:
      'Custodian of the association\'s records and minutes. Reviews membership applications, sends the notices the bylaws require, and oversees elections.',
  },
  {
    kind: 'director',
    role: 'Immediate Past President',
    name: 'Melissa McNally',
    blurb:
      'Advisor to the board and chair of the Nominating Committee. Also the EMS Educator representative to the Florida EMS Advisory Council, an ex officio, non-voting seat under the bylaws.',
  },
  { kind: 'director', role: 'Member-at-Large', name: 'Matt Keeler', blurb: atLarge },
  { kind: 'director', role: 'Member-at-Large', name: 'Garth Richards', blurb: atLarge },
  { kind: 'director', role: 'Member-at-Large', name: 'Carlos Tavarez', blurb: atLarge },
  {
    kind: 'staff',
    role: 'Executive Director',
    name: 'James Dinsch',
    blurb:
      'Appointed by the board as chief operating officer. Runs day-to-day operations: finances, records, dues, and this website. Attends board meetings; not a voting director.',
  },
];

// Four classes of membership under bylaws 2.02. Dues are set by the board
// (4.01); these amounts were confirmed by the board in Sept 2026. Honorary
// carries no dues and is described separately below.
export const tiers = [
  {
    name: 'Active',
    who: 'Individuals who plan, supervise, teach, or practice out-of-hospital care',
    price: '$50',
    per: '/ year',
    featured: true,
    perks: [
      'Vote in elections and hold office',
      'Serve on and chair committees',
      'Nominate and vote for EMS Educator of the Year',
      'Q&A archive, teaching videos, and the member library',
    ],
  },
  {
    name: 'Institutional',
    who: 'Organizations that plan, supervise, teach, or practice out-of-hospital care: colleges, academies, EMS programs',
    price: '$250',
    per: '/ year',
    featured: false,
    perks: [
      'Up to five named representatives',
      'Each qualifying representative holds full Active privileges',
      'Vote, hold office, and serve on committees',
      'Archive, videos, and library for every representative',
    ],
  },
  {
    name: 'Corporate',
    who: 'Companies, associations, and government agencies with an interest in EMS',
    price: '$200',
    per: '/ year',
    featured: false,
    perks: [
      'Up to three named representatives',
      'Serve on committees (non-voting)',
      'Recognized as a corporate sponsor on this site',
      'Archive, videos, and library access',
    ],
  },
];

// Bylaws 2.02.02. Not a tier anyone applies for.
export const honorary = {
  name: 'Honorary',
  who: 'Elected by the Board of Directors for outstanding dedication to EMS and the association; members may nominate. A lifetime title with no dues. Honorary members do not vote, hold office, or chair committees.',
};

// Membership terms the site states in plain words. Sources: board decision
// (12-month term), bylaws 4.01 (dues notice) and 2.05 (90-day revocation).
export const membershipTerms = [
  'Membership runs twelve months from your last dues payment.',
  'Dues are set by the Board of Directors. Any change is announced to members 30 days before it takes effect.',
  'If dues go unpaid, you keep member access for 90 days after your term ends. After that the bylaws allow the membership to be revoked.',
  'Applications are reviewed by the Secretary under the bylaws. An applicant who is denied may appeal to the Board of Directors.',
];

export const resourceCategories = [
  {
    category: 'Accreditation & Standards',
    links: [
      { name: 'CoAEMSP', url: 'https://coaemsp.org' },
      { name: 'CAAHEP', url: 'https://www.caahep.org' },
      { name: 'National Registry of EMTs (NREMT)', url: 'https://www.nremt.org' },
    ],
  },
  {
    category: 'State & Federal',
    links: [
      { name: 'Florida DOH — EMS Section', url: 'https://www.floridahealth.gov/licensing-and-regulation/ems-system/index.html' },
      { name: 'NHTSA Office of EMS', url: 'https://www.ems.gov' },
      { name: 'FICEMS', url: 'https://www.ems.gov/ficems.html' },
    ],
  },
  {
    category: 'Professional Organizations',
    links: [
      { name: 'NAEMSE', url: 'https://naemse.org' },
      { name: 'NAEMSP', url: 'https://naemsp.org' },
      { name: 'ACEP', url: 'https://www.acep.org' },
      { name: 'FAEMSE Foundation', url: 'https://www.faemsefoundation.org' },
    ],
  },
  {
    category: 'Curriculum & Education',
    links: [
      // Deep links to ems.gov/education.html and naemse.org/resources broke after
      // both sites reorganized (Aug 2026); pointing at the working top-level pages
      // until the association confirms the new permanent URLs.
      { name: 'National EMS Education Standards (EMS.gov)', url: 'https://www.ems.gov' },
      { name: 'CAPCE (formerly CECBEMS)', url: 'https://capce.org' },
      { name: 'NAEMSE Educator Resources', url: 'https://naemse.org' },
    ],
  },
];

// Corporate sponsors are the association's Corporate members (bylaws
// 2.02.03). List confirmed by the board, Sept 2026. `logo` names a file in
// public/sponsors/ (webp), or null until the company supplies one; the site
// then shows the name in its place.
export const sponsors: { name: string; logo: string | null }[] = [
  { name: '3B Scientific', logo: null },
  { name: 'American Medical Academy', logo: 'ama' },
  { name: 'Braxton College', logo: null },
  { name: 'Coral Springs Regional Institute of Public Safety', logo: 'csrips' },
  { name: 'Dinsch Consulting Group', logo: null },
  { name: 'Emergency Education Institute', logo: 'eei' },
  { name: 'Emergency Educational Training Institute, Inc.', logo: 'eeti' },
  { name: 'EMETSEEI Institute, Inc.', logo: 'emetseei' },
  { name: 'First Response Training Group', logo: null },
  { name: 'Henry Schein', logo: 'henry-schein' },
  { name: 'Limmer Education', logo: null },
  { name: 'Medical Career Academy', logo: 'mca' },
  { name: 'Platinum Education Group', logo: 'platinum-ed' },
  { name: 'Public Safety Group', logo: 'jblpsg' },
  { name: 'Southeastern Medical Academy', logo: 'sema' },
  { name: 'The Rescue Company 1', logo: 'the-rescco' },
];

// ---------------------------------------------------------------------------
// Sample listings carry dates relative to today, so placeholders never look
// stale — a sample calendar full of "recently held" events is exactly the
// abandoned look the rebuild exists to avoid.
export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function shift(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}
const longDate = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const monthYear = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
const ymd = (d: Date) => ({
  day: String(d.getDate()).padStart(2, '0'),
  month: MONTHS[d.getMonth()],
  year: String(d.getFullYear()),
});

// SAMPLE listings — replace with the association's real 2026-27 calendar.
export const events = [
  {
    ...ymd(shift(-19)),
    title: 'Summer Membership Meeting',
    detail: 'Association business, state updates, open floor',
    location: 'Virtual · Zoom',
    tag: 'Meeting',
    tagColor: 'blue',
    url: '',
  },
  {
    ...ymd(shift(24)),
    title: 'Educator & Student Success Workshop',
    detail: 'Full-day, hands-on · CE hours available',
    location: 'Orlando, FL',
    tag: 'Workshop',
    tagColor: 'red',
    url: '',
  },
  {
    ...ymd(shift(37)),
    title: 'NREMT Pass-Rate Strategies',
    detail: 'What high-performing programs do differently',
    location: 'Webinar',
    tag: 'Free · Members',
    tagColor: 'green',
    url: '',
  },
  {
    ...ymd(shift(66)),
    title: 'ALS Student Competition',
    detail: 'Team scenarios, judged by veteran educators',
    location: 'Tampa, FL',
    tag: 'Competition',
    tagColor: 'gold',
    url: '',
  },
];

export function eventDate(e: { day: string; month: string; year: string }): Date {
  return new Date(Number(e.year), MONTHS.indexOf(e.month.toUpperCase()), Number(e.day));
}

export function upcomingEvents(): typeof events {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return [...events]
    .filter((e) => eventDate(e) >= today)
    .sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime());
}

export function pastEvents(): typeof events {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return [...events]
    .filter((e) => eventDate(e) < today)
    .sort((a, b) => eventDate(b).getTime() - eventDate(a).getTime());
}

// SAMPLE posts — replace with real association news.
export const news = [
  {
    date: longDate(shift(-12)),
    tag: 'Awards',
    title: 'EMS Educator of the Year nominations open',
    excerpt:
      'Seven categories, one standard: educators whose students are measurably better for having been in their classroom.',
    body: '',
  },
  {
    date: longDate(shift(-27)),
    tag: 'Resources',
    title: 'New toolkit: aligning your program to the current Education Standards',
    excerpt:
      'A members-only crosswalk for mapping curriculum to the latest National EMS Education Standards.',
    body: '',
  },
  {
    date: longDate(shift(-46)),
    tag: 'Board',
    title: 'New directors join the FAEMSE board',
    excerpt:
      'Meet the educators stepping into leadership this term — and the priorities guiding the association.',
    body: '',
  },
];

// SAMPLE job postings — the board replaces these with real openings as it
// hears of them. Placement is one of the three CoAEMSP program metrics, so
// the job board is public on purpose.
export const sampleJobs = [
  {
    posted: longDate(shift(-21)),
    closes: longDate(shift(75)),
    title: 'Paramedic Program Director',
    employer: 'State College EMS Academy',
    location: 'Tampa, FL',
    description:
      'CAAHEP-accredited program seeks a director. Bachelor’s required (master’s preferred), CoAEMSP workshop within 15 months, Florida instructor credentials.',
    applyUrl: '',
  },
  {
    posted: longDate(shift(-13)),
    closes: longDate(shift(90)),
    title: 'EMT Lead Instructor (nights)',
    employer: 'Gulf Coast Technical College',
    location: 'Fort Myers, FL',
    description:
      'Evening cohort, three nights a week. Teaching experience preferred; mentorship from the senior faculty provided.',
    applyUrl: '',
  },
  {
    posted: longDate(shift(-8)),
    closes: longDate(shift(45)),
    title: 'Clinical Coordinator',
    employer: 'Broward Fire Academy',
    location: 'Davie, FL',
    description:
      'Owns clinical site agreements, student rotations, and preceptor relationships across three hospital systems.',
    applyUrl: '',
  },
];

// SAMPLE class listings — schools email offerings and the board posts them.
export const sampleClasses = [
  {
    posted: longDate(shift(-18)),
    starts: longDate(shift(120)),
    closes: longDate(shift(120)),
    title: 'Spring Paramedic Cohort — applications open',
    provider: 'Central Florida EMS Institute',
    location: 'Orlando, FL',
    description: 'Day program, 12 months, NREMT-P eligible. Application window closes when the cohort fills.',
    contact: 'admissions@example.edu',
  },
  {
    posted: longDate(shift(-11)),
    starts: longDate(shift(33)),
    closes: longDate(shift(33)),
    title: 'EMS Instructor Level A/B Course',
    provider: 'Suncoast Training Group',
    location: 'St. Petersburg, FL',
    description: 'State-recognized instructor qualification course. Two weekends plus online modules.',
    contact: 'training@example.com',
  },
];

// SAMPLE Q&A entries — the archive launches with distilled listserv threads.
export const sampleQa = [
  {
    date: monthYear(shift(-10)),
    topic: 'Program Director',
    question: 'A new program director just took over — what deadlines are already running?',
    answer:
      'Two clocks start immediately: CoAEMSP must be notified of the personnel change within 30 calendar days, and the new director must complete the required workshop within 15 months of assuming the role. Verify both against current CoAEMSP standards — the details change. The program director starter guide on this site walks through the first 90 days.',
  },
  {
    date: monthYear(shift(-40)),
    topic: 'Clinical',
    question: 'How are other programs handling clinical site competition in metro areas?',
    answer:
      'Consensus from the thread: diversify beyond the big hospital systems (free-standing EDs, interfacility transport services), formalize preceptor recognition so sites see value, and coordinate rotation calendars with neighboring programs instead of competing for the same weeks.',
  },
  {
    date: monthYear(shift(-70)),
    topic: 'Teaching',
    question: 'What actually moves NREMT pass rates for a struggling cohort?',
    answer:
      'The recurring answers: item-writing practice for faculty (most program exams under-prepare students for NREMT-style questions), early identification using unit exam data rather than waiting for the final, and structured remediation with a contract — not open-ended “study more.”',
  },
  {
    date: monthYear(shift(-100)),
    topic: 'State & Policy',
    question: 'Where do Florida rule changes actually get announced?',
    answer:
      'The state EMS office publishes through the Florida DoH EMS section page and the advisory council meeting cycle — there is no RSS feed, so FAEMSE summarizes anything affecting educators in the news feed on this site, with a line of plain-English context.',
  },
];

// Teaching videos: the president has parked this until instructors are lined
// up, so there are no sample titles — the page shows its in-development state.
export const sampleVideos: { topic: string; title: string; presenter: string; minutes: number }[] = [];

// Evergreen homepage spotlights, used only if the spotlights table can't be
// reached. The live set (board-editable) lives in Supabase.
export const fallbackSpotlights = [
  {
    kicker: 'EMS Educator of the Year',
    title: 'Seven categories. One standard.',
    body: 'Every year FAEMSE honors the educators whose students are measurably better for having been in their classroom. Nominations are open to Active members.',
    imageUrl: '',
    videoUrl: '',
    linkUrl: '/about',
    linkLabel: 'About the award',
  },
  {
    kicker: 'New program director?',
    title: 'Your compliance clocks are already running.',
    body: 'Thirty days to notify CoAEMSP, fifteen months for the required workshop — and a first-90-days checklist built by directors who have done the job.',
    imageUrl: '',
    videoUrl: '',
    linkUrl: '/program-directors',
    linkLabel: 'Read the starter guide',
  },
  {
    kicker: 'The archive',
    title: 'Questions answered once. Kept for good.',
    body: 'Real questions from Florida educators, distilled by the board and searchable by topic — so knowledge stops evaporating with the listserv.',
    imageUrl: '',
    videoUrl: '',
    linkUrl: '/qa',
    linkLabel: 'Search the archive',
  },
];

export const faq = [
  {
    q: 'Who can become a member?',
    a: 'Anyone involved or interested in the education and training of EMS and out-of-hospital personnel: instructors, program directors, training officers, preceptors, agency educators, and the institutions and companies that support them. Applicants are considered without regard to race, age, gender, creed, or color.',
  },
  {
    q: 'What does membership cost?',
    a: 'Active (individual) membership is $50 a year. Institutional membership is $250 a year and covers up to five representatives with Active privileges. Corporate membership is $200 a year with up to three representatives. Honorary membership is by board election and carries no dues. Dues are set by the board, and any change is announced to members 30 days before it takes effect.',
  },
  {
    q: 'How long does membership last?',
    a: 'Twelve months from your last dues payment. If dues go unpaid, you keep member access for 90 days after your term ends; after that the bylaws allow the membership to be revoked.',
  },
  {
    q: 'How are applications handled?',
    a: 'The Secretary or a designee reviews each application under the bylaws. Approved members are invoiced for dues and set up with a portal account. An applicant who is denied may appeal to the Board of Directors.',
  },
  {
    q: 'When and where does the association meet?',
    a: 'Regular membership meetings are held through the year, usually alongside Florida\'s statewide EMS conferences, and the annual meeting is held mid-year. Dates and locations post to the calendar as the board confirms them.',
  },
  {
    q: 'How do I get involved beyond attending?',
    a: 'Active members in good standing may run for the board. Members-at-Large are elected by ballot in odd-numbered years; the President-Elect and Secretary in even-numbered years, and the President-Elect succeeds to the presidency. You can also serve on a committee, record a short teaching video, contribute to the program director guide, judge a student competition, or present at a workshop.',
  },
];

// The public outline of the bylaws, one entry per article of the current
// revision (September 10, 2021). The full text is members-only, in the portal.
export const bylawsOutline = [
  {
    article: 'Article 1',
    title: 'Introduction and name',
    text: 'The Florida Association of Emergency Medical Services Educators, a Florida not-for-profit 501(c)(6) corporation. Mission: to provide resources to individuals and organizations that will foster excellence in EMS education and training. Vision: to be the foremost resource within Florida\'s EMS educational community.',
  },
  {
    article: 'Article 2',
    title: 'Membership',
    text: 'Open to anyone involved or interested in EMS and out-of-hospital education, without regard to race, age, gender, creed, or color. Four classes: Active, Honorary, Corporate, and Institutional. Applications are reviewed by the Secretary; a denial may be appealed to the board. Membership may be revoked once dues are 90 days past due.',
  },
  {
    article: 'Article 3',
    title: 'Meetings',
    text: 'Regular meetings are usually held in conjunction with the Florida EMS Advisory Council and constituency group meetings. The annual meeting is held mid-year.',
  },
  {
    article: 'Article 4',
    title: 'Dues',
    text: 'Set by the Board of Directors from the annual operating budget. Any change is communicated to the membership 30 days before it takes effect.',
  },
  {
    article: 'Article 5',
    title: 'Board of Directors',
    text: 'Seven voting seats: President, President-Elect, Immediate Past President, Secretary, and three Members-at-Large. The EMS Educator representative to the state EMS Advisory Council sits ex officio without a vote. Directors must be Active members in good standing, serve two-year terms, and are elected by ballot in odd-numbered years. Half the board is a quorum; meetings follow Robert\'s Rules of Order.',
  },
  {
    article: 'Article 6',
    title: 'Officers',
    text: 'President, President-Elect, and Secretary, elected by the membership in even-numbered years for two-year terms; the President-Elect succeeds to the presidency. The Secretary may serve two consecutive terms. No director or committee member is paid for serving.',
  },
  {
    article: 'Article 7',
    title: 'Committees',
    text: 'Three standing committees, Primary Education, Continuing Education, and Preceptor / Training Officer, plus ad hoc committees. Chairs are Active members in good standing appointed by the President for two-year terms, and together form the President\'s Council.',
  },
  {
    article: 'Article 8',
    title: 'Liaisons and representatives',
    text: 'The President appoints liaisons to organizations with similar goals. Outside organizations may send non-voting representatives to board meetings.',
  },
  {
    article: 'Article 9',
    title: 'Operations',
    text: 'The Executive Director, appointed by the board as chief operating officer, runs day-to-day operations: finances, records, dues, and the website. The fiscal year is January 1 to December 31.',
  },
  {
    article: 'Article 10',
    title: 'Amendments',
    text: 'Proposed amendments are submitted in writing and posted for review for 30 days before a vote. Adoption requires a two-thirds majority of the Active members voting.',
  },
  {
    article: 'Article 11',
    title: 'Prohibition of dividends',
    text: 'No part of the association\'s net earnings may benefit any member, officer, or private person.',
  },
  {
    article: 'Article 12',
    title: 'Finances',
    text: 'The board sets a budget for each fiscal year and operates under generally accepted accounting principles.',
  },
  {
    article: 'Article 13',
    title: 'Notice and waiver of notice',
    text: 'Notice may be given by mail, telephone, email, or other written or electronic means, and may be waived in writing.',
  },
  {
    article: 'Article 14',
    title: 'Indemnification and liability',
    text: 'The association indemnifies its directors, officers, and agents to the fullest extent of Florida law. Members are not liable for the association\'s debts.',
  },
  {
    article: 'Article 15',
    title: 'Termination',
    text: 'The association may be dissolved by a three-fourths vote of the board. Remaining assets go to organizations exempt under Section 501(c)(3).',
  },
];

export const bylawsHistory = [
  { date: 'November 29, 1997', event: 'Initially prepared' },
  { date: 'May 23, 1998', event: 'Adopted' },
  { date: 'January 23, 2008', event: 'Revised' },
  { date: 'June 29, 2009', event: 'Revised' },
  { date: 'April 2010', event: 'Revised' },
  { date: 'January 23, 2019', event: 'Revised' },
  { date: 'September 10, 2021', event: 'Revised. Current edition.' },
];

// DRAFT welcome message — for President Anzardo to approve or rewrite in his own words.
export const presidentMessage = {
  name: 'Jorge Anzardo',
  role: 'President, FAEMSE',
  quote:
    'Every EMT and paramedic in Florida can be traced back to an educator who refused to accept ‘good enough.’ This association exists so that none of those educators ever has to raise the standard alone.',
};

// The Educator of the Year program — seven categories honored annually.
// (Category names to be confirmed with the association before publishing.)
export const honors = {
  title: 'EMS Educator of the Year',
  categories: 7,
  blurb:
    'Seven categories, one standard: educators whose students are measurably better for having been in their classroom. Nominated by peers, honored by the association, announced each year.',
};

export const contact = {
  legalName: 'Florida Association of Emergency Medical Services Educators, Inc.',
  taxStatus: '501(c)(6) not-for-profit corporation',
  address: '7901 4th Street #9219, St. Petersburg, FL 33702',
  // The association's official address (faemse.org mail is hosted on
  // Microsoft 365). Until the board confirms who monitors it, action emails
  // from the site also copy the interim board inbox below so nothing is lost.
  email: 'info@faemse.org',
  boardCc: 'Jlanzardo@gmail.com,Mbsaco13@gmail.com',
  facebook: 'https://www.facebook.com/flemseducators',
  linkedin: 'https://www.linkedin.com/company/florida-association-of-ems-educators/',
};

// mailto for the site's "send us X" buttons: official address, board copied.
// `subject` should already be URL-encoded.
export function mailto(subject: string): string {
  return `mailto:${contact.email}?cc=${encodeURIComponent(contact.boardCc)}&subject=${subject}`;
}
