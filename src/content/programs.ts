// Florida EMT and paramedic programs: the association's constituency, drawn on
// the homepage map and listed on the Programs page. Compiled Sept 2026 from
// the two NREMT program lists the board supplied (59 programs after merging
// schools that appeared under two names). Each row is the campus that hosts
// the EMS program; url is the school's homepage (null when none is known, in
// which case the site shows the name without a link).
//
// Placement notes: Gulf Coast State College runs EMS at its North Bay campus
// (Southport) and Florida Gateway College at its Olustee training center;
// both sit under their main-campus city since nobody searches for Southport.
// St. Johns River State College hosts EMS at Orange Park, not Palatka.
//
// Campus positions (Sept 2026): most from OpenStreetMap; the small private
// academies it does not list are placed from their street addresses.

export type Program = {
  name: string;
  city: string;
  lat: number;
  lon: number;
  url: string | null;
  // Where the campus actually is, for schools that share a city dot: zoomed
  // in, the city splits into one dot per school at these positions. Left off
  // for the 26 cities with a single program (the city position is enough).
  campus?: [number, number];
  // A name that fits on a map label; the full name stays in the card and list.
  short?: string;
};

export const programs: Program[] = [
  { name: "Pensacola State College", city: "Pensacola", lat: 30.421, lon: -87.217, url: "https://www.pensacolastate.edu", campus: [30.4801, -87.2018] },
  { name: "George Stone Technical College", city: "Pensacola", lat: 30.421, lon: -87.217, url: "https://gstc.escambiaschools.org", campus: [30.463, -87.325], short: "George Stone Technical" },
  { name: "Northwest Florida State College", city: "Niceville", lat: 30.517, lon: -86.482, url: "https://www.nwfsc.edu" },
  { name: "Gulf Coast State College", city: "Panama City", lat: 30.159, lon: -85.660, url: "https://www.gulfcoast.edu" },
  { name: "Florida Panhandle Technical College", city: "Chipley", lat: 30.782, lon: -85.539, url: "https://www.fptc.edu" },
  { name: "Chipola College", city: "Marianna", lat: 30.774, lon: -85.227, url: "https://www.chipola.edu" },
  { name: "Tallahassee State College", city: "Tallahassee", lat: 30.438, lon: -84.281, url: "https://www.tsc.fl.edu" },
  { name: "North Florida College", city: "Madison", lat: 30.469, lon: -83.413, url: "https://www.nfc.edu" },
  { name: "Florida Gateway College", city: "Lake City", lat: 30.190, lon: -82.639, url: "https://www.fgc.edu" },
  { name: "Santa Fe College", city: "Gainesville", lat: 29.652, lon: -82.325, url: "https://www.sfcollege.edu" },
  { name: "Florida State College at Jacksonville – North Campus", city: "Jacksonville", lat: 30.332, lon: -81.656, url: "https://www.fscj.edu", campus: [30.4292, -81.7201], short: "FSCJ North Campus" },
  { name: "Florida State College at Jacksonville – South Campus", city: "Jacksonville", lat: 30.332, lon: -81.656, url: "https://www.fscj.edu", campus: [30.2954, -81.5076], short: "FSCJ South Campus" },
  { name: "Camsen Career Institute", city: "Jacksonville", lat: 30.332, lon: -81.656, url: "https://camsen.edu", campus: [30.253, -81.598] },
  { name: "First Coast Technical College", city: "St. Augustine", lat: 29.901, lon: -81.313, url: "https://fctc.edu" },
  { name: "St. Johns River State College", city: "Orange Park", lat: 30.166, lon: -81.706, url: "https://www.sjrstate.edu" },
  { name: "Flagler Technical College", city: "Palm Coast", lat: 29.585, lon: -81.208, url: "https://www.flaglertech.edu" },
  { name: "Daytona State College", city: "Daytona Beach", lat: 29.211, lon: -81.023, url: "https://www.daytonastate.edu" },
  { name: "College of Central Florida", city: "Ocala", lat: 29.187, lon: -82.140, url: "https://www.cf.edu", campus: [29.1647, -82.174] },
  { name: "Florida State Fire College", city: "Ocala", lat: 29.187, lon: -82.140, url: "https://www.myfloridacfo.com/division/sfm/bfst", campus: [29.276, -82.176] },
  { name: "Lake Technical College", city: "Eustis", lat: 28.853, lon: -81.685, url: "https://www.laketech.org" },
  { name: "Seminole State College of Florida", city: "Sanford", lat: 28.801, lon: -81.273, url: "https://www.seminolestate.edu" },
  { name: "Valencia College", city: "Orlando", lat: 28.538, lon: -81.379, url: "https://valenciacollege.edu", campus: [28.521, -81.4655] },
  { name: "Orlando Medical Institute", city: "Orlando", lat: 28.538, lon: -81.379, url: "https://omi.edu", campus: [28.53, -81.4], short: "Orlando Medical Inst." },
  { name: "First Response Training Group", city: "Orlando", lat: 28.538, lon: -81.379, url: "https://www.frtg.edu", campus: [28.56, -81.31], short: "First Response Training" },
  { name: "Polk State College", city: "Winter Haven", lat: 28.022, lon: -81.733, url: "https://www.polk.edu", campus: [28.0331, -81.7152] },
  { name: "Ridge Technical College", city: "Winter Haven", lat: 28.022, lon: -81.733, url: "https://techcolleges.polkschoolsfl.com/", campus: [28.0758, -81.6555] },
  { name: "South Florida State College", city: "Avon Park", lat: 27.596, lon: -81.506, url: "https://www.southflorida.edu" },
  { name: "Eastern Florida State College", city: "Melbourne", lat: 28.084, lon: -80.608, url: "https://www.easternflorida.edu" },
  { name: "EMETSEEI Institute", city: "Rockledge", lat: 28.351, lon: -80.725, url: "https://emetseei.edu" },
  { name: "Pasco-Hernando State College", city: "New Port Richey", lat: 28.244, lon: -82.719, url: "https://phsc.edu" },
  { name: "Hillsborough College", city: "Tampa", lat: 27.951, lon: -82.457, url: "https://www.hcfl.edu", campus: [27.9778, -82.5095] },
  { name: "Aparicio-Levy Technical College", city: "Tampa", lat: 27.951, lon: -82.457, url: "https://www.hillsboroughschools.org/o/altc", campus: [27.9901, -82.3325], short: "Aparicio-Levy Technical" },
  { name: "Ultimate Medical Academy", city: "Tampa", lat: 27.951, lon: -82.457, url: "https://www.ultimatemedical.edu", campus: [27.9653, -82.7855] },
  { name: "St. Petersburg College", city: "Pinellas Park", lat: 27.843, lon: -82.700, url: "https://www.spcollege.edu" },
  { name: "Pinellas Technical College", city: "St. Petersburg", lat: 27.768, lon: -82.640, url: "https://www.myptc.edu", campus: [27.7608, -82.6818], short: "Pinellas Technical" },
  { name: "School of EMS – Florida", city: "St. Petersburg", lat: 27.768, lon: -82.640, url: "https://www.schoolofems.org", campus: [27.79, -82.66], short: "School of EMS" },
  { name: "Manatee Technical College", city: "Bradenton", lat: 27.499, lon: -82.575, url: "https://www.manateetech.edu" },
  { name: "Suncoast Technical College", city: "Sarasota", lat: 27.337, lon: -82.531, url: "https://www.suncoast.edu" },
  { name: "Charlotte Technical College", city: "Port Charlotte", lat: 26.976, lon: -82.091, url: "https://ctc.yourcharlotteschools.net" },
  { name: "Florida SouthWestern State College", city: "Fort Myers", lat: 26.640, lon: -81.873, url: "https://www.fsw.edu", campus: [26.5512, -81.8895], short: "Florida SouthWestern" },
  { name: "Southwest Florida Public Service Academy", city: "Fort Myers", lat: 26.640, lon: -81.873, url: "https://swfpsa.org", campus: [26.6474, -81.8252], short: "SW Florida Public Service Academy" },
  { name: "Gulfside Medical Training Institute", city: "Fort Myers", lat: 26.640, lon: -81.873, url: "https://gmtifortmyers.com", campus: [26.61, -81.81], short: "Gulfside Medical Training" },
  { name: "Braxton College", city: "Fort Myers", lat: 26.640, lon: -81.873, url: "https://braxton.edu", campus: [26.567, -81.87] },
  { name: "Ricky Rescue Training Academy", city: "Fort Myers", lat: 26.640, lon: -81.873, url: "https://emsricky.com", campus: [26.55, -81.88], short: "Ricky Rescue Academy" },
  { name: "Indian River State College", city: "Fort Pierce", lat: 27.447, lon: -80.326, url: "https://irsc.edu", campus: [27.4196, -80.3598] },
  { name: "Treasure Coast Fire and Medical Institute", city: "Fort Pierce", lat: 27.447, lon: -80.326, url: "https://www.tcmfi.com", campus: [27.44, -80.35], short: "Treasure Coast Fire & Medical" },
  { name: "Medical Career Academy", city: "Palm Beach Gardens", lat: 26.823, lon: -80.139, url: "https://mcaedu.org" },
  { name: "American Healthcare Institute", city: "West Palm Beach", lat: 26.715, lon: -80.053, url: "https://amhealthinstitute.com" },
  { name: "Palm Beach State College", city: "Lake Worth Beach", lat: 26.617, lon: -80.072, url: "https://www.palmbeachstate.edu" },
  { name: "Coral Springs Regional Institute of Public Safety", city: "Coral Springs", lat: 26.271, lon: -80.271, url: "https://www.csrips.edu", campus: [26.277, -80.298], short: "Coral Springs Institute (CSRIPS)" },
  { name: "Emergency Education Institute", city: "Coral Springs", lat: 26.271, lon: -80.271, url: "https://eei.edu", campus: [26.255, -80.245], short: "Emergency Education Inst." },
  { name: "Broward College", city: "Davie", lat: 26.063, lon: -80.233, url: "https://www.broward.edu", campus: [26.0793, -80.238] },
  { name: "McFatter Technical College", city: "Davie", lat: 26.063, lon: -80.233, url: "https://www.mcfattertechnicalcollege.edu", campus: [26.081, -80.234], short: "McFatter Technical" },
  { name: "Barry University", city: "Miami Shores", lat: 25.863, lon: -80.193, url: "https://www.barry.edu" },
  { name: "Miami Dade College", city: "Miami", lat: 25.775, lon: -80.194, url: "https://www.mdc.edu", campus: [25.7906, -80.2065] },
  { name: "American Medical Academy", city: "Miami", lat: 25.775, lon: -80.194, url: "https://ama.edu", campus: [25.677, -80.392] },
  { name: "Emergency Training Academy", city: "Miami", lat: 25.775, lon: -80.194, url: "https://eta.edu", campus: [25.83, -80.33] },
  { name: "Southeastern Medical Academy", city: "Marathon", lat: 24.714, lon: -81.090, url: "https://www.southeasternmedicalacademy.edu" },
  { name: "The College of the Florida Keys", city: "Key West", lat: 24.556, lon: -81.782, url: "https://www.cfk.edu" },
];

export type ProgramCity = { name: string; lat: number; lon: number; programs: Program[] };

// One entry per city, busiest first, programs A–Z within a city.
export function programCities(): ProgramCity[] {
  const by = new Map<string, ProgramCity>();
  for (const p of programs) {
    if (!by.has(p.city)) by.set(p.city, { name: p.city, lat: p.lat, lon: p.lon, programs: [] });
    by.get(p.city)!.programs.push(p);
  }
  const out = [...by.values()];
  for (const c of out) c.programs.sort((a, b) => a.name.localeCompare(b.name));
  return out.sort((a, b) => b.programs.length - a.programs.length || a.name.localeCompare(b.name));
}
