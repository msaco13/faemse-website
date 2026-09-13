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

export type Program = {
  name: string;
  city: string;
  lat: number;
  lon: number;
  url: string | null;
};

export const programs: Program[] = [
  { name: "Pensacola State College", city: "Pensacola", lat: 30.421, lon: -87.217, url: "https://www.pensacolastate.edu" },
  { name: "George Stone Technical College", city: "Pensacola", lat: 30.421, lon: -87.217, url: "https://gstc.escambiaschools.org" },
  { name: "Northwest Florida State College", city: "Niceville", lat: 30.517, lon: -86.482, url: "https://www.nwfsc.edu" },
  { name: "Gulf Coast State College", city: "Panama City", lat: 30.159, lon: -85.660, url: "https://www.gulfcoast.edu" },
  { name: "Florida Panhandle Technical College", city: "Chipley", lat: 30.782, lon: -85.539, url: "https://www.fptc.edu" },
  { name: "Chipola College", city: "Marianna", lat: 30.774, lon: -85.227, url: "https://www.chipola.edu" },
  { name: "Tallahassee State College", city: "Tallahassee", lat: 30.438, lon: -84.281, url: "https://www.tsc.fl.edu" },
  { name: "North Florida College", city: "Madison", lat: 30.469, lon: -83.413, url: "https://www.nfc.edu" },
  { name: "Florida Gateway College", city: "Lake City", lat: 30.190, lon: -82.639, url: "https://www.fgc.edu" },
  { name: "Santa Fe College", city: "Gainesville", lat: 29.652, lon: -82.325, url: "https://www.sfcollege.edu" },
  { name: "Florida State College at Jacksonville – North Campus", city: "Jacksonville", lat: 30.332, lon: -81.656, url: "https://www.fscj.edu" },
  { name: "Florida State College at Jacksonville – South Campus", city: "Jacksonville", lat: 30.332, lon: -81.656, url: "https://www.fscj.edu" },
  { name: "Camsen Career Institute", city: "Jacksonville", lat: 30.332, lon: -81.656, url: "https://camsen.edu" },
  { name: "First Coast Technical College", city: "St. Augustine", lat: 29.901, lon: -81.313, url: "https://fctc.edu" },
  { name: "St. Johns River State College", city: "Orange Park", lat: 30.166, lon: -81.706, url: "https://www.sjrstate.edu" },
  { name: "Flagler Technical College", city: "Palm Coast", lat: 29.585, lon: -81.208, url: "https://www.flaglertech.edu" },
  { name: "Daytona State College", city: "Daytona Beach", lat: 29.211, lon: -81.023, url: "https://www.daytonastate.edu" },
  { name: "College of Central Florida", city: "Ocala", lat: 29.187, lon: -82.140, url: "https://www.cf.edu" },
  { name: "Florida State Fire College", city: "Ocala", lat: 29.187, lon: -82.140, url: "https://www.myfloridacfo.com/division/sfm/bfst" },
  { name: "Lake Technical College", city: "Eustis", lat: 28.853, lon: -81.685, url: "https://www.laketech.org" },
  { name: "Seminole State College of Florida", city: "Sanford", lat: 28.801, lon: -81.273, url: "https://www.seminolestate.edu" },
  { name: "Valencia College", city: "Orlando", lat: 28.538, lon: -81.379, url: "https://valenciacollege.edu" },
  { name: "Orlando Medical Institute", city: "Orlando", lat: 28.538, lon: -81.379, url: "https://omi.edu" },
  { name: "First Response Training Group", city: "Orlando", lat: 28.538, lon: -81.379, url: "https://www.frtg.edu" },
  { name: "Polk State College", city: "Winter Haven", lat: 28.022, lon: -81.733, url: "https://www.polk.edu" },
  { name: "Ridge Technical College", city: "Winter Haven", lat: 28.022, lon: -81.733, url: "https://techcolleges.polkschoolsfl.com/" },
  { name: "South Florida State College", city: "Avon Park", lat: 27.596, lon: -81.506, url: "https://www.southflorida.edu" },
  { name: "Eastern Florida State College", city: "Melbourne", lat: 28.084, lon: -80.608, url: "https://www.easternflorida.edu" },
  { name: "EMETSEEI Institute", city: "Rockledge", lat: 28.351, lon: -80.725, url: "https://emetseei.edu" },
  { name: "Pasco-Hernando State College", city: "New Port Richey", lat: 28.244, lon: -82.719, url: "https://phsc.edu" },
  { name: "Hillsborough College", city: "Tampa", lat: 27.951, lon: -82.457, url: "https://www.hcfl.edu" },
  { name: "Aparicio-Levy Technical College", city: "Tampa", lat: 27.951, lon: -82.457, url: "https://www.hillsboroughschools.org/o/altc" },
  { name: "Ultimate Medical Academy", city: "Tampa", lat: 27.951, lon: -82.457, url: "https://www.ultimatemedical.edu" },
  { name: "St. Petersburg College", city: "Pinellas Park", lat: 27.843, lon: -82.700, url: "https://www.spcollege.edu" },
  { name: "Pinellas Technical College", city: "St. Petersburg", lat: 27.768, lon: -82.640, url: "https://www.myptc.edu" },
  { name: "School of EMS – Florida", city: "St. Petersburg", lat: 27.768, lon: -82.640, url: "https://www.schoolofems.org" },
  { name: "Manatee Technical College", city: "Bradenton", lat: 27.499, lon: -82.575, url: "https://www.manateetech.edu" },
  { name: "Suncoast Technical College", city: "Sarasota", lat: 27.337, lon: -82.531, url: "https://www.suncoast.edu" },
  { name: "Charlotte Technical College", city: "Port Charlotte", lat: 26.976, lon: -82.091, url: "https://ctc.yourcharlotteschools.net" },
  { name: "Florida SouthWestern State College", city: "Fort Myers", lat: 26.640, lon: -81.873, url: "https://www.fsw.edu" },
  { name: "Southwest Florida Public Service Academy", city: "Fort Myers", lat: 26.640, lon: -81.873, url: "https://swfpsa.org" },
  { name: "Gulfside Medical Training Institute", city: "Fort Myers", lat: 26.640, lon: -81.873, url: "https://gmtifortmyers.com" },
  { name: "Braxton College", city: "Fort Myers", lat: 26.640, lon: -81.873, url: "https://braxton.edu" },
  { name: "Ricky Rescue Training Academy", city: "Fort Myers", lat: 26.640, lon: -81.873, url: "https://emsricky.com" },
  { name: "Indian River State College", city: "Fort Pierce", lat: 27.447, lon: -80.326, url: "https://irsc.edu" },
  { name: "Treasure Coast Fire and Medical Institute", city: "Fort Pierce", lat: 27.447, lon: -80.326, url: "https://www.tcmfi.com" },
  { name: "Medical Career Academy", city: "Palm Beach Gardens", lat: 26.823, lon: -80.139, url: "https://mcaedu.org" },
  { name: "American Healthcare Institute", city: "West Palm Beach", lat: 26.715, lon: -80.053, url: "https://amhealthinstitute.com" },
  { name: "Palm Beach State College", city: "Lake Worth Beach", lat: 26.617, lon: -80.072, url: "https://www.palmbeachstate.edu" },
  { name: "Coral Springs Regional Institute of Public Safety", city: "Coral Springs", lat: 26.271, lon: -80.271, url: "https://www.csrips.edu" },
  { name: "Emergency Education Institute", city: "Coral Springs", lat: 26.271, lon: -80.271, url: "https://eei.edu" },
  { name: "Broward College", city: "Davie", lat: 26.063, lon: -80.233, url: "https://www.broward.edu" },
  { name: "McFatter Technical College", city: "Davie", lat: 26.063, lon: -80.233, url: "https://www.mcfattertechnicalcollege.edu" },
  { name: "Barry University", city: "Miami Shores", lat: 25.863, lon: -80.193, url: "https://www.barry.edu" },
  { name: "Miami Dade College", city: "Miami", lat: 25.775, lon: -80.194, url: "https://www.mdc.edu" },
  { name: "American Medical Academy", city: "Miami", lat: 25.775, lon: -80.194, url: "https://ama.edu" },
  { name: "Emergency Training Academy", city: "Miami", lat: 25.775, lon: -80.194, url: "https://eta.edu" },
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
