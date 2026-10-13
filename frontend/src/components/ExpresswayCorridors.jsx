// VyGo — Expressway corridor explorer for the Routes page.
//
// Data is grounded in the backend network facts (docs/ux-research.md, routeGeo.js):
//   E01 Southern Expressway (Colombo/Makumbura ↔ Kandy, Galle, Matara, Tangalle,
//       Kataragama, Middeniya, Walasmulla, Beliatta, Hakmana, Ampara,
//       Siyambalanduwa, Badulla, Ella)
//   E03 Colombo–Katunayake Expressway (Colombo ↔ Katunayake Airport / Negombo)
//   A9 North Road (Colombo (Pettah) ↔ Jaffna / Vavuniya)
//   Classic numbered CTB routes: 1, 2, 4, 15, 16, 17/57, 47, 48, 99 (Badulla
//       side), 122 (Ratnapura/Embilipitiya/Rakwana/Kataragama), 138.
//
// Corridor cards are real <Link>s (focus-ring) so keyboard users get the
// WCAG 2.2 focus indicator, per the design-system contract.

import { Link } from 'react-router-dom'
import { FaArrowRight, FaRoute, FaPlane } from 'react-icons/fa'
import OperatorChips from './OperatorChips'
import { today } from '../utils/dates'

// The backend stores expressway codes as E001/E003 and route numbers as
// "EX 2-6" / "EX 3-1". These helpers normalise them to the human corridor
// codes used across the UI: E01 (Southern) and E03 (Colombo–Katunayake).
export function displayCorridorCode(code = '') {
  return String(code).replace(/^E0{2,}/i, 'E0')
}

export function corridorCodeFromTrip(t = {}) {
  const n = String(t.routeNumber || '')
  const m = n.match(/EX\s*(\d+)/i)
  if (m) {
    const d = m[1].replace(/^0+/, '')
    if (d === '3') return 'E03'
    if (d === '1' || d === '2') return 'E01'
  }
  if (t.expresswayCode) return displayCorridorCode(t.expresswayCode)
  return n
}

export const EXPRESSWAY_CORRIDORS = [
  {
    code: 'E01',
    name: 'Southern Expressway',
    tagline: 'Colombo / Makumbura ↔ Kandy · Galle · Matara · Tangalle · Kataragama',
    summary:
      'The fastest way to the deep south — Galle, Matara, Tangalle and Kataragama, plus hill-country runs to Kandy, Badulla and Ella via Makumbura.',
    towns: [
      'Colombo',
      'Makumbura',
      'Kandy',
      'Galle',
      'Matara',
      'Tangalle',
      'Kataragama',
      'Middeniya',
      'Walasmulla',
      'Beliatta',
      'Hakmana',
      'Ampara',
      'Siyambalanduwa',
      'Badulla',
      'Ella',
    ],
    operators: ['Expressway Bus', 'SLTTS Katubadda', 'NCG Express', 'Vishmitha Highway', 'GreenLeaf', 'Jayalath Traders'],
    search: { from: 'Colombo', to: 'Kataragama' },
    icon: FaRoute,
  },
  {
    code: 'E03',
    name: 'Colombo – Katunayake Expressway',
    tagline: 'Colombo ↔ Katunayake Airport · Negombo',
    summary:
      'The airport corridor — a fast, direct link from Colombo to Bandaranaike International Airport (CMB) and Negombo.',
    towns: ['Colombo', 'Katunayake', 'Negombo'],
    operators: ['Expressway Bus', 'SLTTS Katubadda', 'Dilanka Express'],
    search: { from: 'Colombo', to: 'Katunayake Airport' },
    icon: FaPlane,
  },
]

export const CLASSIC_CORRIDORS = [
  {
    code: 'A9',
    name: 'North Road (Colombo – Jaffna)',
    tagline: 'Colombo (Pettah) ↔ Vavuniya · Jaffna',
    towns: ['Colombo', 'Pettah', 'Kurunegala', 'Vavuniya', 'Jaffna'],
    operators: ['SLTB', 'Jaffna Travels', 'SK Sons', 'Liyanage Express'],
    search: { from: 'Pettah', to: 'Jaffna' },
  },
]

