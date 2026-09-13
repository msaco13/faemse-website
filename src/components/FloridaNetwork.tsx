import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { programCities, programs, type Program, type ProgramCity } from '../content/programs';
import { FL_H, FL_POLYS, FL_W, projectLatLon } from '../lib/florida';
import { T, useText } from '../lib/text';

// The hero's Florida: a solid navy state with a crisp gold coastline and one
// pulsing dot for every city that trains EMTs and paramedics. The dots are
// joined by the shortest tree that reaches them all, lit outward from Orlando
// by short comets until the whole state is connected. Holds, dims, and starts
// again while the tab is visible. Reduced-motion visitors get the finished,
// still network.
//
// Every dot is also a control: hover, tap, or focus it and a card lists the
// programs in that city, while its label grows and comes forward.
//
// The map also zooms. Click it (or a numbered city, or a region button) and
// the wheel zooms toward the cursor up to 5x; drag pans; pinch works on a
// phone. Names and dots grow as you go in, and a city with several schools
// folds open into one dot per campus. Until the map is clicked the wheel
// scrolls the page as usual, so nobody gets trapped in the hero.
//
// Drawn imperatively into an <svg> because the comets and the zoom are
// per-frame updates; React owns the container, the card, and the chrome.

type Labels = 'auto' | 'dense' | 'major';
type CityNode = ProgramCity & { x: number; y: number };
type SchoolNode = { p: Program; city: CityNode; x: number; y: number };
type Item = { city: CityNode; school?: SchoolNode };
type Anchor = 'start' | 'end' | 'middle';
type Box = [number, number, number, number];
type Placed = { dx: number; dy: number; anchor: Anchor; quiet: boolean };
type Edge = {
  a: CityNode; b: CityNode; L: number;
  glow: SVGPathElement; core: SVGPathElement; lit: boolean; busy: boolean;
};
type View = { cx: number; cy: number; k: number };
type Controls = {
  hold: () => void; close: () => void; scheduleClose: () => void;
  enterRegion: (name: string) => void; leave: () => void; placeCard: () => void;
};

const HUB = 'Orlando';
const GOLD = { lt: '#DDAA42', mid: '#C48F26', dk: '#9E6F16', link: '#D6A238', hot: '#FFE4A0' };
const PAD = 60;
const VW = FL_W + PAD * 2, VH = FL_H + PAD * 2;
const NS = 'http://www.w3.org/2000/svg';
const KMAX = 5;
// the drawing area bleeds this far past the box on every side (see the host div)
const BLEED = 0.09;

// One node per city, busiest first, placed from its coordinates.
const CITIES: CityNode[] = programCities().map((c) => {
  const [x, y] = projectLatLon(c.lat, c.lon);
  return { ...c, x, y };
});
const hubCity = CITIES.find((c) => c.name === HUB) ?? CITIES[0];
const cityAt = (name: string) => CITIES.find((c) => c.name === name) ?? hubCity;
const cityByName: Record<string, CityNode> = {};
CITIES.forEach((c) => { cityByName[c.name] = c; });

