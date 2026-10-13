import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { playSelect } from '../components/seat3d/Sound'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { toLocalYMD } from '../utils/dates'
import HeroBusScene from '../components/HeroBusScene'
import Reveal from '../components/nexus/Reveal'
import TiltCard from '../components/nexus/TiltCard'
import Magnetic from '../components/nexus/Magnetic'
import Counter from '../components/nexus/Counter'
import Typewriter from '../components/nexus/Typewriter'
import { operatorInitials } from '../components/OperatorChips'
import { corridorCodeFromTrip, displayCorridorCode } from '../components/ExpresswayCorridors'
import {
  FaSearch,
  FaArrowRight,
  FaRoute,
  FaBolt,
  FaBus,
  FaQrcode,
  FaFlagCheckered,
  FaExchangeAlt,
  FaMapMarkerAlt,
  FaRobot,
  FaLock,
  FaClock,
  FaCalendarDay,
  FaStar,
  FaLifeRing,
  FaAndroid,
} from 'react-icons/fa'

// Local calendar date (YYYY-MM-DD) — toISOString() renders UTC and can drift a
// day for users east of the meridian (Sri Lanka is UTC+05:30).
const today = () => toLocalYMD()

// URL-addressable search: the current search lives in the query string
// (?from=&to=&date=&busType=&sort=&corridor=&type=) so a refresh, a share or a
// "back to results" from seat selection lands on the exact same results.
const searchToQuery = (params) => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) {
    if (v != null && v !== '') qs.set(k, v)
  }
  const str = qs.toString()
  return str ? `/?${str}` : '/'
}

// True network facts for the expressway remake (see docs/ux-research.md).
const HIGHLIGHTS = [
  { icon: FaRoute, label: '146 routes', detail: 'Across the island' },
  { icon: FaBolt, label: 'E01 · E03', detail: 'Expressway corridors' },
  { icon: FaBus, label: '16 bus owners', detail: 'SLTB + private fleets' },
  { icon: FaQrcode, label: 'QR e-tickets', detail: 'Board with your phone' },
]

// Real corridors + airport run (replaces the old city-only quick routes).
// City names must match the backend route vocabulary exactly (the /buses/search
// endpoint matches from/to with case-insensitive equality).
const QUICK_ROUTES = [
  { from: 'Colombo', to: 'Kataragama', label: 'Colombo → Kataragama' },
  { from: 'Colombo', to: 'Jaffna', label: 'Colombo → Jaffna' },
  { from: 'Makumbura', to: 'Kandy', label: 'Makumbura → Kandy' },
  { from: 'Colombo', to: 'Katunayake Airport', label: 'Colombo → Katunayake Airport' },
  { from: 'Kandy', to: 'Galle', label: 'Kandy → Galle' },
  { from: 'Colombo', to: 'Trincomalee', label: 'Colombo → Trincomalee' },
]

// One-tap corridor chips on the search card.
const CORRIDOR_CHIPS = [
  { code: 'E01', label: 'E01 · Southern', from: 'Colombo', to: 'Kataragama' },
  { code: 'E03', label: 'E03 · Airport', from: 'Colombo', to: 'Katunayake Airport' },
]

// City / stop vocabulary for the From/To typeahead. These names must match the
// backend route vocabulary (the /buses/search endpoint matches from/to with
// case-insensitive equality), so the suggestions are real, bookable places.
const CITY_OPTIONS = Array.from(
  new Set([
    ...QUICK_ROUTES.flatMap((r) => [r.from, r.to]),
    'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Kataragama', 'Makumbura',
    'Katunayake Airport', 'Trincomalee', 'Matara', 'Negombo', 'Anuradhapura',
    'Polonnaruwa', 'Nuwara Eliya', 'Batticaloa', 'Matale', 'Kurunegala',
    'Ratnapura', 'Badulla', 'Monaragala', 'Hambantota', 'Puttalam', 'Chilaw',
    'Gampaha', 'Kalutara', 'Panadura', 'Avissawella', 'Kegalle', 'Dambulla',
    'Sigiriya', 'Ella', 'Bandarawela', 'Haputale', 'Welimada', 'Vavuniya', 'Mannar',
  ])
)

