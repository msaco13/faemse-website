// Verified content from the live faemse.org crawl (Aug 2026) unless marked SAMPLE.

export const board = [
  { role: 'President', name: 'Jorge Anzardo' },
  { role: 'President-Elect', name: 'Bryan Spangler' },
  { role: 'Secretary', name: 'Rochelle Goldberg' },
  { role: 'Past President', name: 'Melissa McNally' },
  { role: 'Executive Director', name: 'James Dinsch' },
  { role: 'Director at Large', name: 'Matt Keeler' },
  { role: 'Director at Large', name: 'Garth Richards' },
  { role: 'Director at Large', name: 'Carlos Tavarez' },
  { role: 'EMS Educator Rep, FL EMS Advisory Council', name: 'Melissa McNally' },
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
      'Every forum, every resource',
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
      'Forum & resource access',
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
      { name: 'National EMS Education Standards (EMS.gov)', url: 'https://www.ems.gov/education.html' },
      { name: 'CAPCE (formerly CECBEMS)', url: 'https://capce.org' },
      { name: 'NAEMSE Educator Resources', url: 'https://naemse.org/resources' },
    ],
  },
];

export const sponsors = [
  'Henry Schein',
  'iSimulate',
  'CAE Healthcare',
  'Platinum Ed',
  'AMA',
  'SEMA',
  'EEI',
  'EETI',
  'CFEEC',
  'CMES',
  'CSRIPS',
  'MCA',
  'JBLPSG',
  'The Rescco',
  'EMETSEEI',
];

// SAMPLE listings — replace with the association's real 2026-27 calendar.
export const events = [
  {
    day: '14',
    month: 'AUG',
    year: '2026',
    title: 'Summer Quarterly Membership Meeting',
    detail: 'Association business, state updates, open floor',
    location: 'Virtual · Zoom',
    tag: 'Meeting',
    tagColor: 'blue',
  },
  {
    day: '26',
    month: 'SEP',
    year: '2026',
    title: 'Educator & Student Success Workshop',
    detail: 'Full-day, hands-on · CE hours available',
    location: 'Orlando, FL',
    tag: 'Workshop',
    tagColor: 'red',
  },
  {
    day: '09',
    month: 'OCT',
    year: '2026',
    title: 'NREMT Pass-Rate Strategies',
    detail: 'What high-performing programs do differently',
    location: 'Webinar',
    tag: 'Free · Members',
    tagColor: 'green',
  },
  {
    day: '07',
    month: 'NOV',
    year: '2026',
    title: 'ALS Student Competition',
    detail: 'Team scenarios, judged by veteran educators',
    location: 'Tampa, FL',
    tag: 'Competition',
    tagColor: 'red',
  },
];

// SAMPLE posts — replace with real association news.
export const news = [
  {
    date: 'June 2, 2026',
    tag: 'Awards',
    title: '2026 EMS Educator of the Year recipients announced',
    excerpt:
      'Seven categories, one standard: educators whose students are measurably better for having been in their classroom.',
  },
  {
    date: 'May 18, 2026',
    tag: 'Resources',
    title: 'New toolkit: aligning your program to the 2026 Education Standards',
    excerpt:
      'A members-only crosswalk for mapping curriculum to the latest National EMS Education Standards.',
  },
  {
    date: 'April 30, 2026',
    tag: 'Board',
    title: 'Three new directors join the FAEMSE board',
    excerpt:
      'Meet the educators stepping into leadership this term — and the priorities guiding the association through 2028.',
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
    a: 'Quarterly statewide meetings — a mix of virtual and in-person around Florida — plus workshops, webinars, and the annual student competition.',
  },
  {
    q: 'How do I get involved beyond attending?',
    a: 'Run for the board (elections on a two-year cycle), serve on a committee, moderate a forum, judge a student competition, or present at a workshop.',
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

export const contact = {
  legalName: 'Florida Association of Emergency Medical Services Educators, Inc.',
  taxStatus: '501(c)(6) not-for-profit corporation',
  address: '7901 4th Street #9219, St. Petersburg, FL 33702',
  email: 'info@faemse.org',
  facebook: 'https://www.facebook.com/flemseducators',
  linkedin: 'https://www.linkedin.com/company/florida-association-of-ems-educators/',
};
