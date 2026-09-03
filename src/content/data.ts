// Verified content from the live faemse.org crawl (Aug 2026) unless marked SAMPLE.

// Flip to true only after President Anzardo signs off on the events calendar,
// news posts, association statistics, and his welcome message. While false,
// sample sections are hidden or visibly labeled as previews on the public site.
export const CONTENT_VERIFIED = false;

// Role descriptions carried over verbatim from the previous faemse.org board
// page (Sept 2026). Headshots and personal bios still to come from the board.
export const board = [
  {
    role: 'President',
    name: 'Jorge Anzardo',
    blurb: 'Leads the association and presides over board meetings and general membership activities.',
  },
  {
    role: 'President-Elect',
    name: 'Bryan Spangler',
    blurb: 'Supports the President and prepares to assume the presidency at the end of the current term.',
  },
  {
    role: 'Secretary',
    name: 'Rochelle Goldberg',
    blurb: 'Maintains official records, meeting minutes, and correspondence of the association.',
  },
  {
    role: 'Past President',
    name: 'Melissa McNally',
    blurb: 'Assists in the leadership of the association and assumes presidential duties when needed.',
  },
  {
    role: 'Executive Director',
    name: 'James Dinsch',
    blurb: 'Manages the day-to-day operations of the association and supports the Board of Directors.',
  },
  {
    role: 'Director at Large',
    name: 'Matt Keeler',
    blurb: 'Represents the general membership and participates in board decisions and initiatives.',
  },
  {
    role: 'Director at Large',
    name: 'Garth Richards',
    blurb: 'Represents the general membership and participates in board decisions and initiatives.',
  },
  {
    role: 'Director at Large',
    name: 'Carlos Tavarez',
    blurb: 'Represents the general membership and participates in board decisions and initiatives.',
  },
  {
    role: 'EMS Educator Rep, FL EMS Advisory Council',
    name: 'Melissa McNally',
    blurb: 'Provides expert guidance on EMS education matters and advises the board on curriculum and training standards.',
  },
];

export const tiers = [
  {
    name: 'Active',
    who: 'Individual EMS educators & training officers',
    price: '$50',
    per: '/ year',
    featured: true,
    perks: [
      'Vote in elections & hold office',
      'Q&A archive, teaching videos & library',
      'Member pricing on workshops',
      'Educator of the Year eligibility',
    ],
  },
  {
    name: 'Institutional',
    who: 'Colleges, academies & EMS programs',
    price: '$250',
    per: '/ year',
    featured: false,
    perks: [
      'Five Active seats included',
      'Full privileges for every seat',
      'Program listing in the directory',
      'Best value per educator',
    ],
  },
  {
    name: 'Corporate',
    who: 'Vendors, publishers & partner organizations',
    price: '$200',
    per: '/ year',
    featured: false,
    perks: [
      'Three named representatives',
      'Archive, video & library access',
      'Committee service (non-voting)',
      'Direct line to Florida educators',
    ],
  },
];

export const freeTiers = [
  { name: 'Participant — Free', who: 'Resource access for state & regulatory agency staff' },
  { name: 'Honorary — Lifetime', who: 'By board appointment, for distinguished service to EMS education' },
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

// Logos carried over from the previous faemse.org sponsors page (Sept 2026),
// resized for the web into public/sponsors/. Sponsor website links still to
// come from the board.
export const sponsors = [
  { name: 'Henry Schein', logo: 'henry-schein' },
  { name: 'iSimulate', logo: 'isimulate' },
  { name: 'CAE Healthcare', logo: 'cae-healthcare' },
  { name: 'Platinum Ed', logo: 'platinum-ed' },
  { name: 'AMA', logo: 'ama' },
  { name: 'SEMA', logo: 'sema' },
  { name: 'EEI', logo: 'eei' },
  { name: 'EETI', logo: 'eeti' },
  { name: 'CFEEC', logo: 'cfeec' },
  { name: 'CMES', logo: 'cmes' },
  { name: 'CSRIPS', logo: 'csrips' },
  { name: 'MCA', logo: 'mca' },
  { name: 'JBLPSG', logo: 'jblpsg' },
  { name: 'The Rescco', logo: 'the-rescco' },
  { name: 'EMETSEEI', logo: 'emetseei' },
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
    linkUrl: '/about',
    linkLabel: 'About the award',
  },
  {
    kicker: 'New program director?',
    title: 'Your compliance clocks are already running.',
    body: 'Thirty days to notify CoAEMSP, fifteen months for the required workshop — and a first-90-days checklist built by directors who have done the job.',
    imageUrl: '',
    linkUrl: '/program-directors',
    linkLabel: 'Read the starter guide',
  },
  {
    kicker: 'The archive',
    title: 'Questions answered once. Kept for good.',
    body: 'Real questions from Florida educators, distilled by the board and searchable by topic — so knowledge stops evaporating with the listserv.',
    imageUrl: '',
    linkUrl: '/qa',
    linkLabel: 'Search the archive',
  },
];

export const faq = [
  {
    q: 'Who can become a member?',
    a: 'Anyone involved in EMS education in Florida — instructors, program directors, training officers, agency educators, and the institutions and companies that support them. There is a classification for every role.',
  },
  {
    q: 'What does membership cost?',
    a: 'Individual (Active) membership is $50/year. Institutions join for $250/year with five Active seats included, and corporate partners for $200/year with three representatives. Participant access is free for regulatory agency staff.',
  },
  {
    q: 'When and where does the association meet?',
    a: 'Statewide membership meetings held around Florida alongside the major state EMS conferences, with virtual options — plus workshops, webinars, and the annual student competition. Dates post to the calendar as the board confirms them.',
  },
  {
    q: 'How do I get involved beyond attending?',
    a: 'Run for the board (elections on a two-year cycle), serve on a committee, record a short teaching video, contribute to the program director guide, judge a student competition, or present at a workshop.',
  },
];

export const bylawsSummary = [
  { article: 'Article I', title: 'Name & Purpose', text: 'The Florida Association of Emergency Medical Services Educators, Inc. — fostering excellence in EMS education and training across Florida.' },
  { article: 'Article II', title: 'Membership', text: 'Five classifications: Active, Institutional, Corporate, Participant, and Honorary, each with defined rights and privileges.' },
  { article: 'Article III', title: 'Board of Directors', text: 'Officers and directors elected by the Active membership on a two-year cycle; the board guides association business between membership meetings.' },
  { article: 'Article IV', title: 'Meetings', text: 'Quarterly membership meetings held around the state and virtually; special meetings as called by the board.' },
  { article: 'Article V', title: 'Committees', text: 'Standing and ad-hoc committees appointed to carry out the work of the association.' },
  { article: 'Article VI', title: 'Amendments', text: 'Bylaws amended by vote of the Active membership.' },
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
