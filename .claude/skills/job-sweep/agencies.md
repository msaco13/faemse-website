# Job sweep watch list

The Florida fire departments and EMS agencies the weekly sweep checks by name,
every run (AJ, 2026-11-11). General searches miss most of them: they announce
on Facebook, which the sweep can't read, and post on governmentjobs.com, which
it never reads. So the sweep doesn't wait for a search to turn them up; it
looks each one up.

How to use it is in SKILL.md, step 3. In short: first the National Testing
Network pass, then every agency below in order (the board's list, South
Florida, then the rest of the state), and one result for each. Nothing here is
a posting: it says where to look, never that a job is open. Count every
agency below (each bullet, and each agency named in a bullet) toward
`agencies_total`.

## National Testing Network (NTN)

Many Florida departments take applications through NTN, and the fetch helper
can read it. The openings page lists every state (768 openings on
2026-11-11) and runs long, so read it whole:

`node scripts/job-sweep/fetch.mjs --full --links https://nationaltestingnetwork.com/publicsafetyjobs/current-openings.cfm`

The Florida section runs from the "Florida" heading to the next state's
("Georgia"). Each opening there has a `fullJobDetails.cfm?...` link: read that
page for the details. An NTN posting counts as the employer's own (rule 5).
Police, deputy, corrections and airport-security openings are not ours; fire,
EMS, and fire/EMS dispatcher openings are. `ntn_florida` is how many fire, EMS
and dispatch openings the Florida section had.

Agencies marked (NTN) had an opening there on 2026-11-11; check NTN first for
them, and look elsewhere too if NTN has nothing.

## The board's list

Employers AJ heard are hiring (see SKILL.md, "Employers the board asked us to
check"). Each gets its own line in the summary.

- Highland Beach Fire Rescue (Palm Beach County). The town's site answers the fetch helper with HTTP 404: use search results.
- Key Largo Fire Rescue and Emergency Medical Services District (Monroe County) (NTN).
- Ocean Reef Fire Department, North Key Largo (Monroe County). Takes applications through NTN.
- Deerfield Beach (Broward County): the city's new fire department, taking over from BSO Fire Rescue. Postings on governmentjobs.com: from search.
- Davie Fire Rescue (Broward County).

## South Florida

Miami-Dade
- Miami-Dade Fire Rescue
- City of Miami Fire-Rescue
- Hialeah Fire Department
- Coral Gables Fire Department
- Miami Beach Fire Department
- Key Biscayne Fire Rescue

Broward
- Broward Sheriff's Office Fire Rescue
- Fort Lauderdale Fire Rescue
- Hollywood Fire Rescue
- Pembroke Pines Fire Rescue (applications through NTN; the city's site answers the fetch helper with HTTP 404)
- Miramar Fire Rescue
- Coral Springs-Parkland Fire Department
- Plantation Fire Rescue
- Sunrise Fire Rescue
- Margate Fire Rescue
- Tamarac Fire Rescue
- Lauderhill Fire Rescue
- Pompano Beach Fire Rescue
- Hallandale Beach Fire Rescue
- Lighthouse Point Fire Rescue
- Oakland Park Fire Rescue
- North Lauderdale Fire Rescue (NTN)
- Seminole Tribe of Florida Fire Rescue

Palm Beach
- Palm Beach County Fire Rescue
- Boca Raton Fire Rescue
- Delray Beach Fire Rescue
- Boynton Beach Fire Rescue
- West Palm Beach Fire Rescue
- Palm Beach Gardens Fire Rescue (NTN)
- Riviera Beach Fire Rescue
- Town of Palm Beach Fire Rescue
- Tequesta Fire Rescue
- North Palm Beach Fire Rescue

Monroe
- Monroe County Fire Rescue
- Key West Fire Department
- Marathon Fire Rescue (NTN)
- Islamorada Fire Rescue

Treasure Coast and Okeechobee
- St. Lucie County Fire District
- Martin County Fire Rescue
- Indian River County Fire Rescue
- Okeechobee County Fire Rescue (NTN)

## The rest of Florida

Central
- Orange County Fire Rescue (NTN)
- Orlando Fire Department
- Central Florida Tourism Oversight District Fire Department (NTN)
- Osceola County Fire Rescue
- Kissimmee Fire Department (NTN)
- Seminole County Fire Department (NTN)
- Sanford Fire Department (NTN)
- Oviedo Fire Rescue (NTN)
- Apopka Fire Department (NTN)
- Maitland Fire Rescue (NTN)
- Lake County Fire Rescue
- Leesburg Fire Department (NTN)
- Mount Dora Fire Department (NTN)
- Tavares Fire Department (NTN)
- Polk County Fire Rescue (NTN)
- Lakeland Fire Department
- Winter Haven Fire Department (NTN)
- Volusia County Fire Rescue and Volusia County EMS
- Daytona Beach Fire Department
- Ormond Beach Fire Department (NTN)
- Brevard County Fire Rescue
- Palm Bay Fire Rescue (NTN)
- Melbourne Fire Department
- Cocoa Fire Department (NTN)
- Marion County Fire Rescue (NTN)
- Ocala Fire Rescue
- Citrus County Fire Rescue (NTN)

Tampa Bay
- Hillsborough County Fire Rescue
- Tampa Fire Rescue (NTN)
- Pasco County Fire Rescue
- Hernando County Fire Rescue
- Brooksville Fire Department (NTN)
- St. Petersburg Fire Rescue (NTN)
- Clearwater Fire and Rescue
- Largo Fire Rescue
- Pinellas Park Fire Department (NTN)
- Dunedin Fire Rescue (NTN)
- Tarpon Springs Fire Rescue (NTN)
- Sunstar Paramedics (Pinellas County EMS)

Southwest
- Sarasota County Fire Department
- Bradenton Fire Department (NTN)
- Manatee County EMS
- West Manatee Fire Rescue, Cedar Hammock Fire Rescue, North River Fire District, Southern Manatee Fire Rescue
- DeSoto County Fire Rescue (NTN)
- Charlotte County Fire and EMS
- Cape Coral Fire Department
- Fort Myers Fire Department
- San Carlos Park, Estero, Bonita Springs, Lehigh Acres, South Trail and Iona McGregor fire districts (Lee County)
- Greater Naples Fire Rescue District
- North Collier Fire Control and Rescue District
- Naples Fire-Rescue and Marco Island Fire Rescue
- Collier County EMS

North and Panhandle
- Jacksonville Fire and Rescue Department
- St. Johns County Fire Rescue
- St. Augustine Fire Department (NTN)
- Clay County Fire Rescue
- Fernandina Beach Fire Department (NTN)
- Alachua County Fire Rescue
- Gainesville Fire Rescue
- Tallahassee Fire Department
- Leon County EMS
- Escambia County Fire Rescue
- Pensacola Fire Department
- Holley-Navarre Fire District (NTN)
- Okaloosa County EMS

## Private EMS

Checked by the general EMS searches as well; these hire across the state.
- AMR (with Medics Ambulance Service)
- AmeriCare Ambulance
- Nature Coast EMS
