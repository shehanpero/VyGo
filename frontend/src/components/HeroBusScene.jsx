import React from 'react'
import { YutongBus } from './busSilhouettes'

/**
 * HeroBusScene — CSS-animated "bus driving across the dusk expressway" hero,
 * per docs/hero-driving-bus-world-spec.md. Pure inline SVG + @keyframes: no
 * canvas, no rAF, no animation library, zero network cost.
 *
 * Flat side-profile tracking shot. The bus sweeps right at constant speed while
 * every ground-fixed layer scrolls LEFT at a depth-weighted fraction of road
 * speed. Depth is communicated only by parallax speed ratio + silhouette
 * darkness/size (no perspective). The loop seam is invisible because the bus is
 * fully off-screen at both 0% and 100% and each scroll layer's displacement
 * over one 8 s loop is an integer multiple of its pattern width.
 *
 * Each scroll layer is one <svg> whose width is calc(100% + --tile); the
 * pattern repeats every `period` viewBox units = --tile of the stage, so the
 * CSS translateX(-var(--tile)) stitches exactly. Vertical bands are %-based
 * (viewBox 0 0 1000 1000, y = 10·%H). Decorative only: aria-hidden, pointer-
 * events-none; reduced motion gets a static frame via media query.
 */

/* ------------------------------------------------------------------ *
 *  Deterministic PRNG so the scene looks the same every load.
 * ------------------------------------------------------------------ */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* Colors reuse the HeroScene3D palette + sky stops (see world spec §Palette). */

/* ------------------------------------------------------------------ *
 *  Static scene data (deterministic per load, module scope).
 * ------------------------------------------------------------------ */
const rng = mulberry32(20260803)
const STARS = Array.from({ length: 48 }, () => ({
  x: rng() * 1000,
  y: rng() * 300, // upper 30% H only
  r: 0.3 + rng() * 0.8,
  o: 0.15 + rng() * 0.45,
}))

/* ------------------------------------------------------------------ *
 *  Small shape helpers
 * ------------------------------------------------------------------ */

function Palm({ x, baseY, h, lean, seed, color, trunkW }) {
  const topX = x + lean * h
  const topY = baseY - h
  const ctrlX = x + lean * h * 0.42
  const ctrlY = baseY - h * 0.55
  const n = 6 + (Math.floor(seed * 1000) % 3)
  const len = h * 0.4
  const fronds = []
  for (let i = 0; i < n; i++) {
    const t = (i - (n - 1) / 2) / (n / 2) // -1..1
    const ang = -Math.PI / 2 + t * (Math.PI / 2.6)
    const ex = topX + Math.cos(ang) * len * (0.55 + 0.45 * Math.abs(t))
    const ey = topY + Math.sin(ang) * len * 0.6
    const cx = topX + Math.cos(ang) * len * 0.35
    const cy = topY + Math.sin(ang) * len * 0.35 + len * 0.1
    fronds.push(
      <path
        key={i}
        d={`M ${topX} ${topY} Q ${cx} ${cy} ${ex} ${ey}`}
        stroke={color}
        strokeWidth={Math.max(1.2, trunkW * 0.45)}
        fill="none"
        strokeLinecap="round"
      />
    )
  }
  return (
    <g>
      <path
        d={`M ${x} ${baseY} Q ${ctrlX} ${ctrlY} ${topX} ${topY}`}
        stroke={color}
        strokeWidth={trunkW}
        fill="none"
        strokeLinecap="round"
      />
      {fronds}
    </g>
  )
}