const isGovOperator = (name = '') => /sltb/i.test(name || '')

// The "corridor thread": a thin animated line that draws itself between the
// origin and destination once both are set, with a travelling pulse that hints
// at the journey between them. Transform/opacity only; honours reduced-motion.
function RouteThread({ from, to }) {
  if (!from || !to) return null
  return (
    <div className="mt-4 flex items-center gap-3 px-1">
      <span className="badge-aurora shrink-0 rounded-full border border-nexus-500/30 bg-nexus-500/10 px-3 py-1.5 text-xs font-medium text-nexus-200">
        {from}
      </span>
      <div className="relative h-3 flex-1">
        <svg className="h-3 w-full" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
          <line x1="2" y1="3" x2="98" y2="3" stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
          <motion.line
            x1="2"
            y1="3"
            x2="98"
            y2="3"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </svg>
        <motion.span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-nexus-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.7)]"
          initial={{ left: '0%' }}
          animate={{ left: ['0%', '100%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
        />
      </div>
      <span className="badge-aurora shrink-0 rounded-full border border-nexus-500/30 bg-nexus-500/10 px-3 py-1.5 text-xs font-medium text-nexus-200">
        {to}
      </span>
    </div>
  )
}

const isExpresswayTrip = (t = {}) =>
  String(t.routeType || '').toUpperCase() === 'EXPRESSWAY' ||
  /^E\d+/i.test(String(t.routeNumber || '')) ||
  /^E\d+/i.test(String(t.expresswayCode || ''))

export default function Home() {
  const location = useLocation()
  const { user } = useAuth()
  const [from, setFrom] = useState(location.state?.from || 'Colombo')
  const [to, setTo] = useState(location.state?.to || 'Kandy')
  const [date, setDate] = useState(location.state?.date || today())
  const [busType, setBusType] = useState('')
  const [sort, setSort] = useState('')
  const [expresswayOnly, setExpresswayOnly] = useState('all') // 'all' | 'expressway'
  const [corridor, setCorridor] = useState('') // '' | 'E01' | 'E03'
  const [routeTag, setRouteTag] = useState('')
  const [swapping, setSwapping] = useState(false) // classic route number carried from Routes (e.g. "99")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const lastAuto = useRef(null)

  const runSearch = async (params) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/buses/search', { params })
      setResults(res.data)
      setSearched(true)
    } catch (err) {
      setError(errorMessage(err, 'Search failed'))
    } finally {
      setLoading(false)
    }
  }

  // Build the request params from explicit filter values. Using defaults for
  // the current state means an override is *never* clobbered by a stale closure
  // (the old code re-applied `sort`/`busType` after spreading overrides, so an
  // immediate re-search on the road-type toggle or bus-type select would send
  // the previous value instead of the newly selected one).
  const baseParams = (overrides = {}, { bt = busType, s = sort, eo = expresswayOnly } = {}) => {
    const params = { from, to, date, ...overrides }
    if (overrides.busType !== undefined) params.busType = overrides.busType
    else if (bt) params.busType = bt
    if (overrides.sort !== undefined) params.sort = overrides.sort
    else if (s) params.sort = s
    // The backend accepts a server-side route-type filter (Route.RouteType).
    if (eo === 'expressway') params.type = 'EXPRESSWAY'
    return params
  }

  // Keep the URL in sync with the latest search so the page is refreshable and
  // deep-linkable (spec: URL-addressable search results).
  const persistSearch = (params) => {
    try {
      window.history.replaceState(null, '', searchToQuery(params))
    } catch {
      /* history unavailable — the search still works in-memory */
    }
  }

  const search = (e) => {
    e?.preventDefault()
    setCorridor('')
    setRouteTag('')
    persistSearch(baseParams({ corridor: '' }))
    runSearch(baseParams())
  }

  useEffect(() => {
    const s = location.state
    if (!s?.runSearch) return
    // Carry the corridor / classic-route context that Routes and the corridor
    // cards hand off (docs/ux-research.md G4, R3): an E01/E03 link must
    // pre-target an expressway-only search, not a generic pair search.
    const ec = s.expresswayCode ? displayCorridorCode(s.expresswayCode) : ''
    const corridorMode = ec || s.corridor || ''
    const key = `${s.from}|${s.to}|${s.date}|${ec}|${s.routeNumber || ''}|${s.busType || ''}|${s.sort || ''}`
    if (lastAuto.current === key) return
    lastAuto.current = key
    if (s.from) setFrom(s.from)
    if (s.to) setTo(s.to)
    if (s.date) setDate(s.date)
    if (s.busType != null) setBusType(s.busType)
    if (s.sort != null) setSort(s.sort)
    if (corridorMode) {
      setCorridor(corridorMode)
      setExpresswayOnly('expressway')
    } else if (s.type === 'EXPRESSWAY') {
      setExpresswayOnly('expressway')
    }
    setRouteTag(s.routeNumber || '')
    runSearch({
      from: s.from,
      to: s.to,
      date: s.date,
      ...(s.busType ? { busType: s.busType } : {}),
      ...(s.sort ? { sort: s.sort } : {}),
      ...(s.type === 'EXPRESSWAY' || ec ? { type: 'EXPRESSWAY' } : {}),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // Deep-link / refresh restore: if we landed with a search in the query string
  // (and no hand-off state), run that search on mount. Guards via lastAuto so
  // it can't double-fire with the location.state effect.
  useEffect(() => {
    if (location.state?.runSearch) return
    const params = new URLSearchParams(window.location.search)
    const f = params.get('from')
    const t = params.get('to')
    if (!f || !t) return
    const corridorVal = params.get('corridor') || ''
    const type = params.get('type') || ''
    const saved = {
      from: f,
      to: t,
      date: params.get('date') || today(),
      busType: params.get('busType') || '',
      sort: params.get('sort') || '',
    }
    const key = `${f}|${t}|${saved.date}|${corridorVal}|${saved.busType}|${saved.sort}`
    if (lastAuto.current === key) return
    lastAuto.current = key
    setFrom(saved.from)
    setTo(saved.to)
    setDate(saved.date)
    setBusType(saved.busType)
    setSort(saved.sort)
    if (corridorVal) {
      setCorridor(corridorVal)
      setExpresswayOnly('expressway')
    } else if (type === 'EXPRESSWAY') {
      setExpresswayOnly('expressway')
    }
    runSearch({
      from: saved.from,
      to: saved.to,
      date: saved.date,
      ...(saved.busType ? { busType: saved.busType } : {}),
      ...(saved.sort ? { sort: saved.sort } : {}),
      ...(type === 'EXPRESSWAY' ? { type: 'EXPRESSWAY' } : {}),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const swap = () => {
    setSwapping(true)
    try { playSelect() } catch {}
    setFrom(to)
    setTo(from)
    setTimeout(() => setSwapping(false), 450)
  }

  const quickSearch = (r) => {
    setCorridor('')
    setRouteTag('')
    setFrom(r.from)
    setTo(r.to)
    persistSearch(baseParams({ from: r.from, to: r.to, corridor: '' }))
    runSearch(baseParams({ from: r.from, to: r.to }))
  }

  const corridorSearch = (c) => {
    setCorridor(c.code)
    setRouteTag('')
    setExpresswayOnly('expressway')
    setFrom(c.from)
    setTo(c.to)
    // A corridor chip promises expressway trips (E01 · Southern), so the
    // server-side filter must be expressway-only, matching docs/ux-research.md R1.
    persistSearch(baseParams({ from: c.from, to: c.to, type: 'EXPRESSWAY', corridor: c.code }))
    runSearch(baseParams({ from: c.from, to: c.to, type: 'EXPRESSWAY' }))
  }

  const changeSort = (e) => {
    const next = e.target.value
    setSort(next)
    const params = baseParams({}, { s: next })
    persistSearch({ ...params, corridor })
    runSearch(params)
  }

  const toggleRoadType = (mode) => {
    setExpresswayOnly(mode)
    // Re-run with the server-side route-type filter so results reflect the
    // toggle immediately, even when no manual search has happened yet. The
    // `eo` override guarantees the request carries type=EXPRESSWAY the moment
    // it is switched on (not on the *next* render).
    const params = baseParams({}, { eo: mode })
    persistSearch({ ...params, corridor })
    runSearch(params)
    setSearched(true)
  }

  const openAssistant = () => window.dispatchEvent(new Event('vygo:assistant-open'))

  // Belt-and-suspenders client-side fallback: if a backend deploy ignores the
  // `type` param, still hide non-expressway trips while the toggle is on.
  const displayed =
    expresswayOnly === 'expressway' ? results.filter((t) => isExpresswayTrip(t)) : results

  const toggleSegment = 'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors'

  const heroWords = ['Colombo → Kandy', 'E01 Southern Expressway', 'E03 Airport Express', 'Colombo → Jaffna']

  return (
    <div>
      {/* Hero — bus driving across the dusk expressway behind a dark gradient
          (LCP-friendly inline SVG, see docs/performance.md rec #5) */}
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-slate-800/70">
        <div className="absolute inset-0 bg-slate-950">
          <HeroBusScene />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-950/70 to-violet-950/40" />
          <div className="pointer-events-none absolute inset-0 scan-divider" />
        </div>
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-nexus-500/20 blur-3xl float-slow" />
        <div className="pointer-events-none absolute -right-16 bottom-6 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl float-slow" style={{ animationDelay: '-3s' }} />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="max-w-3xl">
            <Reveal>
              <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
                Expressway travel,{' '}
                <span className="gradient-text">across Sri Lanka</span>
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-4 max-w-xl text-lg text-slate-300">
                <Typewriter words={heroWords} className="font-medium text-nexus-300" /> — find your seat and book it in seconds.
              </p>
            </Reveal>
            <div className="mt-6 flex flex-wrap gap-3">
              {HIGHLIGHTS.map(({ icon: Icon, label, detail }, i) => (
                <Reveal key={label} delay={0.2 + i * 0.08}>
                  <div className="badge-aurora flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2.5 backdrop-blur-sm">
                    <Icon className="text-lg text-nexus-400" />
                    <div className="leading-tight">
                      <div className="text-sm font-semibold text-white">
                        {(() => {
                          const m = label.match(/^(\d+)\s+(.*)$/)
                          if (m) return <Counter to={parseInt(m[1], 10)} suffix={` ${m[2]}`} />
                          return label
                        })()}
                      </div>
                      <div className="text-[11px] text-slate-400">{detail}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.28}>
              <Link to="/download" className="btn-holo mt-5 inline-flex items-center gap-2">
                <FaAndroid /> Get the app
              </Link>
            </Reveal>
          </div>

          {/* Search card — futuristic glass panel */}
          <Reveal delay={0.3}>
            <form onSubmit={search} className="mx-auto mt-10 max-w-4xl">
              <div className="glow-border glass-strong rounded-2xl p-4 shadow-2xl shadow-black/40">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_minmax(0,11rem)]">
                <div>
                  <label className="label" htmlFor="home-from">From</label>
                  <div className="relative">
                    <FaMapMarkerAlt className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-nexus-400" />
                     <input
                       id="home-from"
                       className="input !pl-10"
                       value={from}
                       onChange={(e) => setFrom(e.target.value)}
                       placeholder="Departure city or stop"
                       list="vygo-cities"
                       autoComplete="off"
                       required
                     />
                  </div>
                </div>
                <div className="flex items-end justify-center">
                  <motion.button
                    type="button"
                    onClick={swap}
                    animate={{ rotate: swapping ? 180 : 0, scale: swapping ? 0.9 : 1 }}
                    whileHover={{ scale: 1.1, borderColor: '#22d3ee' }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                    title="Swap departure and destination"
                    aria-label="Swap departure and destination"
                    className="grid h-10 w-10 place-items-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-cyan-400 transition-colors shadow-sm"
                  >
                    <FaExchangeAlt className="text-sm" />
                  </motion.button>
                </div>
                <div>
                  <label className="label" htmlFor="home-to">To</label>
                  <div className="relative">
                    <FaFlagCheckered className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-nexus-400" />
                   <input
                       id="home-to"
                       className="input !pl-10"
                       value={to}
                       onChange={(e) => setTo(e.target.value)}
                       placeholder="Destination city or stop"
                       list="vygo-cities"
                       autoComplete="off"
                       required
                     />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="home-date">Date</label>
                  <div className="relative">
                    <FaCalendarDay className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-nexus-400" />
                    <input
                      id="home-date"
                      type="date"
                      className="input !pl-10"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={today()}
                      required
                    />
                  </div>
                </div>
              </div>

              <RouteThread from={from} to={to} />

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="sm:w-56">
                  <label className="label" htmlFor="home-bus-type">Bus type</label>
                  <select
                    id="home-bus-type"
                    className="input"
                    value={busType}
                    onChange={(e) => {
                      const next = e.target.value
                      setBusType(next)
                      // Reflect the choice in the URL and refresh results right
                      // away, so switching bus type actually changes the list.
                      const params = baseParams({}, { bt: next })
                      persistSearch(params)
                      runSearch(params)
                      setSearched(true)
                    }}
                  >
                    <option value="">All types</option>
                    <option value="AC">AC</option>
                    <option value="LUXURY">Luxury</option>
                    <option value="SEMI_LUXURY">Semi Luxury</option>
                    <option value="NORMAL">Normal</option>
                  </select>
                </div>

                <div>
                  <span id="road-type-label" className="label block">Road type</span>
                  <div
                    role="group"
                    aria-labelledby="road-type-label"
                    className="relative flex rounded-xl border border-slate-700 bg-slate-900/80 p-1"
                  >
                    <button
                      type="button"
                      onClick={() => toggleRoadType('all')}
                      className="relative z-10 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
                      aria-pressed={expresswayOnly === 'all'}
                    >
                      <span className={expresswayOnly === 'all' ? 'text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}>
                        All routes
                      </span>
                      {expresswayOnly === 'all' && (
                        <motion.span
                          layoutId="road-type-pill"
                          className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRoadType('expressway')}
                      className="relative z-10 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
                      aria-pressed={expresswayOnly === 'expressway'}
                    >
                      <span className={expresswayOnly === 'expressway' ? 'text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}>
                        Expressway only
                      </span>
                      {expresswayOnly === 'expressway' && (
                        <motion.span
                          layoutId="road-type-pill"
                          className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex-1" />
                <button type="submit" className="btn-nexus w-full sm:w-auto sm:min-w-40" disabled={loading}>
                  <FaSearch /> {loading ? 'Searching…' : 'Search trips'}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                <span className="text-xs text-slate-400">Corridors:</span>
                {CORRIDOR_CHIPS.map((c) => (
                  <motion.button
                    key={c.code}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={corridor === c.code}
                    onClick={() => { try { playSelect() } catch {}; corridorSearch(c); }}
                    className={`route-pill ${corridor === c.code ? 'route-pill--expressway' : ''}`}
                  >
                    {c.label}
                  </motion.button>
                ))}
                <span className="ml-1 text-xs text-slate-400">Popular:</span>
                {QUICK_ROUTES.map((r) => (
                  <motion.button
                    key={`${r.from}-${r.to}`}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { try { playSelect() } catch {}; quickSearch(r); }}
                    className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-300 hover:border-nexus-500/50 hover:text-white transition-colors"
                  >
                    {r.label || `${r.from} → ${r.to}`}
                  </motion.button>
                ))}
                <button
                  type="button"
                  onClick={openAssistant}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium text-nexus-300 transition-colors hover:text-nexus-200 hover:underline"
                >
                  <FaRobot /> Need help? Ask VyGo
                </button>
               </div>
            </div>
            <datalist id="vygo-cities">
              {CITY_OPTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
          </form>
          </Reveal>
        </div>
      </section>

      {/* Utility entry points — live route directory + help */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2" aria-label="Tools and support">
        <Reveal delay={0.05}>
          <Link
          to="/route-tools"
          className="card group flex items-center gap-4 p-5 transition-all duration-200 hover:border-nexus-500/60 hover:shadow-nexus-glow"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-nexus-500/15 text-nexus-400 glow-pulse">
            <FaRoute className="text-xl" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-white">Live Routes &amp; Bus Contacts</span>
            <span className="mt-0.5 block text-sm text-slate-400">
              Real-time departures and direct bus owner phone numbers
            </span>
          </span>
          <FaArrowRight className="ml-auto shrink-0 text-nexus-400 transition-transform group-hover:translate-x-1" />
        </Link>
        </Reveal>
        <Reveal delay={0.15}>
          <Link
          to="/help"
          className="card group flex items-center gap-4 p-5 transition-all duration-200 hover:border-nexus-500/60 hover:shadow-nexus-glow"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-nexus-500/15 text-nexus-400 glow-pulse">
            <FaLifeRing className="text-xl" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-white">Help &amp; Support</span>
            <span className="mt-0.5 block text-sm text-slate-400">
              FAQs, refunds and how to contact VyGo
            </span>
          </span>
          <FaArrowRight className="ml-auto shrink-0 text-nexus-400 transition-transform group-hover:translate-x-1" />
        </Link>
        </Reveal>
      </section>

      {/* Results */}
      {searched && !loading && (
        <section className="fade-in">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 role="status" aria-live="polite" className="font-display text-2xl font-bold text-white">
              <span className="gradient-text">{displayed.length} trip{displayed.length === 1 ? '' : 's'}</span>{' '}
              <span className="text-white">found</span>
              <span className="ml-2 align-middle text-sm font-normal text-slate-400">
                {from} → {to} · {date}
              </span>
              {expresswayOnly === 'expressway' && (
                <span className="ml-2 align-middle text-xs font-semibold text-expressway-400">· Expressway only</span>
              )}
              {corridor && <span className="ml-2 align-middle text-xs font-semibold text-expressway-400">· {corridor}</span>}
              {routeTag && (
                <span className="ml-2 align-middle text-xs font-semibold text-expressway-400">· Route {routeTag}</span>
              )}
            </h2>
            <select
              className="input !w-auto !py-2 text-xs"
              value={sort}
              onChange={changeSort}
              aria-label="Sort trips"
            >
              <option value="">Sort: departure</option>
              <option value="fare">Fare: low → high</option>
            </select>
          </div>

          {displayed.length === 0 ? (
            results.length > 0 && expresswayOnly === 'expressway' ? (
              <div className="glass-strong glow-border grid place-items-center rounded-2xl p-14 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
                  <FaSearch />
                </div>
                <p className="mt-4 font-semibold text-white">No expressway-only trips for {from} → {to} on {date}.</p>
                <p className="mt-1 text-sm text-slate-400">
                  We found {results.length} trip{results.length === 1 ? '' : 's'} on this route — view all of them.
                </p>
                <button type="button" onClick={() => setExpresswayOnly('all')} className="btn-holo mt-5">
                  Show all trips
                </button>
              </div>
            ) : (
              <div className="glass-strong glow-border grid place-items-center rounded-2xl p-14 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
                  <FaSearch />
                </div>
                <p className="mt-4 font-semibold text-white">No trips found for {from} → {to} on {date}.</p>
                <p className="mt-1 text-sm text-slate-400">
                  Try another route or date, or a nearby stop (e.g. Makumbura for expressway departures). You can also ask
                  VyGo Assistant for ideas.
                </p>
                <button type="button" onClick={openAssistant} className="btn-nexus mt-5">
                  <FaRobot /> Ask VyGo Assistant
                </button>
              </div>
            )
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {displayed.map((trip, i) => (
                <Reveal key={trip.tripId} delay={(i % 2) * 0.06}>
                  <Link
                  to="/seat-select"
                  state={{
                    trip,
                    search: {
                      from,
                      to,
                      date,
                      busType,
                      sort,
                      corridor,
                      type: expresswayOnly === 'expressway' ? 'EXPRESSWAY' : '',
                    },
                  }}
                  className="trip-card glow-border focus-ring group block transition-all duration-300 hover:shadow-nexus-glow relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="trip-card-time">{trip.departureTime}</span>
                        <FaArrowRight className="text-nexus-400 transition-transform group-hover:translate-x-1" />
                        <span className="trip-card-time">{trip.arrivalTime}</span>
                      </div>
                      <p className="trip-card-meta mt-1">
                        {trip.from} → {trip.to}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <FaClock className="text-nexus-400/70" /> {trip.durationMin} min
                        </span>
                        <span>{trip.distanceKm} km</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="badge bg-nexus-500/15 text-nexus-400">{trip.busType}</span>
                      {isExpresswayTrip(trip) ? (
                        <div className="flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                          </span>
                          <span>{corridorCodeFromTrip(trip) || 'E01 Expressway'}</span>
                        </div>
                      ) : (
                        trip.routeNumber && <span className="route-pill">Route {trip.routeNumber}</span>
                      )}
                    </div>
                  </div>

                  {/* Seat Availability Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Available seats</span>
                      <span className={trip.availableSeats <= 5 ? 'font-semibold text-amber-400' : 'font-semibold text-emerald-400'}>
                        {trip.availableSeats}/{trip.seatsTotal} seats left
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(8, Math.min(100, (trip.availableSeats / (trip.seatsTotal || 40)) * 100))}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: (i % 4) * 0.08 }}
                        className={`h-full rounded-full ${
                          trip.availableSeats <= 5
                            ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                            : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Operator trust signals & pricing */}
                  <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-800/80 pt-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="operator-chip">
                          <span className="operator-chip-avatar">{operatorInitials(trip.operator)}</span>
                          <span className="truncate">{trip.operator}</span>
                        </span>
                        {isGovOperator(trip.operator) ? (
                          <span className="badge bg-emerald-500/15 text-emerald-400" title="Government transport service">
                            SLTB · Government
                          </span>
                        ) : (
                          <span className="badge bg-slate-500/15 text-slate-300" title="Private licensed operator">
                            Private operator
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        {trip.rating ? (
                          <span className="flex items-center gap-1 text-amber-400" title="Bus owner rating">
                            <FaStar className="text-[10px]" /> {Number(trip.rating).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-expressway-400" title="Bus registration not rated">Trusted bus owner</span>
                        )}
                        <span title="Bus registration">{trip.busReg}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-extrabold text-nexus-400 tracking-tight">
                        LKR {Number(trip.fare).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">per seat</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent-400 transition-all duration-200 group-hover:translate-x-1">
                        Select Seat <FaArrowRight className="text-[10px]" />
                      </div>
                    </div>
                  </div>

                  {!user && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400/90 border-t border-slate-800/40 pt-2">
                      <FaLock className="text-[10px]" /> Sign in to book — compare fares & live schedules anytime.
                    </div>
                  )}
                </Link>
                </Reveal>
              ))}
            </div>
          )}
        </section>
      )}

      {searched && loading && (
        <section>
          <h2 role="status" aria-live="polite" className="mb-4 font-display text-xl font-bold text-white">Searching trips…</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass-strong glow-border animate-pulse rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-44 rounded-lg bg-slate-800" />
                  <div className="ml-auto h-5 w-20 rounded-lg bg-slate-800" />
                </div>
                <div className="mt-3 h-4 w-64 rounded bg-slate-800" />
                <div className="mt-4 h-12 w-full rounded-xl bg-slate-800" />
                <div className="mt-3 h-6 w-40 rounded-lg bg-slate-800" />
              </div>
            ))}
          </div>
        </section>
      )}

      {!searched && !loading && (
        <section className="mx-auto max-w-4xl text-center">
          <p className="text-sm text-slate-400">
            Compare fares, pick your seat, pay safely and board with a QR ticket. Need a hand?{' '}
            <button
              type="button"
              onClick={openAssistant}
              className="font-medium text-nexus-300 underline-offset-2 hover:underline"
            >
              Ask VyGo Assistant
            </button>
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Not sure of a route?{' '}
            <Link to="/routes" className="font-medium text-nexus-300 underline-offset-2 hover:underline">
              Browse the full route catalogue
            </Link>{' '}
            — expressway corridors and classic CTB services.
          </p>
        </section>
      )}
    </div>
  )
}
