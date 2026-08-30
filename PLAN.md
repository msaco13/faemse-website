# FAEMSE Website Rebuild — Build Plan

> Working brief for rebuilding faemse.org from scratch.
> Prepared 2026-08-29. Contact/decision-maker: Jorge Anzardo, FAEMSE President.
> Design direction: the approved "Signal & Service" concept (`/faemse-homepage-mockup.html`,
> live at https://claude.ai/code/artifact/1f5a6069-e06a-47e2-9b07-ead70844e1f2).

---

## 1. What the current site actually contains (verified crawl, Aug 2026)

The live site runs on Wild Apricot. Some pages are maintained, others are stale or dead.

| Page | Status | Content to carry forward |
|---|---|---|
| Home | Weak — three empty dynamic sections | Mission line, join CTA |
| About Us | Thin link hub | Mission/vision statements |
| **Board** (`/board`) | **Current** | Full roster — see §2 |
| Bylaws (`/bylaws`) | OK | 6-article summary (no amendment date shown) |
| Membership | OK | 5 tiers + pricing — see §3 |
| Events | Stale — nothing upcoming; history through Sep 2025 | Event types: quarterly meetings, workshops, ALS student competition |
| News | Frozen June 2022 | Educator of the Year program (real, 7 categories) |
| **Resources** (`/resources-links`) | **Good** | 13 external links in 4 categories — see §4 |
| **Sponsors** (`/sponsors`) | **Good** | 15 sponsor logos — see §5 |
| Contact | OK, email is anti-spam mangled | Address, form, socials — see §6 |
| Forums | Member-only, COVID-era activity | Decision needed — likely drop from v1 |
| Elections | **404 (dead link in nav)** | Fold into About/Board |
| Foundation | Separate site (faemsefoundation.org, 501(c)(3)) | Link out only — $250 EMT / $500 Paramedic scholarships 2×/yr |

Key correction from the first audit: the association is more active than the site suggests
(events ran through Sept 2025, board is current). The rebuild's job is to close the gap
between how active FAEMSE is and how dead it looks.

## 2. Board of Directors (verified from live site)

| Position | Name |
|---|---|
| President | Jorge Anzardo |
| President-Elect | Bryan Spangler |
| Secretary | Rochelle Goldberg |
| Past President | Melissa McNally |
| Executive Director | James Dinsch |
| Director at Large | Matt Keeler |
| Director at Large | Garth Richards |
| Director at Large | Carlos Tavarez |
| EMS Educator Rep, FL EMS Advisory Council | Melissa McNally |

Each has a role-description blurb on the live site; @faemse.org emails exist but are
obfuscated. Need from Jorge: headshots, short bios, term dates.

## 3. Membership tiers (verified)

| Tier | Price | Notes |
|---|---|---|
| Active (individual) | $50/yr | Full voting + committee rights |
| Institutional | $250/yr | Includes 5 Active seats |
| Corporate | $200/yr | 3 reps, non-voting committee service |
| Participant | Free | Regulatory agency staff, resource access |
| Honorary | Free, lifetime | Board-appointed |

## 4. Resources catalog (verified — all external links)

- **Accreditation & Standards:** CoAEMSP, CAAHEP, NREMT
- **State & Federal:** FL DoH EMS, NHTSA Office of EMS, FICEMS
- **Professional orgs:** NAEMSE, NAEMSP, ACEP, FAEMSE Foundation
- **Curriculum & education:** EMS.gov education standards, CECBEMS, NAEMSE resources
- Plus a "Suggest a Resource" flow → contact form

## 5. Sponsors (verified, 15 — no tiers defined on current site)

AMA, CAE, CFEEC, CMES, CSRIPS, EEI, EETI, EMETSEEI, Henry Schein, iSimulate, MCA,
Platinum Ed, JBLPSG, SEMA, The Rescco.
Need from Jorge: logo files, sponsor URLs, whether tiered sponsorship packages exist.

## 6. Contact & business info (verified)

- Legal name: Florida Association of Emergency Medical Services Educators, Inc. — 501(c)(6)
- Mailing: 7901 4th Street #9219, St. Petersburg, FL 33702
- Socials: facebook.com/flemseducators · linkedin.com/company/florida-association-of-ems-educators
  (current X link is a Wild Apricot template default — fix or drop)
- Contact form: Name / Email / Subject / Message

## 7. Architecture decision

**Stack: Vite + React + TypeScript + Tailwind, in `faemse-site/` (self-contained folder).**
Rationale: matches tooling already used in this repo's main app, static-first output,
free hosting (Netlify/Vercel), no server to maintain. The folder is movable to its own
repo at handoff.

**Content model:** typed content modules (`content/board.ts`, `events.ts`, `news.ts`,
`resources.ts`, `sponsors.ts`, `membership.ts`) — a volunteer edits one obvious file per
change. A CMS can be added later; it is not a launch requirement.

**Membership & payments (the hard part):** Phase 1 keeps Wild Apricot as the back office —
Join/Renew/Login buttons deep-link to the existing WA flows, so dues and the member
database don't move. A custom Supabase+Stripe portal is a Phase-4 option, not a launch
blocker.

**Forums:** drop from v1 navigation (activity is COVID-era). Members who still use them
get a link from the member page. **Foundation:** stays a separate site; link out.
**Elections:** becomes a section on the Board page, killing the dead nav link.

## 8. Sitemap (v1 — 9 routes)

```
/               Home (hero, vitals, why-join, events, news, sponsors strip, join CTA)
/about          Mission, history, Educator of the Year program
/board          Roster + role blurbs + elections info
/bylaws         Six articles, downloadable PDF when supplied
/membership     Tiers, benefits, join/renew (→ Wild Apricot)
/events         Upcoming + past archive
/news           Posts (newest first)
/resources      Categorized external links + suggest-a-resource
/sponsors       Logo wall + become-a-sponsor
/contact        Form, address, socials        (+ custom 404)
```

## 9. Design system (from approved concept)

- Type: Barlow Condensed 600/700 (display, uppercase) + Public Sans 400/600/700 (body)
- Palette: ink `#0A1B33` / panel `#0E2547` / paper `#F4F6FA` / blue `#2557C7` /
  red `#E23B43` / green `#3ADB8F` / text `#14233C` / muted `#54637E` / line `#DCE3EF`
- Motifs: EKG pulse divider, "vitals" stat band, dispatch-board events, star-of-life mark
- Components to extract from mockup: header/nav, buttons, tags, event rows, tier cards,
  quote cards, resource cards, FAQ, footer

## 10. Build phases

1. **Scaffold** — Vite project in `faemse-site/`, Tailwind configured with the token
   system, fonts self-hosted, layout shell (header/footer/404) with routing.
2. **Pages** — all 9 routes using verified content above; clearly-marked placeholders
   only where content must come from Jorge (photos, logos, 2026-27 calendar).
3. **Polish** — responsive pass, accessibility (focus states, contrast, reduced motion),
   SEO (meta/OG/sitemap), analytics stub, Lighthouse budget.
4. **Deploy preview** — Netlify/Vercel preview URL for Jorge's board to click through.
5. **Handoff** — DNS cutover checklist (apex + www), Wild Apricot deep-link wiring,
   one-page "how to edit content" guide.

## 11. Open questions for Jorge (none block phases 1–3)

1. Confirm Wild Apricot stays as the membership/payment back office for launch.
2. Sponsor logo files + URLs; are there sponsorship tiers/pricing to publish?
3. Board headshots, bios, term dates; official mission/history text; bylaws PDF.
4. 2026–27 event calendar (dates make the site look alive on day one).
5. Are forums genuinely in use? (Recommend cutting from nav if not.)
6. Who owns DNS for faemse.org, and who will maintain content after launch?
7. Photography from past workshops/competitions (real photos beat any illustration).
