import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { programCities, programs, type ProgramCity } from '../content/programs';
import { FL_H, FL_POLYS, FL_W, projectLatLon } from '../lib/florida';
import { T, useText } from '../lib/text';

// The hero's Florida: a solid navy state with a crisp gold coastline and one
// pulsing dot for every city that trains EMTs and paramedics. The dots are
// joined by the shortest tree that reaches them all, lit outward from
// Tallahassee by short comets until the whole state is connected. Holds,
// dims, and starts again while the tab is visible. Reduced-motion visitors
// get the finished, still network.
//
// Every dot is also a control: hover, tap, or focus it and a card lists the
// programs in that city with a link to each school, while its label grows
// and comes forward. Click pins the card; Esc or a click elsewhere closes it.
// There is no zoom (removed by board decision, Sept 2026): the map is a fixed
// picture, so the wheel always scrolls the page.
//
// Drawn imperatively into an <svg> because the comets are per-frame updates;
// React owns the container, the card, and the chrome.

type Labels = 'auto' | 'dense' | 'major';
type CityNode = ProgramCity & { x: number; y: number };
type Anchor = 'start' | 'end' | 'middle';
type Box = [number, number, number, number];
type Placed = { dx: number; dy: number; anchor: Anchor; quiet: boolean };
type Edge = {
  a: CityNode; b: CityNode; L: number;
  glow: SVGPathElement; core: SVGPathElement; lit: boolean; busy: boolean;
};
type Controls = { hold: () => void; close: () => void; scheduleClose: () => void; placeCard: () => void };

const HUB = 'Tallahassee';
const GOLD = { lt: '#DDAA42', mid: '#C48F26', dk: '#9E6F16', link: '#D6A238', hot: '#FFE4A0' };
const PAD = 60;
const VW = FL_W + PAD * 2, VH = FL_H + PAD * 2;
const NS = 'http://www.w3.org/2000/svg';
// the drawing area bleeds this far past the box on every side (see the host div)
const BLEED = 0.09;

// One node per city, busiest first, placed from its coordinates.
const CITIES: CityNode[] = programCities().map((c) => {
  const [x, y] = projectLatLon(c.lat, c.lon);
  return { ...c, x, y };
});
const hubCity = CITIES.find((c) => c.name === HUB) ?? CITIES[0];
const cityAt = (name: string) => CITIES.find((c) => c.name === name) ?? hubCity;

// The roads: a minimum spanning tree (Prim, grown from the hub) in map space,
// so the network is the shortest set of links that reaches every city and the
// reveal naturally spreads outward from the capital.
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

const CENTER = [(cityAt('Orlando').x + cityAt('Tampa').x) / 2, (cityAt('Orlando').y + cityAt('Gainesville').y) / 2];
// a gentle curve bowing toward the middle of the state keeps every link on land
const linkPath = (a: CityNode, b: CityNode) => {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, nx = -dy / len, ny = dx / len;
  const side = (CENTER[0] - mx) * nx + (CENTER[1] - my) * ny > 0 ? 1 : -1;
  const off = len * 0.07 * side;
  return `M${a.x},${a.y} Q${mx + nx * off},${my + ny * off} ${b.x},${b.y}`;
};
const coastD = FL_POLYS.map((poly) => 'M' + poly.map((p) => `${p[0]},${p[1]}`).join('L') + 'Z').join('');

