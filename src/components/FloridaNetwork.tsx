import { useEffect, useRef, useState } from 'react';
import { FL_H, FL_NODES, FL_POLYS, FL_W } from '../lib/florida';

// The hero's Florida: a solid navy state with a crisp gold coastline, ten
// cities pulsing from the first frame, and short comet links between
// neighboring cities (all over land) that light outward from Orlando until
// the whole state is joined. Holds, dims, and starts again while the tab is
// visible. Reduced-motion visitors get the finished, still network.
//
// Drawn imperatively into an <svg> because the comets are per-frame path
// updates; React owns the container and the phase chip only.

const CITIES = ['Pensacola', 'Tallahassee', 'Jacksonville', 'Gainesville', 'Orlando', 'Tampa', 'Fort Myers', 'West Palm Beach', 'Miami', 'Key West'];
const HUB = 'Orlando';
const LINKS: [string, string][] = [
  ['Pensacola', 'Tallahassee'], ['Tallahassee', 'Jacksonville'], ['Tallahassee', 'Gainesville'], ['Jacksonville', 'Gainesville'],
  ['Jacksonville', 'Orlando'], ['Gainesville', 'Orlando'], ['Gainesville', 'Tampa'], ['Orlando', 'Tampa'], ['Orlando', 'West Palm Beach'],
  ['Tampa', 'Fort Myers'], ['Fort Myers', 'West Palm Beach'], ['Fort Myers', 'Miami'], ['West Palm Beach', 'Miami'], ['Miami', 'Key West'],
];
// [side, vertical nudge] for the labels that fit at hero size
const LABELS: Record<string, [number, number]> = {
  Pensacola: [1, -1], Tallahassee: [1, -1], Jacksonville: [1, 0], Orlando: [1, 0], Tampa: [-1, 0], Miami: [1, 0], 'Key West': [-1, 1],
};
const GOLD = { lt: '#DDAA42', mid: '#C48F26', dk: '#9E6F16', link: '#D6A238', hot: '#FFE4A0', label: '#D2A445' };
const PAD = 60;
const NS = 'http://www.w3.org/2000/svg';

type Link = {
  na: string; nb: string; L: number;
  glow: SVGPathElement; core: SVGPathElement; lit: boolean; busy: boolean;
};