// Numbered CTB routes with only the endpoints the network facts guarantee:
// Route 99 runs Colombo (Pettah) → Badulla with Passara/Welimada/Bibila via
// boarding points; Route 122 starts at Pettah and reaches Kataragama via
// Avissawella/Ratnapura/Embilipitiya/Rakwana (122/1–122/4).
export const CLASSIC_FEATURED = [
  { number: '122', label: 'Pettah → Ratnapura · Embilipitiya · Rakwana → Kataragama', from: 'Pettah', to: 'Kataragama' },
  { number: '99', label: 'Colombo (Pettah) → Badulla · Passara · Welimada · Bibila', from: 'Colombo', to: 'Badulla' },
]

export const CLASSIC_ROUTE_PILLS = ['1', '2', '4', '15', '16', '17/57', '47', '48', '138']

export default function ExpresswayCorridors({ className = '' }) {
  return (
    <section className={className} aria-label="Expressway corridors">
      <div>
        <span className="eyebrow">Express corridors</span>
        <h2 className="section-title">E01 Southern · E03 Airport</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Expressway buses link Colombo and Makumbura to Kandy, Galle, Matara, Tangalle, Kataragama and the airport —
          book a seat and skip the traffic lights.
        </p>
      </div>

      {/* E01 / E03 corridor cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {EXPRESSWAY_CORRIDORS.map((c) => (
          <Link
            key={c.code}
            to="/"
            state={{ from: c.search.from, to: c.search.to, date: today(), runSearch: true, expresswayCode: c.code }}
            aria-label={`${c.code} ${c.name} — search trips from ${c.search.from} to ${c.search.to}`}
            className="corridor-card focus-ring block"
          >
            <span className="expressway-badge">{c.code} · Expressway</span>
            <h3 className="section-title mt-3">{c.name}</h3>
            <p className="mt-2 text-sm text-slate-400">{c.tagline}</p>
            <p className="mt-3 text-sm text-slate-300">{c.summary}</p>

            <div className="mt-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Served towns</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.towns.slice(0, 8).map((town) => (
                  <span
                    key={town}
                    className="rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-300"
                  >
                    {town}
                  </span>
                ))}
                {c.towns.length > 8 && <span className="px-1 py-0.5 text-[11px] text-slate-400">+{c.towns.length - 8} more</span>}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Bus Owners</div>
              <OperatorChips operators={c.operators} limit={4} className="mt-2" />
            </div>

            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-expressway-400">
              Search {c.search.from} → {c.search.to} <FaArrowRight className="text-xs" />
            </span>
          </Link>
        ))}
      </div>

      {/* Classic corridors + numbered CTB routes */}
      <hr className="divider--expressway my-8" />

      <div>
        <span className="eyebrow">Classic CTB routes</span>
        <h2 className="section-title">Numbered services that still run the island</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Government SLTB and private bus owners run the numbered classics — including pilgrim routes to Kataragama.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {CLASSIC_CORRIDORS.map((c) => (
            <Link
              key={c.code}
              to="/"
              state={{ from: c.search.from, to: c.search.to, date: today(), runSearch: true }}
              aria-label={`${c.code} ${c.name} — search trips from ${c.search.from} to ${c.search.to}`}
              className="corridor-card focus-ring block"
            >
              <span className="expressway-badge">{c.code} · Highway</span>
              <h3 className="section-title mt-3">{c.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{c.tagline}</p>
              <div className="mt-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Bus Owners</div>
                <OperatorChips operators={c.operators} limit={4} className="mt-2" />
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-expressway-400">
                Search {c.search.from} → {c.search.to} <FaArrowRight className="text-xs" />
              </span>
            </Link>
          ))}

          {/* Featured classic routes with guaranteed endpoints */}
          <div className="corridor-card focus-ring !p-5">
            <span className="expressway-badge">Route 99 · 122</span>
            <h3 className="section-title mt-3">Pilgrim & hill classics</h3>
            <div className="mt-4 flex flex-col gap-2">
              {CLASSIC_FEATURED.map((r) => (
                <Link
                  key={r.number}
                  to="/"
                  state={{ from: r.from, to: r.to, date: today(), runSearch: true, routeNumber: r.number }}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2.5 transition-colors hover:border-expressway-500/50"
                >
                  <span className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="route-pill route-pill--expressway">{r.number}</span>
                    <span className="text-xs text-slate-400">{r.label}</span>
                  </span>
                  <FaArrowRight className="shrink-0 text-xs text-slate-400 group-hover:text-expressway-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* All classic numbers */}
        <div className="mt-5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">All classic numbered routes</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {CLASSIC_ROUTE_PILLS.map((n) => (
              <span key={n} className="route-pill">
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