// One node per school in a city with several, at its campus. Campuses within
// a few hundred metres of each other are nudged apart once so both labels
// can be read at full zoom.
const SCHOOLS: SchoolNode[] = (() => {
  const out: SchoolNode[] = [];
  CITIES.forEach((c) => {
    if (c.programs.length < 2) return;
    c.programs.forEach((p, i) => {
      const [x, y] = p.campus ? projectLatLon(p.campus[0], p.campus[1]) : [c.x + Math.cos(i * 2.1) * 6, c.y + Math.sin(i * 2.1) * 6];
      out.push({ p, city: c, x, y });
    });
  });
  for (let it = 0; it < 40; it++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        // a crowd of five needs more room per school than a pair
        const minD = Math.max(a.city.programs.length, b.city.programs.length) >= 4 ? 13 : 10;
        if (d < minD) {
          const push = (minD - d) / 2, ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return out;
})();

// School labels are placed once, in the space they are drawn in when they
// first appear (about 2.8x, where they are most crowded): each tries right,
// left, below, above and takes the first side clear of its neighbors' labels
// and every dot. Offsets are in label pixels, which is what the label group's
// own scale uses, so the choice holds at any zoom.
const SCHOOL_LABEL: Record<string, { dx: number; dy: number; anchor: Anchor }> = (() => {
  const KL = 2.8, f = Math.sqrt(KL), fs = 11, cw = fs * 0.5, lh = fs, gap = 4, dotR = 6;
  const out: Record<string, { dx: number; dy: number; anchor: Anchor }> = {};
  const boxes: Box[] = [];
  const dots: [number, number][] = [
    ...SCHOOLS.map((s): [number, number] => [s.x * f, s.y * f]),
    ...CITIES.filter((c) => c.programs.length === 1).map((c): [number, number] => [c.x * f, c.y * f]),
  ];
  const hitsDot = (bx: Box) => dots.some(([x, y]) => bx[0] < x + dotR && bx[0] + bx[2] > x - dotR && bx[1] < y + dotR && bx[1] + bx[3] > y - dotR);
  const hitsBox = (bx: Box) => boxes.some((o) => bx[0] < o[0] + o[2] + gap && bx[0] + bx[2] + gap > o[0] && bx[1] < o[1] + o[3] + gap && bx[1] + bx[3] + gap > o[1]);
  // the busiest cities place first, and within a city the westernmost school,
  // so a row of neighbors settles left-to-right
  const order = [...SCHOOLS].sort((a, b) => b.city.programs.length - a.city.programs.length || a.x - b.x);
  for (const s of order) {
    const X = s.x * f, Y = s.y * f, w = (s.p.short ?? s.p.name).length * cw;
    const cands: ({ dx: number; dy: number; anchor: Anchor; box: Box })[] = [
      { dx: 9, dy: 4, anchor: 'start', box: [X + 9, Y - lh / 2, w, lh] },
      { dx: -9, dy: 4, anchor: 'end', box: [X - 9 - w, Y - lh / 2, w, lh] },
      { dx: 0, dy: lh + 7, anchor: 'middle', box: [X - w / 2, Y + 7, w, lh] },
      { dx: 0, dy: -9, anchor: 'middle', box: [X - w / 2, Y - 9 - lh, w, lh] },
      { dx: 7, dy: -7, anchor: 'start', box: [X + 7, Y - 7 - lh, w, lh] },
      { dx: 7, dy: lh + 4, anchor: 'start', box: [X + 7, Y + 4, w, lh] },
      { dx: -7, dy: -7, anchor: 'end', box: [X - 7 - w, Y - 7 - lh, w, lh] },
      { dx: -7, dy: lh + 4, anchor: 'end', box: [X - 7 - w, Y + 4, w, lh] },
    ];
    // nothing clear: point the label away from the rest of the cluster
    const siblings = SCHOOLS.filter((o) => o.city === s.city && o !== s);
    const meanX = siblings.reduce((a, o) => a + o.x, 0) / (siblings.length || 1);
    const pick = cands.find((k) => !hitsBox(k.box) && !hitsDot(k.box)) ?? cands[s.x >= meanX ? 0 : 1];
    boxes.push(pick.box);
    out[s.p.name] = { dx: pick.dx, dy: pick.dy, anchor: pick.anchor };
  }
  return out;
})();

// The zoom shortcuts: each one frames its cities (and their schools).
const REGIONS: { name: string; cities: string[] }[] = [
  { name: 'South Florida', cities: ['Coral Springs', 'Davie', 'Miami Shores', 'Miami'] },
  { name: 'Treasure Coast', cities: ['Fort Pierce', 'Palm Beach Gardens', 'West Palm Beach', 'Lake Worth Beach'] },
  { name: 'Southwest', cities: ['Port Charlotte', 'Fort Myers'] },
  { name: 'Tampa Bay', cities: ['New Port Richey', 'Tampa', 'Pinellas Park', 'St. Petersburg', 'Bradenton'] },
  { name: 'Central Florida', cities: ['Eustis', 'Sanford', 'Orlando', 'Winter Haven'] },
  { name: 'First Coast', cities: ['Jacksonville', 'Orange Park', 'St. Augustine'] },
  { name: 'Ocala', cities: ['Ocala', 'Gainesville'] },
  { name: 'Pensacola', cities: ['Pensacola', 'Niceville'] },
].filter((r) => r.cities.every((c) => cityByName[c]));
const regionOf: Record<string, string> = {};
REGIONS.forEach((r) => r.cities.forEach((c) => { regionOf[c] = r.name; }));

// The roads: a minimum spanning tree (Prim, grown from the hub) in map space,
// so the network is the shortest set of links that reaches every city and the
// reveal naturally spreads outward from Orlando.
const EDGES: [CityNode, CityNode][] = (() => {
  const inTree = new Set<CityNode>([hubCity]);
  const edges: [CityNode, CityNode][] = [];
  while (inTree.size < CITIES.length) {
    let best: { a: CityNode; b: CityNode; d: number } | null = null;
    for (const a of inTree) {
      for (const b of CITIES) {
        if (inTree.has(b)) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (!best || d < best.d) best = { a, b, d };
      }
    }
    if (!best) break;
    inTree.add(best.b);
    edges.push([best.a, best.b]);
  }
  return edges;
})();

const CENTER = [(hubCity.x + cityAt('Tampa').x) / 2, (hubCity.y + cityAt('Gainesville').y) / 2];
// a gentle curve bowing toward the middle of the state keeps every link on land
const linkPath = (a: CityNode, b: CityNode) => {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, nx = -dy / len, ny = dx / len;
  const side = (CENTER[0] - mx) * nx + (CENTER[1] - my) * ny > 0 ? 1 : -1;
  const off = len * 0.07 * side;
  return `M${a.x},${a.y} Q${mx + nx * off},${my + ny * off} ${b.x},${b.y}`;
};
const coastD = FL_POLYS.map((poly) => 'M' + poly.map((p) => `${p[0]},${p[1]}`).join('L') + 'Z').join('');
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Label placement: the busiest cities claim space first; the rest try four
// sides and go hover-only when nothing fits. Widths are estimated from the
// character count because the text is measured before it is in the document.
// Offsets are relative to the dot, since labels move with their dot when the
// map zooms.
function placeLabels(mode: Labels): Record<string, Placed> {
  const fs = mode === 'dense' ? 11 : 12, cw = fs * 0.82, lh = fs, dotR = 9, gap = 5;
  const order = [...CITIES].sort((a, b) => b.programs.length - a.programs.length || a.y - b.y);
  const boxes: Box[] = [], out: Record<string, Placed> = {};
  const hitsDot = (bx: Box) => CITIES.some((c) => bx[0] < c.x + dotR && bx[0] + bx[2] > c.x - dotR && bx[1] < c.y + dotR && bx[1] + bx[3] > c.y - dotR);
  const hitsBox = (bx: Box) => boxes.some((o) => bx[0] < o[0] + o[2] + gap && bx[0] + bx[2] + gap > o[0] && bx[1] < o[1] + o[3] + gap && bx[1] + bx[3] + gap > o[1]);
  const inBounds = (bx: Box) => bx[0] > -PAD && bx[0] + bx[2] < FL_W + PAD && bx[1] > -PAD && bx[1] + bx[3] < FL_H + PAD;
  for (const c of order) {
    const w = c.name.length * cw;
    const cands: (Placed & { box: Box })[] = [
      { dx: 11, dy: 4.5, anchor: 'start', quiet: false, box: [c.x + 11, c.y - lh / 2, w, lh] },
      { dx: -11, dy: 4.5, anchor: 'end', quiet: false, box: [c.x - 11 - w, c.y - lh / 2, w, lh] },
      { dx: 0, dy: 20, anchor: 'middle', quiet: false, box: [c.x - w / 2, c.y + 9, w, lh] },
      { dx: 0, dy: -12, anchor: 'middle', quiet: false, box: [c.x - w / 2, c.y - 21, w, lh] },
    ];
    // on phones only the cities with more than one program get printed
    const wanted = mode !== 'major' || c.programs.length >= 2;
    const pick = wanted ? cands.find((k) => inBounds(k.box) && !hitsBox(k.box) && !hitsDot(k.box)) : undefined;
    if (pick) {
      boxes.push(pick.box);
      out[c.name] = { dx: pick.dx, dy: pick.dy, anchor: pick.anchor, quiet: false };
    } else {
      const k = cands[0];
      out[c.name] = { dx: k.dx, dy: k.dy, anchor: k.anchor, quiet: true };
    }
  }
  return out;
}

export default function FloridaNetwork({
  className = '',
  labels = 'auto',
  chipTo,
  regions = true,
}: {
  className?: string;
  labels?: Labels;
  chipTo?: string;
  // the row of zoom shortcuts under the map
  regions?: boolean;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState('Connecting');
  const [done, setDone] = useState(false);
  const [active, setActive] = useState<Item | null>(null);
  // bumped by Enter/Space on a dot; the effect below moves focus into the card once it has rendered
  const [focusReq, setFocusReq] = useState(0);
  // a pinned card ignores pointerleave; the listeners are built once, so they read a ref rather than state
  const pinned = useRef(false);
  const ctl = useRef<Controls | null>(null);
  // zoom chrome: shown while zoomed in; the region name when a shortcut framed the view
  const [zoomed, setZoomed] = useState(false);
  const [zoomLabel, setZoomLabel] = useState('');
  const [region, setRegion] = useState('');
  // "engaged": the map has been clicked, so the wheel zooms instead of scrolling the page
  const [engaged, setEngaged] = useState(false);
  // 'auto' prints every label on a wide screen and only the busy cities on a
  // phone, where 40 names at half scale are a smear. Re-resolved on rotation.
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 640px)').matches);
  useEffect(() => {
    const mq = matchMedia('(max-width: 640px)');
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const mode: Labels = labels === 'auto' && narrow ? 'major' : labels;
  const ariaLabel = useText('map.aria', 'Map of Florida EMS programs');
  const doneWording = useText('map.done', 'EMS programs · one network');
  const backWording = useText('map.back', '← Florida');
  const allWording = useText('map.regions.all', 'All of Florida');
  const zoomInWording = useText('map.zoomin', 'Zoom in · see the schools apart ⤢');
  const hintIdle = useText('map.hint.idle', 'Click a numbered city to open its region, or click the map and scroll to zoom.');
  const hintEngaged = useText('map.hint.engaged', 'Scroll to zoom in and out · drag to move · Esc to release the map');
  const noSite = useText('map.card.nosite', 'No website listed');
  const visit = useText('map.card.visit', 'Visit the school');

  useEffect(() => {
    const box = root.current, stage = host.current, wrap = outer.current;
    if (!box || !stage || !wrap) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const placed = placeLabels(mode);
    // The hit target is sized in screen pixels, not map units: at phone width
    // the map draws at about half scale and a 16-unit circle is a 15px tap.
    // Capped so neighbors a few units apart don't swallow each other.
    const scale = stage.getBoundingClientRect().width / VW || 1;
    const hitR = Math.min(28, Math.max(16, 20 / scale));

    const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element): SVGElementTagNameMap[K] => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, String(attrs[k]));
      parent.appendChild(e);
      return e;
    };

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `${-PAD} ${-PAD} ${VW} ${VH}`);
    svg.innerHTML =
      '<defs>' +
      `<radialGradient id="fl-pool" cx="${hubCity.x}" cy="${hubCity.y}" r="500" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1B3E78" stop-opacity=".9"/><stop offset=".55" stop-color="#0E2650" stop-opacity=".5"/><stop offset="1" stop-color="#0A213B" stop-opacity="0"/></radialGradient>` +
      '<radialGradient id="fl-halo"><stop offset="0" stop-color="#FFE1A0" stop-opacity=".95"/><stop offset=".3" stop-color="#D9A63A" stop-opacity=".45"/><stop offset="1" stop-color="#D9A63A" stop-opacity="0"/></radialGradient>' +
      '<pattern id="fl-dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#9DB9F0" fill-opacity=".22"/></pattern>' +
      `<linearGradient id="fl-coast" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD.lt}"/><stop offset=".5" stop-color="${GOLD.mid}"/><stop offset="1" stop-color="${GOLD.dk}"/></linearGradient>` +
      `<clipPath id="fl-land"><path d="${coastD}"/></clipPath>` +
      '<linearGradient id="fl-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A3B72"/><stop offset="1" stop-color="#0F2650"/></linearGradient>' +
      '</defs>';
    // the pool reaches well past the frame so a zoomed view never shows its edge
    el('rect', { x: -PAD * 4, y: -PAD * 4, width: VW + PAD * 6, height: VH + PAD * 6, fill: 'url(#fl-pool)', 'pointer-events': 'none' }, svg);
    el('path', { d: coastD, fill: 'url(#fl-fill)', 'fill-opacity': '.92', 'pointer-events': 'none' }, svg);
    el('rect', { x: -PAD, y: -PAD, width: VW, height: VH, fill: 'url(#fl-dots)', 'clip-path': 'url(#fl-land)', 'pointer-events': 'none' }, svg);
    el('path', { d: coastD, fill: 'none', stroke: '#000', 'stroke-opacity': '.35', 'stroke-width': '4', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, svg);
    el('path', { d: coastD, fill: 'none', stroke: 'url(#fl-coast)', 'stroke-width': '2', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, svg);

    // labels live in their own group above the dots so a grown label can be moved to the top of the pile
    const road = el('g', { 'pointer-events': 'none' }, svg), fx = el('g', { 'pointer-events': 'none' }, svg);
    const nodes = el('g', {}, svg), schoolG = el('g', {}, svg);
    const lblG = el('g', { 'aria-hidden': 'true' }, svg), schoolLbl = el('g', { 'aria-hidden': 'true' }, svg);
    const edges: Edge[] = EDGES.map(([a, b]) => {
      const d = linkPath(a, b);
      // No non-scaling-stroke on the links: their dash length is the path
      // length in user units, and the two must live in the same space or the
      // reveal runs ahead of (or behind) the comet once the map is scaled.
      const glow = el('path', { d, fill: 'none', stroke: GOLD.link, 'stroke-width': '4', 'stroke-linecap': 'round' }, road);
      glow.style.filter = 'blur(1px)';
      const core = el('path', { d, fill: 'none', stroke: '#F1CC70', 'stroke-width': '1.3', 'stroke-linecap': 'round' }, road);
      const L = core.getTotalLength();
      [glow, core].forEach((p) => { p.style.strokeDasharray = String(L); p.style.strokeDashoffset = String(reduced ? 0 : L); });
      glow.style.strokeOpacity = reduced ? '.3' : '0';
      core.style.strokeOpacity = reduced ? '.8' : '0';
      return { a, b, L, glow, core, lit: false, busy: false };
    });

    // Every dot and label is drawn at (0,0) inside a group and placed by a
    // transform: translate(x,y) scale(s). Zooming only rewrites the transform,
    // with s shrinking slower than the map grows, so names and dots get bigger
    // as you go in without turning into billboards.
    const flashOf: Record<string, SVGCircleElement> = {}, groupOf: Record<string, SVGGElement> = {};
    const lblOf: Record<string, SVGTextElement> = {}, lblGroupOf: Record<string, SVGGElement> = {};
    const makeNode = (parent: SVGGElement, cls: string, n: number, label: string, hub: boolean) => {
      const r = n >= 4 ? 6.5 : n >= 2 ? 5 : 3.2;
      const g = el('g', { class: cls, role: 'button', tabindex: '0', 'aria-label': label }, parent);
      const h = el('circle', { r: hub ? 24 : 15 + n * 1.5, fill: 'url(#fl-halo)', class: 'fl-halo' }, g);
      h.style.animationDelay = `${-((Math.random() * 4.5) % 4.5)}s`;
      const core = el('circle', { r, fill: GOLD.hot, class: 'fl-core' }, g);
      core.style.animationDelay = `${-((Math.random() * 3) % 3)}s`;
      if (n >= 2) {
        const t = el('text', { y: 3, class: 'fl-count', 'aria-hidden': 'true' }, g);
        t.textContent = String(n);
      }
      // two rings: the landing flare is a run-once animation whose end state sticks to the
      // element, so the hover ring is a separate circle that nothing ever animates
      const flash = el('circle', { r: r + 2, fill: 'none', stroke: '#FFF3D0', 'stroke-width': '1.2', 'vector-effect': 'non-scaling-stroke', class: 'fl-flash' }, g);
      el('circle', { r: r + 3, fill: 'none', 'vector-effect': 'non-scaling-stroke', class: 'fl-ring' }, g);
      // a generous invisible target so small dots are easy to hit, with room for a thumb
      el('circle', { r: hitR, fill: 'transparent' }, g);
      return { g, flash };
    };
    CITIES.forEach((c) => {
      const n = c.programs.length;
      const m = makeNode(nodes, 'fl-city', n, `${c.name}, ${n} program${n === 1 ? '' : 's'}`, c === hubCity);
      groupOf[c.name] = m.g;
      flashOf[c.name] = m.flash;
      const L = placed[c.name];
      const lg = el('g', {}, lblG);
      lblGroupOf[c.name] = lg;
      const t = el('text', { x: L.dx, y: L.dy, 'text-anchor': L.anchor, class: `fl-lbl${mode === 'dense' ? ' dense' : ''}${L.quiet ? ' quiet' : ''}` }, lg);
      t.textContent = c.name.toUpperCase();
      lblOf[c.name] = t;
    });
    const schoolNode: Record<string, { g: SVGGElement; flash: SVGCircleElement }> = {};
    const schoolLabel: Record<string, { g: SVGGElement; t: SVGTextElement }> = {};
    SCHOOLS.forEach((s) => {
      const m = makeNode(schoolG, 'fl-school', 1, s.p.name, false);
      schoolNode[s.p.name] = m;
      const lg = el('g', {}, schoolLbl);
      const P = SCHOOL_LABEL[s.p.name];
      const t = el('text', { x: P.dx, y: P.dy, 'text-anchor': P.anchor, class: 'fl-lbl school' }, lg);
      t.textContent = s.p.short ?? s.p.name;
      schoolLabel[s.p.name] = { g: lg, t };
    });
    stage.appendChild(svg);

    // ---- the view: where the frame is and how far in ----
    let view: View = { cx: FL_W / 2, cy: FL_H / 2, k: 1 };
    let K = 1, split = 0, anim = 0, regionName = '', engagedNow = false;
    let current: Item | null = null, closeT = 0, restoring = false;
    let schoolsLive = false;
    const setView = (v: View) => {
      v.k = clamp(v.k, 1, KMAX);
      const w = VW / v.k, h = VH / v.k;
      // at 1x the state is centred; zoomed in you can pan, but not off the map
      if (v.k === 1) { v.cx = FL_W / 2; v.cy = FL_H / 2; }
      else { v.cx = clamp(v.cx, w / 2 - PAD, FL_W + PAD - w / 2); v.cy = clamp(v.cy, h / 2 - PAD, FL_H + PAD - h / 2); }
      view = v; K = v.k;
      svg.setAttribute('viewBox', `${v.cx - w / 2} ${v.cy - h / 2} ${w} ${h}`);
      // schools fold out of their city between 1.3x and 2.8x
      split = clamp((K - 1.3) / 1.5, 0, 1);
      const sDot = Math.pow(K, 0.4) / K, sLbl = Math.pow(K, 0.55) / K, sSch = Math.pow(K, 0.5) / K;
      CITIES.forEach((c) => {
        const g = groupOf[c.name], cluster = c.programs.length >= 2;
        g.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${sDot})`);
        g.style.opacity = cluster ? String(1 - split) : '';
        g.style.pointerEvents = cluster && split > 0.5 ? 'none' : '';
        lblGroupOf[c.name].setAttribute('transform', `translate(${c.x} ${c.y}) scale(${sLbl})`);
        lblOf[c.name].style.opacity = cluster ? String(1 - split) : '';
      });
      const schoolLblOn = clamp((K - 2) / 0.8, 0, 1);
      // folded-away schools, and ones outside the frame, leave the tab order:
      // a button nobody can see is a keyboard trap
      const live = split > 0.5;
      const x0 = v.cx - w / 2, y0 = v.cy - h / 2;
      SCHOOLS.forEach((s) => {
        const x = s.city.x + (s.x - s.city.x) * split, y = s.city.y + (s.y - s.city.y) * split;
        const g = schoolNode[s.p.name].g;
        g.setAttribute('transform', `translate(${x} ${y}) scale(${sDot})`);
        g.style.opacity = String(split);
        g.style.pointerEvents = live ? '' : 'none';
        const inFrame = live && x > x0 && x < x0 + w && y > y0 && y < y0 + h;
        if ((g.getAttribute('tabindex') === '0') !== inFrame) g.setAttribute('tabindex', inFrame ? '0' : '-1');
        const l = schoolLabel[s.p.name].g;
        l.setAttribute('transform', `translate(${x} ${y}) scale(${sSch})`);
        l.style.opacity = String(schoolLblOn);
      });
      if (live !== schoolsLive) {
        schoolsLive = live;
        schoolG.setAttribute('aria-hidden', live ? 'false' : 'true');
      }
      const sLine = Math.pow(K, 0.3) / K;
      edges.forEach((e) => { e.glow.style.strokeWidth = `${4 * sLine}px`; e.core.style.strokeWidth = `${1.3 * sLine}px`; });
      const z = K > 1.02;
      box.classList.toggle('zoomed', z);
      setZoomed(z);
      setZoomLabel(regionName || (z ? `${Math.round(K * 10) / 10}× zoom` : ''));
      if (!z && regionName) { regionName = ''; setRegion(''); }
      placeCard();
    };
    const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const goTo = (v: View, after?: () => void) => {
      cancelAnimationFrame(anim);
      const from = { ...view }, t0 = performance.now(), dur = reduced ? 0 : 950;
      const frame = (now: number) => {
        const u = dur ? Math.min(1, (now - t0) / dur) : 1, e = ease(u);
        setView({ cx: from.cx + (v.cx - from.cx) * e, cy: from.cy + (v.cy - from.cy) * e, k: from.k + (v.k - from.k) * e });
        if (u < 1) anim = requestAnimationFrame(frame);
        else after?.();
      };
      anim = requestAnimationFrame(frame);
    };
    const engage = (on: boolean) => { engagedNow = on; box.classList.toggle('engaged', on); setEngaged(on); };
    const regionView = (r: { cities: string[] }): View => {
      const pts: [number, number][] = [];
      r.cities.forEach((cn) => {
        const c = cityByName[cn];
        pts.push([c.x, c.y]);
        SCHOOLS.forEach((s) => { if (s.city === c) pts.push([s.x, s.y]); });
      });
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const w = x1 - x0 + 130, h = y1 - y0 + 90;
      const k = Math.min(KMAX, VW / Math.max(w, 160), VH / Math.max(h, 160));
      return { cx: (x0 + x1) / 2 + 10 / k, cy: (y0 + y1) / 2, k };
    };
    const enterRegion = (name: string) => {
      const r = REGIONS.find((x) => x.name === name);
      if (!r) return;
      close();
      regionName = name;
      setRegion(name);
      engage(true);
      goTo(regionView(r), () => flare(r.cities.flatMap((cn) => cityByName[cn].programs.map((p) => p.name)).filter((n) => schoolNode[n]).map((n) => schoolNode[n].flash), 0.9));
    };
    const leave = () => {
      close();
      regionName = '';
      setRegion('');
      engage(false);
      goTo({ cx: FL_W / 2, cy: FL_H / 2, k: 1 });
    };

    // wheel zoom only once the map has been clicked (or with ctrl held), so
    // the page still scrolls past the hero for everyone else; zooms toward the cursor
    const mapPoint = (e: { clientX: number; clientY: number }) => {
      const r = stage.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      return { x: view.cx - VW / view.k / 2 + fx * VW / view.k, y: view.cy - VH / view.k / 2 + fy * VH / view.k, fx, fy };
    };
    const onWheel = (e: WheelEvent) => {
      if (!engagedNow && !e.ctrlKey) return;
      const dir = e.deltaY > 0 ? -1 : 1;
      // scrolled all the way out: hand the wheel back to the page
      if (dir < 0 && view.k <= 1) { engage(false); return; }
      e.preventDefault();
      cancelAnimationFrame(anim);
      const p = mapPoint(e), k = clamp(view.k * Math.exp(dir * Math.min(Math.abs(e.deltaY), 60) * 0.006), 1, KMAX);
      const w = VW / k, h = VH / k;
      if (regionName) { regionName = ''; setRegion(''); }
      setView({ cx: p.x - (p.fx - 0.5) * w, cy: p.y - (p.fy - 0.5) * h, k });
    };
    // drag to pan while zoomed
    let drag: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
    let justDragged = false;
    const onDown = (e: PointerEvent) => {
      if (view.k <= 1 || e.button !== 0) return;
      // stops the browser selecting label text and dragging that instead of the map
      e.preventDefault();
      drag = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false };
      box.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const r = stage.getBoundingClientRect();
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
      if (!drag.moved) return;
      box.classList.add('dragging');
      if (current && !pinned.current) close();
      cancelAnimationFrame(anim);
      setView({ cx: drag.cx - (e.clientX - drag.x) / r.width * VW / view.k, cy: drag.cy - (e.clientY - drag.y) / r.height * VH / view.k, k: view.k });
    };
    const onUp = () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      box.classList.remove('dragging');
      if (moved) { justDragged = true; setTimeout(() => { justDragged = false; }, 0); }
    };
    const onBoxClick = () => { if (!justDragged && !engagedNow) engage(true); };
    // pinch on touch screens
    let pinch: { d: number; k: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e: TouchEvent) => { if (e.touches.length === 2) pinch = { d: dist(e.touches), k: view.k }; };
    const onTouchMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      setView({ cx: view.cx, cy: view.cy, k: pinch.k * dist(e.touches) / pinch.d });
    };
    const onTouchEnd = () => { pinch = null; };
    box.addEventListener('wheel', onWheel, { passive: false });
    box.addEventListener('pointerdown', onDown);
    box.addEventListener('pointermove', onMove);
    box.addEventListener('pointerup', onUp);
    box.addEventListener('pointercancel', onUp);
    box.addEventListener('click', onBoxClick);
    box.addEventListener('dragstart', (e) => e.preventDefault());
    box.addEventListener('touchstart', onTouchStart, { passive: true });
    box.addEventListener('touchmove', onTouchMove, { passive: false });
    box.addEventListener('touchend', onTouchEnd);

    // ---- the card ----
    // The card is a child of the frame, not the bleeding drawing area, so a
    // zoomed view's feathered edge never fades it; positions are converted.
    const itemXY = (item: Item): [number, number] => {
      if (item.school) return [item.city.x + (item.school.x - item.city.x) * split, item.city.y + (item.school.y - item.city.y) * split];
      return [item.city.x, item.city.y];
    };
    const placeCard = () => {
      const d = card.current;
      if (!d || !current) return;
      const [x, y] = itemXY(current), w = VW / view.k, h = VH / view.k;
      const px = (((x - (view.cx - w / 2)) / w) * (1 + BLEED * 2) - BLEED) * 100;
      const py = (((y - (view.cy - h / 2)) / h) * (1 + BLEED * 2) - BLEED) * 100;
      d.style.left = d.style.right = d.style.top = d.style.bottom = '';
      if (px > 55) d.style.right = `calc(${100 - px}% + 16px)`; else d.style.left = `calc(${px}% + 16px)`;
      if (py > 62) d.style.bottom = `calc(${100 - py}% - 10px)`; else d.style.top = `calc(${py}% - 10px)`;
    };
    const groupFor = (item: Item) => (item.school ? schoolNode[item.school.p.name].g : groupOf[item.city.name]);
    const labelFor = (item: Item) => (item.school ? schoolLabel[item.school.p.name].t : lblOf[item.city.name]);
    const open = (item: Item) => {
      clearTimeout(closeT);
      if (current && current !== item) {
        groupFor(current).classList.remove('is-active');
        labelFor(current).classList.remove('on');
      }
      current = item;
      groupFor(item).classList.add('is-active');
      const t = labelFor(item);
      t.classList.add('on');
      // last drawn is on top, so the grown label clears its neighbors
      const lg = t.parentNode as SVGGElement;
      lg.parentNode?.appendChild(lg);
      setActive(item);
    };
    const close = () => {
      if (!current) return;
      groupFor(current).classList.remove('is-active');
      labelFor(current).classList.remove('on');
      // Escape from inside the card should hand keyboard focus back to the dot, not drop it.
      // The dot's focus listener would reopen the card, so it is told to stand down for this one.
      if (card.current?.contains(document.activeElement)) {
        restoring = true;
        groupFor(current).focus({ preventScroll: true });
        restoring = false;
      }
      current = null;
      pinned.current = false;
      setActive(null);
    };
    const scheduleClose = () => {
      if (pinned.current) return;
      clearTimeout(closeT);
      closeT = window.setTimeout(close, 180);
    };
    ctl.current = { hold: () => clearTimeout(closeT), close, scheduleClose, enterRegion, leave, placeCard };
    const wire = (g: SVGGElement, item: Item, cluster: boolean) => {
      // touch has no hover: a tap goes straight to click, which pins
      g.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch' || drag) return; if (!pinned.current) open(item); });
      g.addEventListener('pointerleave', scheduleClose);
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        if (justDragged) return;
        engage(true);
        // a numbered city is a door into its region; everything else pins its card
        if (cluster && split < 1 && regionOf[item.city.name]) { enterRegion(regionOf[item.city.name]); return; }
        if (current === item && pinned.current) { close(); return; }
        open(item);
        pinned.current = true;
      });
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (cluster && split < 1 && regionOf[item.city.name]) { enterRegion(regionOf[item.city.name]); return; }
          open(item);
          pinned.current = true;
          setFocusReq((n) => n + 1);
        }
        if (e.key === 'Escape') close();
      });
      g.addEventListener('focus', () => { if (!pinned.current && !restoring) open(item); });
      // Tabbing from the dot into its own card is not leaving: the card's
      // onBlur takes over from there and closes when focus exits the pair.
      g.addEventListener('blur', (e) => {
        if (pinned.current || card.current?.contains(e.relatedTarget as Node | null)) return;
        scheduleClose();
      });
    };
    CITIES.forEach((c) => wire(groupOf[c.name], { city: c }, c.programs.length >= 2));
    SCHOOLS.forEach((s) => wire(schoolNode[s.p.name].g, { city: s.city, school: s }, false));
    const onDocClick = (e: MouseEvent) => {
      if (pinned.current) close();
      if (engagedNow && !wrap.contains(e.target as Node)) engage(false);
    };
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (current) close();
      else if (view.k > 1) leave();
      else engage(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKey);
    setView(view);
    const teardown = () => {
      clearTimeout(closeT);
      cancelAnimationFrame(anim);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onDocKey);
      box.removeEventListener('wheel', onWheel);
      box.removeEventListener('pointerdown', onDown);
      box.removeEventListener('pointermove', onMove);
      box.removeEventListener('pointerup', onUp);
      box.removeEventListener('pointercancel', onUp);
      box.removeEventListener('click', onBoxClick);
      box.removeEventListener('touchstart', onTouchStart);
      box.removeEventListener('touchmove', onTouchMove);
      box.removeEventListener('touchend', onTouchEnd);
      box.classList.remove('zoomed', 'engaged', 'dragging');
      ctl.current = null;
      pinned.current = false;
      setActive(null);
      svg.remove();
    };

    // Restarting a run-once animation needs a reflow between "none" and the
    // new value; when the whole state lands at once, one reflow serves all 40.
    const flare = (rings: SVGCircleElement[], dur = 1) => {
      rings.forEach((r) => { r.style.animation = 'none'; });
      void rings[0]?.getBBox();
      rings.forEach((r) => { r.style.animation = `fl-land ${dur}s ease-out forwards`; });
    };
    if (reduced) {
      setDone(true);
      return teardown;
    }

    let alive = true;
    const timers: number[] = [];
    const frames = new Set<number>();
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(() => { if (alive) fn(); }, ms)); };
    const raf = (fn: FrameRequestCallback) => { const id = requestAnimationFrame((t) => { frames.delete(id); if (alive) fn(t); }); frames.add(id); };

    // a comet along one link: white-hot head, short tapered gold tail; the link stays lit behind it
    const seg = (lk: Edge, u0: number, u1: number, rev: boolean) => {
      const pts: string[] = [];
      for (let i = 0; i <= 10; i++) {
        const uu = Math.max(0, Math.min(1, u0 + ((u1 - u0) * i) / 10));
        const pt = lk.core.getPointAtLength((rev ? 1 - uu : uu) * lk.L);
        pts.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
      }
      return 'M' + pts.join('L');
    };
    const comet = (lk: Edge, rev: boolean, reveal: boolean, done?: () => void) => {
      const g = el('g', {}, fx);
      const t1 = el('path', { fill: 'none', stroke: '#E9C76E', 'stroke-width': '1.2', 'stroke-opacity': '.35', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
      const t2 = el('path', { fill: 'none', stroke: '#FFE1A0', 'stroke-width': '1.8', 'stroke-opacity': '.6', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
      const t3 = el('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': '2', 'stroke-opacity': '.95', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', class: 'fl-head' }, g);
      const hd = el('circle', { r: 2.8, fill: '#fff', class: 'fl-head' }, g);
      // the tree has many short hops, so comets move faster than the old hand-picked links
      const t0 = performance.now(), dur = Math.max(650, (lk.L / 200) * 1000);
      if (reveal && rev) { lk.glow.style.strokeDashoffset = lk.core.style.strokeDashoffset = String(-lk.L); }
      const frame = (now: number) => {
        const u = Math.min(1, (now - t0) / dur), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        t1.setAttribute('d', seg(lk, e - 0.3, e, rev));
        t2.setAttribute('d', seg(lk, e - 0.16, e, rev));
        t3.setAttribute('d', seg(lk, e - 0.06, e, rev));
        const pt = lk.core.getPointAtLength((rev ? 1 - e : e) * lk.L);
        hd.setAttribute('cx', String(pt.x));
        hd.setAttribute('cy', String(pt.y));
        hd.setAttribute('r', String((2.8 * Math.pow(K, 0.4)) / K));
        if (reveal) {
          const off = lk.L * (1 - e);
          lk.glow.style.strokeDashoffset = lk.core.style.strokeDashoffset = String(rev ? -off : off);
          lk.glow.style.strokeOpacity = '.35';
          lk.core.style.strokeOpacity = '.9';
        }
        if (u < 1) raf(frame);
        else { g.remove(); flare([flashOf[rev ? lk.a.name : lk.b.name]], 1); done?.(); }
      };
      raf(frame);
    };

    // build outward from Orlando: a link may light once one of its ends is lit; up to four comets at a time
    let waiting = false;
    const cycle = () => {
      timers.splice(0).forEach(clearTimeout);
      edges.forEach((lk) => {
        lk.lit = false; lk.busy = false;
        lk.glow.style.transition = lk.core.style.transition = 'none';
        lk.glow.style.strokeDashoffset = lk.core.style.strokeDashoffset = String(lk.L);
        lk.glow.style.strokeOpacity = lk.core.style.strokeOpacity = '0';
      });
      const litCity: Record<string, boolean> = { [hubCity.name]: true };
      let inflight = 0, joined = 0;
      setDone(false);
      setPhase(`Connecting · 0 of ${edges.length}`);
      flare([flashOf[hubCity.name]], 1);
      const finish = () => {
        setDone(true);
        later(() => flare(CITIES.map((c) => flashOf[c.name]), 1.2), 300);
        // while connected, quiet signals keep moving between neighbors
        for (let s = 0; s < 8; s++) later(() => comet(edges[(s * 7 + 3) % edges.length], s % 2 === 0, false), 1500 + s * 800);
        later(() => {
          setDone(false);
          setPhase('Reaching out again');
          edges.forEach((lk) => {
            lk.glow.style.transition = lk.core.style.transition = 'stroke-opacity 1.6s ease';
            lk.glow.style.strokeOpacity = lk.core.style.strokeOpacity = '0';
          });
        }, 11000);
        later(() => { if (document.visibilityState === 'visible') cycle(); else waiting = true; }, 13000);
      };
      const step = () => {
        if (joined === edges.length) return finish();
        if (inflight >= 4) return;
        const cand = edges.filter((lk) => !lk.lit && !lk.busy && (litCity[lk.a.name] || litCity[lk.b.name]));
        if (!cand.length) return;
        const lk = cand[Math.floor(Math.random() * cand.length)], rev = !litCity[lk.a.name];
        lk.busy = true; inflight++;
        comet(lk, rev, true, () => {
          lk.lit = true; lk.busy = false; inflight--; joined++;
          litCity[lk.a.name] = litCity[lk.b.name] = true;
          setPhase(`Connecting · ${joined} of ${edges.length}`);
          step();
          later(step, 260);
        });
      };
      step(); later(step, 350); later(step, 700); later(step, 1000);
    };
    const onVis = () => { if (document.visibilityState === 'visible' && waiting) { waiting = false; cycle(); } };
    document.addEventListener('visibilitychange', onVis);
    cycle();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      frames.forEach(cancelAnimationFrame);
      document.removeEventListener('visibilitychange', onVis);
      teardown();
    };
  }, [mode]);

  // Enter/Space on a dot pins its card and puts the keyboard on the first link in it.
  useEffect(() => {
    if (!focusReq) return;
    card.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [focusReq]);

  // The card's hover hold uses native listeners, not React's onPointerEnter: the
  // pointer arrives from the imperatively built SVG, which React's enter/leave
  // bookkeeping doesn't see, so the synthetic events never fire and the dot's
  // pending close would win. Re-bound whenever the card mounts for a new city,
  // which is also when it first needs placing.
  useEffect(() => {
    const d = card.current;
    if (!d) return;
    ctl.current?.placeCard();
    const hold = () => ctl.current?.hold();
    const leave = () => ctl.current?.scheduleClose();
    d.addEventListener('pointerenter', hold);
    d.addEventListener('pointerleave', leave);
    return () => {
      d.removeEventListener('pointerenter', hold);
      d.removeEventListener('pointerleave', leave);
    };
  }, [active]);

  const n = active?.city.programs.length ?? 0;
  const school = active?.school;
  const chip =
    'inline-flex items-center gap-2 font-disp font-semibold text-[12px] tracking-[0.2em] uppercase border bg-white/5 px-3 py-1.5 rounded-full backdrop-blur tabular-nums whitespace-nowrap transition-colors max-sm:text-[11px] max-sm:tracking-[0.14em] ' +
    (done ? 'border-brand-goldsoft/45 text-brand-goldsoft' : 'border-white/15 text-[#C9D6EE]');
  const chipBody = (
    <>
      <i className="w-[7px] h-[7px] rounded-full bg-brand-green shadow-[0_0_10px_rgba(58,219,143,.9)] animate-pulse motion-reduce:animate-none" aria-hidden />
      {done ? `${programs.length} ${doneWording}` : phase}
    </>
  );
  const pill =
    'font-disp font-semibold text-[12px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-goldsoft focus-visible:outline-offset-2 ';

  return (
    <div ref={outer} className={className}>
      <div ref={root} className="fl-stage relative w-full aspect-[700/683]" role="group" aria-label={ariaLabel}>
        <div ref={host} className="fl-host absolute -inset-[9%] [&>svg]:w-full [&>svg]:h-full [&>svg]:overflow-visible" />
        {/* zoom breadcrumb: the way back, and where you are */}
        <div
          className={`absolute left-0 -top-2 z-[4] flex items-center gap-2.5 transition-[opacity,transform] duration-300 ${zoomed ? 'opacity-100' : 'opacity-0 -translate-y-1 pointer-events-none'}`}
          aria-hidden={!zoomed}
        >
          <button
            type="button"
            tabIndex={zoomed ? 0 : -1}
            onClick={(e) => { e.stopPropagation(); ctl.current?.leave(); }}
            className={`${pill}text-white border-white/20 bg-white/10 backdrop-blur hover:border-brand-gold hover:text-brand-goldsoft`}
          >
            {backWording}
          </button>
          <span className="font-disp font-semibold text-[12px] tracking-[0.18em] uppercase text-brand-goldsoft bg-ink/75 backdrop-blur px-3 py-1.5 rounded-full tabular-nums">{zoomLabel}</span>
        </div>
        {active && (
          <div
            ref={card}
            role="dialog"
            aria-label={school ? school.p.name : `Programs in ${active.city.name}`}
            className="fl-pop absolute z-[5] min-w-[230px] max-w-[320px] px-4 pt-3.5 pb-3 rounded-2xl bg-ink2/[.97] border border-white/15 shadow-[0_24px_60px_rgba(4,10,22,.6)] text-white before:content-[''] before:absolute before:inset-x-4 before:top-0 before:h-[2px] before:rounded-sm before:bg-gradient-to-r before:from-brand-goldsoft before:to-brand-golddeep"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') ctl.current?.close(); }}
            // an unpinned card that was opened by focusing its dot closes once the
            // keyboard leaves it (shift-tab back onto the dot reopens, cancelling this)
            onBlur={(e) => {
              if (pinned.current || card.current?.contains(e.relatedTarget as Node | null)) return;
              ctl.current?.scheduleClose();
            }}
          >
            {school ? (
              <>
                <div className="font-disp font-bold text-[19px] tracking-[0.06em] uppercase leading-none">{school.p.name}</div>
                <div className="font-disp font-semibold text-[11.5px] tracking-[0.2em] uppercase text-brand-goldsoft mt-1.5">
                  {active.city.name}{regionOf[active.city.name] ? ` · ${regionOf[active.city.name]}` : ''}
                </div>
                <ul className="list-none m-0 mt-2.5 p-0 pt-2.5 border-t border-white/10 grid gap-[7px]">
                  <li className="text-[14px] leading-[1.3]">
                    {school.p.url ? (
                      <a
                        href={school.p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-baseline gap-1.5 font-semibold text-[#DCE7FA] no-underline hover:text-brand-goldsoft focus-visible:text-brand-goldsoft"
                      >
                        {visit}
                        <span className="text-[12px] text-brand-bluesoft group-hover:text-brand-goldsoft" aria-hidden>↗</span>
                      </a>
                    ) : (
                      <span className="font-medium text-[#93A6C9]">{noSite}</span>
                    )}
                  </li>
                </ul>
              </>
            ) : (
              <>
                <div className="font-disp font-bold text-[19px] tracking-[0.06em] uppercase leading-none">{active.city.name}</div>
                <div className="font-disp font-semibold text-[11.5px] tracking-[0.2em] uppercase text-brand-goldsoft mt-1.5">
                  {n} program{n === 1 ? '' : 's'}
                </div>
                <ul className="list-none m-0 mt-2.5 p-0 pt-2.5 border-t border-white/10 grid gap-[7px]">
                  {active.city.programs.map((p) => (
                    <li key={p.name} className="text-[14px] leading-[1.3]">
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-baseline gap-1.5 font-semibold text-[#DCE7FA] no-underline hover:text-brand-goldsoft focus-visible:text-brand-goldsoft"
                        >
                          {p.name}
                          <span className="text-[12px] text-brand-bluesoft group-hover:text-brand-goldsoft" aria-hidden>↗</span>
                        </a>
                      ) : (
                        <span className="font-medium text-[#93A6C9]">{p.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {n >= 2 && regionOf[active.city.name] && !zoomed && (
                  <button
                    type="button"
                    onClick={() => ctl.current?.enterRegion(regionOf[active.city.name])}
                    className={`${pill}mt-3 border-brand-gold bg-brand-gold text-[#1A1207] hover:bg-brand-goldsoft hover:border-brand-goldsoft`}
                  >
                    {zoomInWording}
                  </button>
                )}
                {active.city.programs.some((p) => !p.url) && (
                  <p className="mt-2.5 text-[11.5px] text-[#7C90B6]">Schools without a listed website appear by name.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3.5 max-sm:flex-col max-sm:items-start">
        <span className="font-disp font-semibold text-[13px] tracking-[0.24em] uppercase text-[#D2A445] whitespace-nowrap max-sm:text-[11.5px] max-sm:tracking-[0.18em]">
          <T id="map.caption">Florida&apos;s EMS educators</T>
        </span>
        {chipTo ? (
          <Link to={chipTo} className={`${chip} hover:border-brand-gold`}>
            {chipBody}
          </Link>
        ) : (
          <span className={chip}>{chipBody}</span>
        )}
        {/* Screen readers hear the finished state once, not every one of the
            39 "Connecting · n of 39" ticks the visible chip runs through. */}
        <span className="sr-only" aria-live="polite">
          {done ? `${programs.length} ${doneWording}` : ''}
        </span>
      </div>
      {regions && (
        <>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Zoom to a region">
            {[{ name: allWording, key: '' }, ...REGIONS.map((r) => ({ name: r.name, key: r.name }))].map((r) => {
              const on = r.key ? region === r.key : !zoomed;
              return (
                <button
                  key={r.key || '*'}
                  type="button"
                  aria-pressed={on}
                  onClick={(e) => { e.stopPropagation(); if (r.key) ctl.current?.enterRegion(r.key); else ctl.current?.leave(); }}
                  className={`${pill}${on ? 'bg-brand-gold border-brand-gold text-[#1A1207]' : 'text-[#C9D6EE] border-white/15 hover:border-brand-gold hover:text-brand-goldsoft'}`}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-[12.5px] text-[#7C90B6] min-h-[20px]">{engaged ? hintEngaged : hintIdle}</p>
        </>
      )}
    </div>
  );
}
