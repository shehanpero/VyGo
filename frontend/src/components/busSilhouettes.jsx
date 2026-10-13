/**
 * busSilhouettes.jsx — paste-ready side-profile silhouettes for the hero
 * (docs/bus-silhouette-geometry-spec.md §1A/§1B).
 *
 * Two buses share one viewBox (0 0 128 44, ground y=40, 10 u/m):
 *   Yutong C12 Pro (Express) — sleek, crowned roof, roof AC pod, gold belt
 *   Ashok Leyland Viking (Normal) — boxier, flat roof, no pod, blue belt
 *
 * The upper assembly (body/windows/lights/belt/pod) is grouped as .bus-upper so
 * the suspension-bob animation can leave wheels + shadow pinned. The wheel tick
 * group carries .wheel-spin (0.153 s/rev, anti-strobe: faint 2-tick radial, no
 * visible spokes). Everything animates via classes in index.css.
 *
 * Two render modes, zero geometry duplication:
 *   - <YutongBus /> / <VikingBus />  — inline <g> for the hero (full CSS control).
 *   - <defs><use href="#vygo-bus-*"/></use></defs> via BusSilhouetteDefs (incl.
 *     the ground shadow rect). The inline versions omit the shadow so the hero
 *     can place its own ground shadow OUTSIDE the suspension-bob group.
 */

import React from 'react'

export const BUS_IDS = { express: 'vygo-bus-yutong', normal: 'vygo-bus-viking' }

// Tick lines at 0° / 180° only (faint, low opacity — no strobe, per world spec §5.3).
function Wheel({ cx, cy }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r="5.2" fill="#02060d" />
      <circle r="3.0" fill="#0e1626" stroke="#1f2937" strokeWidth="1" />
      <circle r="1.0" fill="#34d399" opacity="0.6" />
      {/* static motion-smear crescent (rotated so it reads as blur) */}
      <path d="M -3 0 A 3 3 0 0 1 3 0 Z" fill="rgba(148,163,184,0.12)" transform="rotate(24)" />
      <g className="wheel-spin" stroke="#34d399" strokeWidth="1.1" opacity="0.35">
        <line x1="1.7" y1="0" x2="2.9" y2="0" />
        <line x1="-1.7" y1="0" x2="-2.9" y2="0" />
      </g>
    </g>
  )
}

function WindowBand({ xs, w }) {
  return xs.map((x) => (
    <g key={x}>
      <rect x={x} y="17.6" width={w} height="7.8" fill="#0e1a2e" opacity="0.92" />
      <line x1={x} y1="17.6" x2={x + w} y2="17.6" stroke="rgba(52,211,153,0.28)" strokeWidth="0.8" />
    </g>
  ))
}

function YutongUpper() {
  return (
    <g className="bus-upper">
      {/* body */}
      <path
        d="M 0 40 L 2.5 40 L 2 27.7 L 0 16.3 C 1.2 13.2 4 10.2 10 7 Q 62 6.6 114 7 C 117.5 7 119.5 8.8 120 10 L 120 30 L 120 40 L 106.83 40 A 5.7 5.7 0 0 0 102.17 40 L 17.83 40 A 5.7 5.7 0 0 0 13.17 40 L 2.5 40 Z"
        fill="#0a1526"
      />
      {/* crowned roof edge */}
      <path d="M 10 7 Q 62 6.6 114 7" fill="none" stroke="rgba(52,211,153,0.35)" strokeWidth="1.2" />
      <WindowBand xs={[26.9, 45.3, 63.7, 82.1, 100.5]} w={16} />
      {/* right-flank door seam */}
      <path d="M 9.2 20 L 17.8 20 L 17.8 38.5 L 9.2 38.5 Z M 13.5 20 L 13.5 38.5" fill="none" stroke="#16233c" strokeWidth="1.2" />
      {/* gold belt line (variant accent) */}
      <line className="bus-accent" x1="3" y1="26.4" x2="117" y2="26.4" strokeWidth="1.2" opacity="0.85" />
      {/* headlight (front, nose at x=0) */}
      <g>
        <circle cx="1.6" cy="30" r="3.5" fill="rgba(252,211,77,0.25)" />
        <path d="M 0.4 28.8 L 2.8 28.8 Q 3.4 28.8 3.4 30 Q 3.4 31.2 2.8 31.2 L 0.4 31.2 Z" fill="#fde68a" />
        <rect x="0.6" y="33" width="1.8" height="1.6" rx="0.8" fill="rgba(252,211,77,0.5)" />
      </g>
      {/* tail light */}
      <g>
        <rect x="116.8" y="29" width="3.2" height="2.2" rx="1.1" fill="#fcd34d" stroke="#f87171" strokeWidth="0.8" />
        <rect x="117.6" y="33" width="2.4" height="1.4" rx="0.7" fill="rgba(248,113,113,0.55)" />
      </g>
      {/* VyGo route board on the windshield rake */}
      <path className="bus-route-board" d="M 1 14.9 L 5.1 15.8 L 4.9 18.5 L 0.9 17.6 Z" fill="#10b981" opacity="0.85" />
      {/* roof AC pod (Express only) */}
      <path d="M 40 6.8 L 40 5.2 Q 40 4.8 43 4.8 L 69 4.8 Q 72 4.8 72 5.2 L 72 6.8 Z" fill="#0d1b30" stroke="#1c2a4a" strokeWidth="0.8" />
      {[46, 54, 62].map((x) => (
        <rect key={x} x={x} y="5.6" width="2.4" height="0.6" fill="#1c2a4a" />
      ))}
    </g>
  )
}