/** Seamless ridge path periodic over `period` viewBox units. */
function ridgePath(period, baseY, amp, seed, fillTo) {
  const steps = 48
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * period
    const n =
      Math.sin((x / period) * Math.PI * 2 + seed) * 0.5 +
      Math.sin((x / period) * Math.PI * 4 + seed * 2.7) * 0.3 +
      Math.sin((x / period) * Math.PI * 6 + seed * 1.3) * 0.2
    const y = baseY - amp * (0.35 + n * 0.65)
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `
  }
  d += `L ${period.toFixed(2)} ${fillTo} L 0 ${fillTo} Z`
  return d
}

/* ------------------------------------------------------------------ *
 *  Tile builders (each receives `period` = tile width in viewBox units)
 * ------------------------------------------------------------------ */

function HillsTile({ period }) {
  const dagobaX = period * 0.62
  return (
    <g>
      <path d={ridgePath(period, 462, 20, 1.3, 560)} fill="#0a1424" />
      <path d={ridgePath(period, 482, 15, 4.7, 560)} fill="#050c18" />
      {/* dagoba (stupa) silhouette */}
      <path d={`M ${dagobaX - 22} 466 A 22 22 0 0 1 ${dagobaX + 22} 466 Z`} fill="#0a1526" />
      <path
        d={`M ${dagobaX - 22} 466 A 22 22 0 0 1 ${dagobaX + 22} 466 Z`}
        fill="none"
        stroke="rgba(255,247,237,0.35)"
        strokeWidth="1.4"
      />
      <rect x={dagobaX - 8} y="464" width="16" height="5" rx="2" fill="#0a1526" />
      <line x1={dagobaX} y1="422" x2={dagobaX} y2="464" stroke="#0a1526" strokeWidth="2" />
      <path d={`M ${dagobaX - 5} 422 L ${dagobaX} 414 L ${dagobaX + 5} 422 Z`} fill="#0a1526" />
    </g>
  )
}

function SkylineTile({ period }) {
  const r = mulberry32(4242)
  const baseY = 470
  const buildings = []
  let x = 6
  let tallest = 60
  while (x < period - 4) {
    const w = 12 + r() * 28
    const h = 55 + r() * 235
    if (h > tallest) tallest = h
    const cols = Math.max(1, Math.floor(w / 8))
    const rows = Math.min(8, Math.max(1, Math.floor(h / 16)))
    const wins = []
    for (let c = 0; c < cols; c++) {
      for (let rr = 0; rr < rows; rr++) {
        if (r() < 0.3) wins.push({ c, rr, warm: r() > 0.62 })
      }
    }
    buildings.push({ x, w, h, cols, rows, wins })
    x += w + 3 + r() * 11
  }
  const lx = period * 0.72
  const lh = Math.round(tallest * 1.5)
  return (
    <g>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={baseY - b.h} width={b.w} height={b.h} fill="#0a1526" />
          {/* emerald dusk rim on the top edge */}
          <line
            x1={b.x}
            y1={baseY - b.h}
            x2={b.x + b.w}
            y2={baseY - b.h}
            stroke="rgba(52,211,153,0.35)"
            strokeWidth="1.4"
          />
          {b.wins.map((w, j) => (
            <rect
              key={j}
            x={b.x + 1.5 + w.c * ((b.w - 3) / b.cols)}
            y={baseY - b.h + 3 + w.rr * ((b.h - 5) / b.rows)}
              width="2.6"
              height="3.2"
              fill={w.warm ? 'rgba(252,211,77,0.85)' : 'rgba(52,211,153,0.8)'}
            />
          ))}
        </g>
      ))}
      {/* Lotus Tower — needle with bulbous head, amber sunset rim */}
      <rect x={lx - 2.5} y={baseY - lh} width="5" height={lh} fill="#0a1526" />
      <ellipse cx={lx} cy={baseY - lh - 8} rx="9" ry="13" fill="#0a1526" />
      <line x1={lx} y1={baseY - lh - 21} x2={lx} y2={baseY - lh - 8} stroke="#0a1526" strokeWidth="2" />
      <ellipse
        cx={lx}
        cy={baseY - lh - 8}
        rx="9"
        ry="13"
        fill="none"
        stroke="rgba(252,211,77,0.4)"
        strokeWidth="1.2"
      />
    </g>
  )
}

function MidFoliageTile({ period }) {
  const r = mulberry32(99)
  const bumps = []
  let x = 5
  while (x < period - 6) {
    const rad = 8 + r() * 14
    bumps.push({ x: x + rad, y: 488, r: rad })
    x += rad * 1.7 + r() * 10
  }
  const towerX = period * 0.86
  return (
    <g>
      {bumps.map((b, i) => (
        <path
          key={i}
          d={`M ${b.x - b.r} ${b.y} A ${b.r} ${b.r} 0 0 1 ${b.x + b.r} ${b.y} Z`}
          fill={i % 2 ? '#0a1526' : '#050b16'}
        />
      ))}
      <Palm x={period * 0.2} baseY={492} h={75} lean={0.5} seed={r()} color="#050b16" trunkW={2.5} />
      <Palm x={period * 0.62} baseY={488} h={90} lean={-0.4} seed={r()} color="#050b16" trunkW={2.5} />
      {/* rural water tower landmark */}
      <g>
        <rect x={towerX - 4} y="466" width="8" height="22" fill="#050c16" />
        <rect x={towerX - 9} y="458" width="18" height="10" rx="2" fill="#050c16" />
        <line x1={towerX - 9} y1="463" x2={towerX + 9} y2="463" stroke="rgba(52,211,153,0.25)" strokeWidth="1" />
      </g>
    </g>
  )
}

function DashTile({ period }) {
  const cycle = period / 12 // 12 dash cycles per tile (period 0.0533 W)
  const dashLen = (0.027 / 0.64) * period // dash 0.027 W
  const dashGlow = (0.054 / 0.64) * period // 2×-wide emerald underglow
  const pools = Array.from({ length: 4 }, (_, k) => (k * period) / 4 + 0.025 * period)
  const dashes = Array.from({ length: 12 }, (_, k) => k * cycle)
  return (
    <g>
      {/* light pools baked into the road layer so pool + pole never separate */}
      {pools.map((px, i) => (
        <ellipse key={`p${i}`} cx={px} cy="508" rx={0.09 * period} ry="8" fill="url(#hero-pool)" />
      ))}
      {dashes.map((x0, i) => (
        <g key={i}>
          <rect x={x0} y="527" width={dashGlow} height="7" fill="rgba(16,185,129,0.35)" />
          <rect x={x0} y="528.5" width={dashLen} height="4.5" fill="rgba(209,250,229,0.85)" />
          <rect x={x0} y="562" width={dashGlow} height="7" fill="rgba(16,185,129,0.35)" />
          <rect x={x0} y="563.5" width={dashLen} height="4.5" fill="rgba(209,250,229,0.85)" />
        </g>
      ))}
    </g>
  )
}

function FixturesTile({ period }) {
  const spacing = period / 4 // one pole every 0.16 W
  const poles = Array.from({ length: 4 }, (_, k) => k * spacing)
  const gantryX = period * 0.46
  const arm = 0.035 * period
  return (
    <g>
      {poles.map((px, i) => (
        <g key={i}>
          <line x1={px} y1="480" x2={px} y2="400" stroke="#0a1526" strokeWidth="3" />
          <line x1={px} y1="402" x2={px + arm} y2="402" stroke="#0a1526" strokeWidth="2.5" />
          <circle cx={px + arm} cy="402" r="11" fill="url(#hero-lamp)" />
          <circle cx={px + arm} cy="402" r="2.2" fill="rgba(236,253,245,0.9)" />
        </g>
      ))}
      {/* E01 toll gantry silhouette */}
      <g>
        <line x1={gantryX - 0.09 * period} y1="420" x2={gantryX + 0.09 * period} y2="420" stroke="#0a1526" strokeWidth="4" />
        <line x1={gantryX - 0.09 * period} y1="420" x2={gantryX - 0.09 * period} y2="480" stroke="#0a1526" strokeWidth="2.5" />
        <line x1={gantryX + 0.09 * period} y1="420" x2={gantryX + 0.09 * period} y2="480" stroke="#0a1526" strokeWidth="2.5" />
        <text
          x={gantryX}
          y="414"
          textAnchor="middle"
          fill="rgba(52,211,153,0.5)"
          fontSize="10"
          fontWeight="700"
        >
          E01
        </text>
      </g>
    </g>
  )
}

function VergeTile({ period }) {
  const r = mulberry32(313)
  const scrub = []
  let x = 4
  while (x < period - 5) {
    const rad = 15 + r() * 18
    scrub.push({ x: x + rad, y: 620 + r() * 60, r: rad })
    x += rad * 1.6 + r() * 14
  }
  return (
    <g>
      {scrub.map((b, i) => (
        <path
          key={i}
          d={`M ${b.x - b.r} ${b.y} A ${b.r} ${b.r} 0 0 1 ${b.x + b.r} ${b.y} Z`}
          fill={i % 2 ? '#0a1526' : '#050b16'}
        />
      ))}
      <Palm x={period * 0.18} baseY={655} h={140} lean={0.55} seed={r()} color="#050b16" trunkW={4} />
      <Palm x={period * 0.68} baseY={690} h={170} lean={-0.6} seed={r()} color="#0a1526" trunkW={5} />
    </g>
  )
}

function ForegroundTile({ period }) {
  const r = mulberry32(777)
  const grass = []
  let gx = 0
  while (gx < period) {
    grass.push(gx)
    gx += 22
  }
  return (
    <g>
      {/* tall verge grass, bottom 8% H */}
      {grass.map((gx, i) => (
        <path key={i} d={`M ${gx} 1000 L ${gx + 6} 952 L ${gx + 12} 1000 Z`} fill="#03070f" />
      ))}
      {/* palms at tile edges so they never cross the center band */}
      <Palm x={0.03 * period} baseY={920} h={250} lean={0.5} seed={r()} color="#020617" trunkW={8} />
      <Palm x={0.12 * period} baseY={980} h={210} lean={0.8} seed={r()} color="#020617" trunkW={7} />
      <Palm x={0.96 * period} baseY={880} h={290} lean={-0.7} seed={r()} color="#020617" trunkW={8} />
    </g>
  )
}

/* ------------------------------------------------------------------ *
 *  Layers
 * ------------------------------------------------------------------ */

function ScrollLayer({ tile, tileContent, className, style }) {
  const period = (1000 * tile) / (1 + tile) // pattern period in viewBox units
  const count = Math.ceil(1000 / period) // copies to cover the full viewBox
  return (
    <div
      className={`hero-scroll${className ? ' ' + className : ''}`}
      data-scroll
      style={{ '--tile': `${(tile * 100).toFixed(4)}%`, ...style }}
    >
      <svg
        className="hero-scroll-svg"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        role="presentation"
      >
        {Array.from({ length: count }, (_, k) => (
          <g key={k} transform={`translate(${(k * period).toFixed(3)}, 0)`}>
            {tileContent({ period })}
          </g>
        ))}
      </svg>
    </div>
  )
}

function SkyLayer() {
  return (
    <>
      {/* dusk gradient (0→48% H); stops copied from HeroScene3D */}
      <div className="hero-sky" />
      <svg
        className="hero-static-svg"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        role="presentation"
      >
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#e2e8f0" opacity={s.o} />
        ))}
        {/* dusk sun mostly sunk behind the skyline */}
        <circle cx="260" cy="470" r="134" fill="url(#hero-sun)" />
        <circle cx="260" cy="470" r="42" fill="rgba(255,247,237,0.95)" />
        <circle cx="260" cy="470" r="23" fill="#fde68a" />
        {/* horizon haze band 44–48% H */}
        <rect x="0" y="440" width="1000" height="40" fill="url(#hero-haze)" />
      </svg>
    </>
  )
}

/** BridgeLights — distant expressway bridge spanning the horizon haze
 *  (static layer, L3): cable band + pillars + a row of amber/emerald
 *  light dots that twinkle via a pure opacity CSS animation. Lives in
 *  the fixed glow layer (NOT a scroll layer), so layer timing is
 *  untouched; reduced motion pins the dots at a steady mid-glow. */
function BridgeLights() {
  const dots = [
    { x: 442, y: 454.5, c: '#fcd34d', d: '0s' },
    { x: 488, y: 453.6, c: '#34d399', d: '0.35s' },
    { x: 534, y: 453.1, c: '#fcd34d', d: '0.8s' },
    { x: 580, y: 452.8, c: '#fcd34d', d: '1.25s' },
    { x: 626, y: 452.7, c: '#34d399', d: '0.55s' },
    { x: 672, y: 452.8, c: '#fcd34d', d: '1.05s' },
    { x: 718, y: 453.1, c: '#34d399', d: '0.15s' },
    { x: 764, y: 453.6, c: '#fcd34d', d: '1.45s' },
    { x: 810, y: 454.3, c: '#fcd34d', d: '0.7s' },
    { x: 856, y: 455.2, c: '#34d399', d: '1.15s' },
    { x: 902, y: 456.3, c: '#fcd34d', d: '0.25s' },
    { x: 948, y: 457.5, c: '#34d399', d: '0.95s' },
  ]
  return (
    <svg
      className="hero-static-svg"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      role="presentation"
    >
      {/* upper cable + deck band */}
      <path d="M 400 457 Q 640 449 980 457" fill="none" stroke="rgba(10,21,38,0.9)" strokeWidth="2.6" />
      <path d="M 400 457 Q 640 449 980 457" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
      <rect x="408" y="461" width="640" height="3.5" fill="rgba(10,21,38,0.88)" />
      {/* pillars sinking into the haze */}
      {[470, 540, 610, 680, 750, 820, 890].map((px) => (
        <line key={px} x1={px} y1="458" x2={px} y2="472" stroke="#0a1526" strokeWidth="3" />
      ))}
      {/* twinkling light dots (opacity-only) */}
      {dots.map((dot, i) => (
        <circle key={i} className="hero-bridge-dot" cx={dot.x} cy={dot.y} r="2.1" fill={dot.c} style={{ animationDelay: dot.d }} />
      ))}
    </svg>
  )
}

function RoadLayer() {
  // Subtle horizon sine (period 1.28 W = 1280 units, amp 0.8% H) baked into the
  // edge lines. Static band — the dashes carry the motion.
  const pts = (yBase) => {
    const arr = []
    for (let x = 0; x <= 1000; x += 25) {
      arr.push(`${x},${(yBase + 8 * Math.sin((x / 1280) * Math.PI * 2)).toFixed(2)}`)
    }
    return arr.join(' ')
  }
  return (
    <svg
      className="hero-static-svg"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      role="presentation"
    >
      <defs>
        <linearGradient id="hero-asphalt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060c17" />
          <stop offset="1" stopColor="#03070f" />
        </linearGradient>
      </defs>
      <rect x="0" y="480" width="1000" height="520" fill="url(#hero-asphalt)" />
      {/* far edge line: emerald glow + cream core */}
      <polyline points={pts(481)} fill="none" stroke="rgba(16,185,129,0.25)" strokeWidth="8" />
      <polyline points={pts(481)} fill="none" stroke="rgba(209,250,229,0.5)" strokeWidth="2.5" />
      {/* near edge line, dimmer */}
      <polyline points={pts(598)} fill="none" stroke="rgba(16,185,129,0.18)" strokeWidth="7" />
      <polyline points={pts(598)} fill="none" stroke="rgba(209,250,229,0.4)" strokeWidth="2" />
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 *  Component
 * ------------------------------------------------------------------ */
export default function HeroBusScene() {
  return (
    <div className="hero-stage" aria-hidden="true" role="presentation">
      {/* Bridge-lights twinkle — opacity-only so it never paints layouts;
          reduced motion pins the dots at a steady mid-glow (spec §6). */}
      <style>{`@keyframes heroBridgeTwinkle { 0%, 100% { opacity: 0.28; } 50% { opacity: 0.95; } } .hero-bridge-dot { animation: heroBridgeTwinkle 2.4s ease-in-out infinite; } @media (prefers-reduced-motion: reduce) { .hero-bridge-dot { animation: none; opacity: 0.55; } }`}</style>
      {/* shared gradients (referenced across layer SVGs) */}
      <svg width="0" height="0" aria-hidden="true">
        <defs>
          <radialGradient id="hero-sun">
            <stop offset="0" stopColor="rgba(255,247,237,0.95)" />
            <stop offset="0.18" stopColor="rgba(252,211,77,0.55)" />
            <stop offset="0.45" stopColor="rgba(16,185,129,0.18)" />
            <stop offset="1" stopColor="rgba(16,185,129,0)" />
          </radialGradient>
          <linearGradient id="hero-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(52,211,153,0.10)" />
            <stop offset="1" stopColor="rgba(52,211,153,0)" />
          </linearGradient>
          <radialGradient id="hero-glow-emerald">
            <stop offset="0" stopColor="rgba(52,211,153,0.22)" />
            <stop offset="1" stopColor="rgba(52,211,153,0)" />
          </radialGradient>
          <radialGradient id="hero-glow-amber">
            <stop offset="0" stopColor="rgba(252,211,77,0.13)" />
            <stop offset="1" stopColor="rgba(252,211,77,0)" />
          </radialGradient>
          <radialGradient id="hero-pool">
            <stop offset="0" stopColor="rgba(52,211,153,0.16)" />
            <stop offset="1" stopColor="rgba(52,211,153,0)" />
          </radialGradient>
          <radialGradient id="hero-lamp">
            <stop offset="0" stopColor="rgba(52,211,153,0.35)" />
            <stop offset="1" stopColor="rgba(52,211,153,0)" />
          </radialGradient>
        </defs>
      </svg>

      {/* L1 — sky gradient, stars, dusk sun, horizon haze */}
      <SkyLayer />

      {/* L2 — far hills + dagoba (0.3× road speed) */}
      <ScrollLayer tile={0.192} tileContent={HillsTile} />

      {/* L3 — city glow (fixed) + bridge lights (fixed) + skyline tile + Lotus Tower (0.5×) */}
      <div className="hero-layer">
        <svg
          className="hero-static-svg"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          role="presentation"
        >
          <circle cx="500" cy="460" r="420" fill="url(#hero-glow-emerald)" />
          <circle cx="500" cy="460" r="300" fill="url(#hero-glow-amber)" />
        </svg>
        <BridgeLights />
        <ScrollLayer tile={0.32} tileContent={SkylineTile} />
      </div>

      {/* L4 — mid-distant foliage (0.8×) */}
      <ScrollLayer tile={0.512} tileContent={MidFoliageTile} />

      {/* L5 — road surface, static band + edge lines */}
      <RoadLayer />

      {/* L6 — lane dashes + light pools (1.0×) */}
      <ScrollLayer tile={0.64} tileContent={DashTile} />

      {/* L7 — road-edge fixtures: lamp posts + E01 gantry (1.0×) */}
      <ScrollLayer tile={0.64} tileContent={FixturesTile} />

      {/* L8 — bus rig (sweeps right, 8 s loop) */}
      <div className="bus-rig">
        <div className="hero-bus-pos bus--express">
          <div className="bus-bob">
            <svg
              className="hero-bus-svg"
              viewBox="0 0 128 44"
              preserveAspectRatio="none"
              role="presentation"
            >
              <YutongBus />
            </svg>
          </div>
          {/* ground shadow lives outside the bobbing group so it never lifts */}
          <div className="hero-bus-shadow" />
        </div>
      </div>

      {/* L9 — near verge bushes + mid palms (1.3×) */}
      <ScrollLayer tile={0.832} tileContent={VergeTile} />

      {/* L10 — front foreground palms + verge grass (1.6×) */}
      <ScrollLayer tile={1.024} tileContent={ForegroundTile} />

      {/* L11 — vignette + bottom fade */}
      <div className="hero-vignette" />
    </div>
  )
}