export default function FloridaNetwork({ className = '' }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState('Connecting');

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const N: Record<string, number[]> = {};
    CITIES.forEach((k) => { N[k] = FL_NODES[k]; });
    const CENTER = [(N.Orlando[0] + N.Tampa[0]) / 2, (N.Orlando[1] + N.Gainesville[1]) / 2];
    const VW = FL_W + PAD * 2, VH = FL_H + PAD * 2;

    const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element): SVGElementTagNameMap[K] => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, String(attrs[k]));
      parent.appendChild(e);
      return e;
    };
    // a gentle curve bowing toward the middle of the state keeps every link on land
    const linkPath = (a: number[], b: number[]) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = -dy / len, ny = dx / len;
      const side = (CENTER[0] - mx) * nx + (CENTER[1] - my) * ny > 0 ? 1 : -1;
      const off = len * 0.07 * side;
      return `M${a[0]},${a[1]} Q${mx + nx * off},${my + ny * off} ${b[0]},${b[1]}`;
    };
    const coastD = FL_POLYS.map((poly) => 'M' + poly.map((p) => `${p[0]},${p[1]}`).join('L') + 'Z').join('');

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `${-PAD} ${-PAD} ${VW} ${VH}`);
    svg.innerHTML =
      '<defs>' +
      `<radialGradient id="fl-pool" cx="${N[HUB][0]}" cy="${N[HUB][1]}" r="500" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1B3E78" stop-opacity=".9"/><stop offset=".55" stop-color="#0E2650" stop-opacity=".5"/><stop offset="1" stop-color="#0A1B33" stop-opacity="0"/></radialGradient>` +
      '<radialGradient id="fl-halo"><stop offset="0" stop-color="#FFE1A0" stop-opacity=".95"/><stop offset=".3" stop-color="#D9A63A" stop-opacity=".45"/><stop offset="1" stop-color="#D9A63A" stop-opacity="0"/></radialGradient>' +
      '<pattern id="fl-dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#9DB9F0" fill-opacity=".22"/></pattern>' +
      `<linearGradient id="fl-coast" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD.lt}"/><stop offset=".5" stop-color="${GOLD.mid}"/><stop offset="1" stop-color="${GOLD.dk}"/></linearGradient>` +
      `<clipPath id="fl-land"><path d="${coastD}"/></clipPath>` +
      '<linearGradient id="fl-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A3B72"/><stop offset="1" stop-color="#0F2650"/></linearGradient>' +
      '</defs>';
    el('rect', { x: -PAD, y: -PAD, width: VW, height: VH, fill: 'url(#fl-pool)' }, svg);
    el('path', { d: coastD, fill: 'url(#fl-fill)', 'fill-opacity': '.92' }, svg);
    el('rect', { x: -PAD, y: -PAD, width: VW, height: VH, fill: 'url(#fl-dots)', 'clip-path': 'url(#fl-land)' }, svg);
    el('path', { d: coastD, fill: 'none', stroke: '#000', 'stroke-opacity': '.35', 'stroke-width': '4', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, svg);
    el('path', { d: coastD, fill: 'none', stroke: 'url(#fl-coast)', 'stroke-width': '2', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, svg);

    const road = el('g', {}, svg), fx = el('g', {}, svg), nodes = el('g', {}, svg);
    const ringOf: Record<string, SVGCircleElement> = {};
    const links: Link[] = LINKS.map(([na, nb]) => {
      const d = linkPath(N[na], N[nb]);
      const glow = el('path', { d, fill: 'none', stroke: GOLD.link, 'stroke-width': '4', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, road);
      glow.style.filter = 'blur(1px)';
      const core = el('path', { d, fill: 'none', stroke: '#F1CC70', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, road);
      const L = core.getTotalLength();
      [glow, core].forEach((p) => { p.style.strokeDasharray = String(L); p.style.strokeDashoffset = String(reduced ? 0 : L); });
      glow.style.strokeOpacity = reduced ? '.3' : '0';
      core.style.strokeOpacity = reduced ? '.8' : '0';
      return { na, nb, L, glow, core, lit: false, busy: false };
    });
    CITIES.forEach((name, i) => {
      const p = N[name], hub = name === HUB;
      const h = el('circle', { cx: p[0], cy: p[1], r: hub ? 22 : 15, fill: 'url(#fl-halo)', class: 'fl-halo' }, nodes);
      h.style.animationDelay = `${-((i * 0.53) % 4.5)}s`;
      const c = el('circle', { cx: p[0], cy: p[1], r: hub ? 4 : 3, fill: GOLD.hot, class: 'fl-core' }, nodes);
      c.style.animationDelay = `${-((i * 0.71) % 3)}s`;
      ringOf[name] = el('circle', { cx: p[0], cy: p[1], r: 5, fill: 'none', stroke: '#FFF3D0', 'stroke-width': '1.2', 'vector-effect': 'non-scaling-stroke', class: 'fl-flash' }, nodes);
    });
    Object.keys(LABELS).forEach((name) => {
      const p = N[name], s = LABELS[name];
      const t = el('text', { x: p[0] + s[0] * 11, y: p[1] + s[1] * 15 + 4.5, 'text-anchor': s[0] < 0 ? 'end' : 'start' }, nodes);
      t.textContent = name.toUpperCase();
      t.style.cssText = `font:600 14px "Barlow Condensed",sans-serif;letter-spacing:.18em;fill:${GOLD.label};paint-order:stroke;stroke:#0A1B33;stroke-width:3px;stroke-linejoin:round`;
    });
    root.appendChild(svg);

    const flare = (name: string, dur = 1) => {
      const r = ringOf[name];
      r.style.animation = 'none';
      void r.getBBox();
      r.style.animation = `fl-land ${dur}s ease-out forwards`;
    };
    if (reduced) {
      setPhase('Connected · statewide');
      return () => { svg.remove(); };
    }

    let alive = true;
    const timers: number[] = [];
    const frames = new Set<number>();
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(() => { if (alive) fn(); }, ms)); };
    const raf = (fn: FrameRequestCallback) => { const id = requestAnimationFrame((t) => { frames.delete(id); if (alive) fn(t); }); frames.add(id); };

    // a comet along one link: white-hot head, short tapered gold tail; the link stays lit behind it
    const seg = (lk: Link, u0: number, u1: number, rev: boolean) => {
      const pts: string[] = [];
      for (let i = 0; i <= 10; i++) {
        const uu = Math.max(0, Math.min(1, u0 + ((u1 - u0) * i) / 10));
        const pt = lk.core.getPointAtLength((rev ? 1 - uu : uu) * lk.L);
        pts.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
      }
      return 'M' + pts.join('L');
    };
    const comet = (lk: Link, rev: boolean, reveal: boolean, done?: () => void) => {
      const g = el('g', {}, fx);
      const t1 = el('path', { fill: 'none', stroke: '#E9C76E', 'stroke-width': '1.2', 'stroke-opacity': '.35', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
      const t2 = el('path', { fill: 'none', stroke: '#FFE1A0', 'stroke-width': '1.8', 'stroke-opacity': '.6', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
      const t3 = el('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': '2', 'stroke-opacity': '.95', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', class: 'fl-head' }, g);
      const hd = el('circle', { r: 2.8, fill: '#fff', class: 'fl-head' }, g);
      const t0 = performance.now(), dur = Math.max(900, (lk.L / 140) * 1000);
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
        else { g.remove(); flare(rev ? lk.na : lk.nb, 1); done?.(); }
      };
      raf(frame);
    };

    // build outward from Orlando: a link may light once one of its ends is lit; up to three comets at a time
    let waiting = false;
    const cycle = () => {
      timers.splice(0).forEach(clearTimeout);
      links.forEach((lk) => {
        lk.lit = false; lk.busy = false;
        lk.glow.style.transition = lk.core.style.transition = 'none';
        lk.glow.style.strokeDashoffset = lk.core.style.strokeDashoffset = String(lk.L);
        lk.glow.style.strokeOpacity = lk.core.style.strokeOpacity = '0';
      });
      const litCity: Record<string, boolean> = { [HUB]: true };
      let inflight = 0, done = 0;
      setPhase(`Connecting · 0 of ${links.length}`);
      flare(HUB, 1);
      const finish = () => {
        setPhase('Connected · statewide');
        later(() => CITIES.forEach((n) => flare(n, 1.2)), 300);
        // while connected, quiet signals keep moving between neighbors
        for (let s = 0; s < 6; s++) later(() => comet(links[(s * 5 + 2) % links.length], s % 2 === 0, false), 1500 + s * 900);
        later(() => {
          setPhase('Reaching out again');
          links.forEach((lk) => {
            lk.glow.style.transition = lk.core.style.transition = 'stroke-opacity 1.6s ease';
            lk.glow.style.strokeOpacity = lk.core.style.strokeOpacity = '0';
          });
        }, 8600);
        later(() => { if (document.visibilityState === 'visible') cycle(); else waiting = true; }, 10600);
      };
      const step = () => {
        if (done === links.length) return finish();
        if (inflight >= 3) return;
        const cand = links.filter((lk) => !lk.lit && !lk.busy && (litCity[lk.na] || litCity[lk.nb]));
        if (!cand.length) return;
        const lk = cand[Math.floor(Math.random() * cand.length)], rev = !litCity[lk.na];
        lk.busy = true; inflight++;
        comet(lk, rev, true, () => {
          lk.lit = true; lk.busy = false; inflight--; done++;
          litCity[lk.na] = litCity[lk.nb] = true;
          setPhase(`Connecting · ${done} of ${links.length}`);
          step();
          later(step, 320);
        });
      };
      step(); later(step, 420); later(step, 900);
    };
    const onVis = () => { if (document.visibilityState === 'visible' && waiting) { waiting = false; cycle(); } };
    document.addEventListener('visibilitychange', onVis);
    cycle();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      frames.forEach(cancelAnimationFrame);
      document.removeEventListener('visibilitychange', onVis);
      svg.remove();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={host} className="absolute -inset-[9%] [&>svg]:w-full [&>svg]:h-full [&>svg]:overflow-visible" aria-hidden />
      <div className="absolute inset-x-0 -bottom-14 flex items-center justify-between gap-3.5">
        <span className="font-disp font-semibold text-[13px] tracking-[0.24em] uppercase text-[#D2A445] whitespace-nowrap max-sm:text-[11.5px] max-sm:tracking-[0.18em]">
          Florida&apos;s EMS educators
        </span>
        <span
          className="inline-flex items-center gap-2 font-disp font-semibold text-[12px] tracking-[0.2em] uppercase text-[#C9D6EE] border border-white/15 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur tabular-nums whitespace-nowrap max-sm:text-[11px] max-sm:tracking-[0.14em]"
          aria-live="polite"
        >
          <i className="w-[7px] h-[7px] rounded-full bg-brand-green shadow-[0_0_10px_rgba(58,219,143,.9)] animate-pulse motion-reduce:animate-none" aria-hidden />
          {phase}
        </span>
      </div>
    </div>
  );
}