function YutongWheels() {
  return (
    <g className="bus-under">
      <Wheel cx={15.5} cy={34.8} />
      <Wheel cx={104.5} cy={34.8} />
    </g>
  )
}

function VikingUpper() {
  return (
    <g className="bus-upper">
      {/* boxier body */}
      <path
        d="M 0 40 L 3 40 L 2.5 27.7 L 1.5 17.5 C 2.2 13.5 4.5 10 8 7.5 L 102 7.5 C 107 7.5 109 9 110 10.5 L 110 29 L 110 40 L 96.33 40 A 5.7 5.7 0 0 0 91.67 40 L 20.33 40 A 5.7 5.7 0 0 0 15.67 40 L 3 40 Z"
        fill="#0a1526"
      />
      {/* flat roof edge */}
      <path d="M 8 7.5 L 102 7.5" fill="none" stroke="rgba(52,211,153,0.35)" strokeWidth="1.2" />
      <WindowBand xs={[23.65, 39.85, 56.05, 72.25, 88.45]} w={14.1} />
      {/* door seam */}
      <path d="M 8.1 20 L 15.7 20 L 15.7 38.5 L 8.1 38.5 Z M 11.9 20 L 11.9 38.5" fill="none" stroke="#16233c" strokeWidth="1.2" />
      {/* blue belt line (variant accent) */}
      <line className="bus-accent" x1="3" y1="26.4" x2="107" y2="26.4" strokeWidth="1.2" opacity="0.85" />
      <g>
        <circle cx="1.5" cy="30" r="3.0" fill="rgba(252,211,77,0.25)" />
        <rect x="0.5" y="29" width="2.0" height="2.2" rx="1" fill="#fde68a" />
        <rect x="0.7" y="33" width="1.4" height="1.6" rx="0.7" fill="rgba(252,211,77,0.45)" />
      </g>
      <g>
        <rect x="106.8" y="29" width="3.2" height="2.2" rx="1.1" fill="#fcd34d" stroke="#f87171" strokeWidth="0.8" />
        <rect x="107.6" y="33" width="2.4" height="1.4" rx="0.7" fill="rgba(248,113,113,0.55)" />
      </g>
      <path className="bus-route-board" d="M 1 15.7 L 4.5 16.5 L 4.3 18.4 L 0.9 17.6 Z" fill="#10b981" opacity="0.85" />
    </g>
  )
}

function VikingWheels() {
  return (
    <g className="bus-under">
      <Wheel cx={18} cy={34.8} />
      <Wheel cx={94} cy={34.8} />
    </g>
  )
}

/** Inline Express bus (no ground shadow — the hero places its own). */
export function YutongBus({ className = '' }) {
  return (
    <g className={className}>
      <YutongUpper />
      <YutongWheels />
    </g>
  )
}

/** Inline Normal bus (no ground shadow — the hero places its own). */
export function VikingBus({ className = '' }) {
  return (
    <g className={className}>
      <VikingUpper />
      <VikingWheels />
    </g>
  )
}

/** <defs> provider for <use>-based reuse; includes the ground shadow rect. */
export default function BusSilhouetteDefs({ id = 'vygo-bus-defs' }) {
  return (
    <defs id={id}>
      <g id={BUS_IDS.express}>
        <YutongUpper />
        <YutongWheels />
        <rect className="bus-shadow" x="1" y="40.6" width="118" height="1.2" rx="0.6" fill="#020617" opacity="0.55" />
      </g>
      <g id={BUS_IDS.normal}>
        <VikingUpper />
        <VikingWheels />
        <rect className="bus-shadow" x="1" y="40.6" width="108" height="1.2" rx="0.6" fill="#020617" opacity="0.55" />
      </g>
    </defs>
  )
}