// Label placement: the busiest cities claim space first; the rest try four
// sides and go hover-only when nothing fits. Widths are estimated from the
// character count because the text is measured before it is in the document.
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
}: {
  className?: string;
  labels?: Labels;
  chipTo?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState('Connecting');
  const [done, setDone] = useState(false);
  const [active, setActive] = useState<CityNode | null>(null);
  // bumped by Enter/Space on a dot; the effect below moves focus into the card once it has rendered
  const [focusReq, setFocusReq] = useState(0);
  // a pinned card ignores pointerleave; the listeners are built once, so they read a ref rather than state
  const pinned = useRef(false);
  const ctl = useRef<Controls | null>(null);
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
  const noSite = useText('map.card.nosite', 'No website listed');

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
    el('rect', { x: -PAD * 4, y: -PAD * 4, width: VW + PAD * 6, height: VH + PAD * 6, fill: 'url(#fl-pool)', 'pointer-events': 'none' }, svg);
    el('path', { d: coastD, fill: 'url(#fl-fill)', 'fill-opacity': '.92', 'pointer-events': 'none' }, svg);
    el('rect', { x: -PAD, y: -PAD, width: VW, height: VH, fill: 'url(#fl-dots)', 'clip-path': 'url(#fl-land)', 'pointer-events': 'none' }, svg);
    el('path', { d: coastD, fill: 'none', stroke: '#000', 'stroke-opacity': '.35', 'stroke-width': '4', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, svg);
    el('path', { d: coastD, fill: 'none', stroke: 'url(#fl-coast)', 'stroke-width': '2', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, svg);

    // labels live in their own group above the dots so a grown label can be moved to the top of the pile
    const road = el('g', { 'pointer-events': 'none' }, svg), fx = el('g', { 'pointer-events': 'none' }, svg);
    const nodes = el('g', {}, svg);
    const lblG = el('g', { 'aria-hidden': 'true' }, svg);
    const edges: Edge[] = EDGES.map(([a, b]) => {
      const d = linkPath(a, b);
      const glow = el('path', { d, fill: 'none', stroke: GOLD.link, 'stroke-width': '4', 'stroke-linecap': 'round' }, road);
      glow.style.filter = 'blur(1px)';
      const core = el('path', { d, fill: 'none', stroke: '#F1CC70', 'stroke-width': '1.3', 'stroke-linecap': 'round' }, road);
      const L = core.getTotalLength();
      [glow, core].forEach((p) => { p.style.strokeDasharray = String(L); p.style.strokeDashoffset = String(reduced ? 0 : L); });
      glow.style.strokeOpacity = reduced ? '.3' : '0';
      core.style.strokeOpacity = reduced ? '.8' : '0';
      return { a, b, L, glow, core, lit: false, busy: false };
    });

    // Every dot and label is drawn at (0,0) inside a group placed by a translate.
    const flashOf: Record<string, SVGCircleElement> = {}, groupOf: Record<string, SVGGElement> = {};
    const lblOf: Record<string, SVGTextElement> = {}, lblGroupOf: Record<string, SVGGElement> = {};
    CITIES.forEach((c) => {
      const n = c.programs.length, hub = c === hubCity;
      const r = n >= 4 ? 6.5 : n >= 2 ? 5 : 3.2;
      const g = el('g', { class: 'fl-city', role: 'button', tabindex: '0', 'aria-label': `${c.name}, ${n} program${n === 1 ? '' : 's'}`, transform: `translate(${c.x} ${c.y})` }, nodes);
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
      flashOf[c.name] = el('circle', { r: r + 2, fill: 'none', stroke: '#FFF3D0', 'stroke-width': '1.2', 'vector-effect': 'non-scaling-stroke', class: 'fl-flash' }, g);
      el('circle', { r: r + 3, fill: 'none', 'vector-effect': 'non-scaling-stroke', class: 'fl-ring' }, g);
      // a generous invisible target so small dots are easy to hit, with room for a thumb
      el('circle', { r: hitR, fill: 'transparent' }, g);
      groupOf[c.name] = g;
      const L = placed[c.name];
      const lg = el('g', { transform: `translate(${c.x} ${c.y})` }, lblG);
      lblGroupOf[c.name] = lg;
      const t = el('text', { x: L.dx, y: L.dy, 'text-anchor': L.anchor, class: `fl-lbl${mode === 'dense' ? ' dense' : ''}${L.quiet ? ' quiet' : ''}` }, lg);
      t.textContent = c.name.toUpperCase();
      lblOf[c.name] = t;
    });
    stage.appendChild(svg);

    // ---- the card ----
    // The card is a child of the frame, not the bleeding drawing area, so
    // positions are converted from map units to the frame's percentages.
    let current: CityNode | null = null, closeT = 0, restoring = false;
    const placeCard = () => {
      const d = card.current;
      if (!d || !current) return;
      const px = (((current.x + PAD) / VW) * (1 + BLEED * 2) - BLEED) * 100;
      const py = (((current.y + PAD) / VH) * (1 + BLEED * 2) - BLEED) * 100;
      d.style.left = d.style.right = d.style.top = d.style.bottom = '';
      if (px > 55) d.style.right = `calc(${100 - px}% + 16px)`; else d.style.left = `calc(${px}% + 16px)`;
      if (py > 62) d.style.bottom = `calc(${100 - py}% - 10px)`; else d.style.top = `calc(${py}% - 10px)`;
    };
    const open = (c: CityNode) => {
      clearTimeout(closeT);
      if (current && current !== c) {
        groupOf[current.name].classList.remove('is-active');
        lblOf[current.name].classList.remove('on');
      }
      current = c;
      groupOf[c.name].classList.add('is-active');
      const t = lblOf[c.name];
      t.classList.add('on');
      // last drawn is on top, so the grown label clears its neighbors
      lblG.appendChild(lblGroupOf[c.name]);
      setActive(c);
    };
    const close = () => {
      if (!current) return;
      groupOf[current.name].classList.remove('is-active');
      lblOf[current.name].classList.remove('on');
      // Escape from inside the card should hand keyboard focus back to the dot, not drop it.
      // The dot's focus listener would reopen the card, so it is told to stand down for this one.
      if (card.current?.contains(document.activeElement)) {
        restoring = true;
        groupOf[current.name].focus({ preventScroll: true });
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
    ctl.current = { hold: () => clearTimeout(closeT), close, scheduleClose, placeCard };
    CITIES.forEach((c) => {
      const g = groupOf[c.name];
      // touch has no hover: a tap goes straight to click, which pins
      g.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; if (!pinned.current) open(c); });
      g.addEventListener('pointerleave', scheduleClose);
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        if (current === c && pinned.current) { close(); return; }
        open(c);
        pinned.current = true;
      });
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(c);
          pinned.current = true;
          setFocusReq((n) => n + 1);
        }
        if (e.key === 'Escape') close();
      });
      g.addEventListener('focus', () => { if (!pinned.current && !restoring) open(c); });
      // Tabbing from the dot into its own card is not leaving: the card's
      // onBlur takes over from there and closes when focus exits the pair.
      g.addEventListener('blur', (e) => {
        if (pinned.current || card.current?.contains(e.relatedTarget as Node | null)) return;
        scheduleClose();
      });
    });
    const onDocClick = () => { if (pinned.current) close(); };
    const onDocKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKey);
    const teardown = () => {
      clearTimeout(closeT);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onDocKey);
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

    // build outward from the capital: a link may light once one of its ends is lit; up to four comets at a time
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

  const n = active?.programs.length ?? 0;
  const chip =
    'inline-flex items-center gap-2 font-disp font-semibold text-[12px] tracking-[0.2em] uppercase border bg-white/5 px-3 py-1.5 rounded-full backdrop-blur tabular-nums whitespace-nowrap transition-colors max-sm:text-[11px] max-sm:tracking-[0.14em] ' +
    (done ? 'border-brand-goldsoft/45 text-brand-goldsoft' : 'border-white/15 text-[#C9D6EE]');
  const chipBody = (
    <>
      <i className="w-[7px] h-[7px] rounded-full bg-brand-green shadow-[0_0_10px_rgba(58,219,143,.9)] animate-pulse motion-reduce:animate-none" aria-hidden />
      {done ? `${programs.length} ${doneWording}` : phase}
    </>
  );

  return (
    <div ref={outer} className={className}>
      <div ref={root} className="fl-stage relative w-full aspect-[700/683]" role="group" aria-label={ariaLabel}>
        <div ref={host} className="fl-host absolute -inset-[9%] [&>svg]:w-full [&>svg]:h-full [&>svg]:overflow-visible" />
        {active && (
          <div
            ref={card}
            role="dialog"
            aria-label={`Programs in ${active.name}`}
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
            <div className="font-disp font-bold text-[19px] tracking-[0.06em] uppercase leading-none">{active.name}</div>
            <div className="font-disp font-semibold text-[11.5px] tracking-[0.2em] uppercase text-brand-goldsoft mt-1.5">
              {n} program{n === 1 ? '' : 's'}
            </div>
            <ul className="list-none m-0 mt-2.5 p-0 pt-2.5 border-t border-white/10 grid gap-[7px]">
              {active.programs.map((p) => (
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
            {active.programs.some((p) => !p.url) && (
              <p className="mt-2.5 text-[11.5px] text-[#7C90B6]">{noSite}: schools without one appear by name.</p>
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
    </div>
  );
}
