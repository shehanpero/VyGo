import { motion } from 'framer-motion'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import Reveal from '../components/nexus/Reveal'
import {
  FaArrowRight,
  FaBus,
  FaChevronDown,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaRoad,
  FaRoute,
  FaSearch,
  FaTable,
  FaTimes,
} from 'react-icons/fa'

const DEBOUNCE_MS = 300

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'expressway', label: 'Expressway' },
  { value: 'normal', label: 'Normal' },
  { value: 'sltb', label: 'SLTB' },
  { value: 'private', label: 'Private' },
]

const COVERAGE_MODES = [
  { label: 'Normal + expressway', className: 'border border-slate-700/60 bg-slate-500/15 text-slate-300' },
  { label: 'Expressway only', className: 'border border-expressway-500/30 bg-expressway-500/15 text-expressway-300' },
  { label: 'Private luxury only', className: 'border border-amber-500/30 bg-amber-500/15 text-amber-300' },
  { label: 'SLTB only', className: 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300' },
]

const networkBadge = (network) =>
  network === 'EXPRESSWAY'
    ? 'border border-expressway-500/30 bg-expressway-500/15 text-expressway-300'
    : 'border border-slate-700/60 bg-slate-500/15 text-slate-300'

const hasSLTB = (r) =>
  /sltb/i.test(String(r.operatorType || '')) ||
  (Array.isArray(r.operators) && r.operators.some((o) => /sltb/i.test(String(o || ''))))

const isPrivate = (r) =>
  !(Array.isArray(r.operators) && r.operators.some((o) => /sltb/i.test(String(o || ''))))

function MapFallback() {
  return (
    <div className="glass-strong glow-border grid h-64 place-items-center rounded-2xl text-sm text-slate-400">
      <div className="flex items-center gap-2">
        <FaBus className="text-nexus-400/70" />
        Route map coming soon
      </div>
    </div>
  )
}

// RouteToolsMap is built in parallel by another agent — resolve it lazily so a
// missing or temporarily-broken module can never block this page's build.
const RouteToolsMap = lazy(() =>
  import('../components/RouteToolsMap')
    .then((m) => ({ default: m.default || MapFallback }))
    .catch(() => ({ default: MapFallback }))
)

function RouteToolCard({ route }) {
  const [open, setOpen] = useState(false)
  const [timetable, setTimetable] = useState([])
  const [tLoading, setTLoading] = useState(false)
  const [tError, setTError] = useState('')
  const fetchedRef = useRef(false)

  const pairs = useMemo(() => {
    const ops = Array.isArray(route.operators) ? route.operators : []
    const phones = Array.isArray(route.phones) ? route.phones : []
    const max = Math.max(ops.length, phones.length)
    const out = []
    for (let i = 0; i < max; i += 1) {
      if (ops[i] || phones[i]) out.push({ name: ops[i] || '', phone: phones[i] || '' })
    }
    return out
  }, [route])

  const routeNumbers = Array.isArray(route.routeNumbers) ? route.routeNumbers : []
  const viaText = Array.isArray(route.via) ? route.via.join(', ') : route.via
  const hasStats = route.distanceKm != null || route.durationMin != null

  const toggleTimetable = async () => {
    if (!route.hasBookableTrips) return
    const next = !open
    setOpen(next)
    if (next && !fetchedRef.current) {
      setTLoading(true)
      setTError('')
      try {
        const res = await api.get(`/route-tools/${route.id}/timetable`)
        setTimetable(Array.isArray(res.data) ? res.data : [])
        fetchedRef.current = true
      } catch (err) {
        setTError(errorMessage(err, 'Failed to load timetable'))
      } finally {
        setTLoading(false)
      }
    }
  }

  return (
    <Reveal className="h-full">
    <article className="glass-strong glow-border group flex h-full flex-col rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
            <FaRoute />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-white">{route.corridor || 'Unnamed route'}</h3>
            <div className="text-xs text-slate-400">{route.operatorType || 'Service'}</div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`badge ${networkBadge(route.network)}`}>{route.network || 'NORMAL'}</span>
          {!route.hasBookableTrips && (
            <span
              className="badge border border-slate-700/60 bg-slate-500/15 text-slate-400"
              title="No bookable trips online yet"
            >
              No online booking
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-800/50 px-4 py-3">
        <div className="min-w-0 text-right font-semibold text-white">
          <span className="block truncate">{route.fromCity || '—'}</span>
        </div>
        <div className="flex shrink-0 flex-col items-center px-2">
          <FaArrowRight className="text-nexus-400" />
          {route.durationMin != null && (
            <span className="mt-1 text-[10px] text-slate-400">{Number(route.durationMin)} min</span>
          )}
        </div>
        <div className="min-w-0 font-semibold text-white">
          <span className="block truncate">{route.toCity || '—'}</span>
        </div>
      </div>

      {viaText && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <FaMapMarkerAlt className="shrink-0 text-nexus-400/70" />
          <span className="truncate">via {viaText}</span>
        </p>
      )}

      <div className="mt-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Bus owners & contacts</div>
        {pairs.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {pairs.map((p, i) => (
              <li
                key={`${p.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm font-medium text-slate-200">{p.name || 'Bus owner'}</span>
                {p.phone ? (
                  <a
                    href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}
                    className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-nexus-300 hover:text-nexus-300"
                  >
                    <FaPhone className="text-[10px]" /> {p.phone}
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-slate-500">no contact listed</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Bus owner contacts not listed yet.</p>
        )}
      </div>

      {routeNumbers.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Route numbers</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {routeNumbers.map((n) => (
              <span key={n} className="route-pill">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasStats && (
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
          {route.distanceKm != null && (
            <span className="flex items-center gap-1.5">
              <FaRoad className="text-nexus-400/70" /> {Number(route.distanceKm)} km
            </span>
          )}
          {route.durationMin != null && (
            <span className="flex items-center gap-1.5">
              <FaClock className="text-nexus-400/70" /> {Number(route.durationMin)} min
            </span>
          )}
        </div>
      )}

      {route.notes && <p className="mt-4 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-400">{route.notes}</p>}

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={toggleTimetable}
          disabled={!route.hasBookableTrips}
          aria-expanded={open}
          aria-controls={`route-timetable-${route.id}`}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
            !route.hasBookableTrips
              ? 'cursor-not-allowed border-slate-800 bg-slate-800/30 text-slate-500'
              : open
                ? 'border-nexus-500/50 bg-nexus-500/10 text-nexus-300'
                : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-nexus-500/50 hover:text-white'
          }`}
        >
          <FaTable className="text-xs" />
          {open ? 'Hide timetable' : 'Timetable'}
          <FaChevronDown className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div id={`route-timetable-${route.id}`} className="mt-3">
            {tLoading ? (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/30 px-3 py-3 text-xs text-slate-400"
              >
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-t-nexus-500" />
                Loading timetable…
              </div>
            ) : tError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-xs text-red-400"
              >
                {tError}
              </div>
            ) : timetable.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-800/30 px-3 py-3 text-xs text-slate-400">
                No online-booking timetable yet — contact the bus owner.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[30rem] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/60 text-[10px] uppercase tracking-wider text-slate-400">
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Route
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Bus Owner
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Type
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Departure
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Arrival
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">
                        Fare
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetable.map((t, i) => (
                      <tr key={`${t.routeNumber}-${i}`} className="border-b border-slate-800/60 transition-colors last:border-0 hover:bg-slate-800/40">
                        <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-slate-200">
                          {t.routeNumber || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-300">{t.operator || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-400">{t.busType || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-300">{t.departureTime || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-300">{t.arrivalTime || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-nexus-400">
                          {t.fare != null ? `LKR ${Number(t.fare).toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
    </Reveal>
  )
}

export default function RouteToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawFilter = searchParams.get('filter') || 'all'
  const filter = FILTERS.some((f) => f.value === rawFilter) ? rawFilter : 'all'
  const query = searchParams.get('q') || ''
  const [input, setInput] = useState(query)
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setInput(query)
  }, [query])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        const trimmed = input.trim()
        if (trimmed) next.set('q', trimmed)
        else next.delete('q')
        return next
      }, { replace: true })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [input, setSearchParams])

  useEffect(() => {
    let cancelled = false
    const fetchRoutes = async () => {
      setLoading(true)
      setError('')
      try {
        const params = {}
        if (query) params.q = query
        if (filter === 'expressway' || filter === 'normal') params.network = filter.toUpperCase()
        const res = await api.get('/route-tools', { params })
        if (!cancelled) setRoutes(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Failed to load routes'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchRoutes()
    return () => {
      cancelled = true
    }
  }, [query, filter])

  const filtered = useMemo(() => {
    if (filter === 'sltb') return routes.filter(hasSLTB)
    if (filter === 'private') return routes.filter(isPrivate)
    return routes
  }, [routes, filter])

  const selectFilter = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('filter')
    else next.set('filter', value)
    if (query) next.set('q', query)
    else next.delete('q')
    setSearchParams(next)
  }

  const clearFilters = () => {
    setInput('')
    setSearchParams({})
  }

  const hasFilters = Boolean(query.trim() || filter !== 'all')
  const activeFilter = FILTERS.find((f) => f.value === filter)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold gradient-text">Live Routes &amp; Bus Contacts</h1>
        <p className="mt-1 text-sm text-slate-400">
          Real-time timetables and direct contact numbers for expressway corridors (E01–E03) and normal routes across
          Sri Lanka — bustimetable.lk style, live.
        </p>
        <div className="scan-divider mt-4 w-40" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Coverage</span>
          {COVERAGE_MODES.map((c) => (
            <span key={c.label} className={`badge ${c.className}`}>
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <section className="mb-10" aria-label="Route coverage map">
        <div className="mb-4">
          <span className="eyebrow">Route map</span>
          <h2 className="section-title">Coverage across the island</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Every corridor and bus owner service in the directory, pinned across the network.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="glass-strong glow-border grid h-64 place-items-center rounded-2xl text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-nexus-500" />
                Loading map…
              </div>
            </div>
          }
        >
          <RouteToolsMap routes={filtered} className="overflow-hidden rounded-2xl border border-slate-800" />
        </Suspense>
      </section>

      <div className="glass-strong glow-border mb-6 rounded-2xl p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="route-tools-search"
              className="input !pl-10"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search route, corridor or bus owner — e.g. Kandy, E01, SLTB"
              aria-label="Search routes and bus owners"
            />
          </div>
          <div>
            <span id="route-tools-filter-label" className="sr-only">
              Coverage filter
            </span>
            <div
              role="group"
              aria-labelledby="route-tools-filter-label"
              className="flex flex-wrap rounded-xl border border-slate-700 bg-slate-800/60 p-1"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => selectFilter(f.value)}
                  aria-pressed={filter === f.value}
                  className="relative z-10 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
                >
                  <span className={filter === f.value ? 'text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}>
                    {f.label}
                  </span>
                  {filter === f.value && (
                    <motion.span
                      layoutId="routetools-filter-pill"
                      className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
            <span className="text-xs text-slate-400">Active filters:</span>
            {query.trim() && <span className="badge bg-nexus-500/15 text-nexus-300">“{query.trim()}”</span>}
            {filter !== 'all' && activeFilter && (
              <span className="badge bg-expressway-500/15 text-expressway-300">{activeFilter.label}</span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white"
            >
              <FaTimes /> Clear all
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          {loading ? 'Loading routes…' : `${filtered.length} route${filtered.length === 1 ? '' : 's'} found`}
        </h2>
        {!loading && hasFilters && filtered.length > 0 && (
          <span className="text-xs text-slate-400">showing filtered results</span>
        )}
      </div>

      {loading ? (
        <div role="status" aria-live="polite" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <span className="sr-only">Loading routes…</span>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-strong glow-border animate-pulse rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-slate-800" />
                <div className="h-5 w-28 rounded-lg bg-slate-800" />
              </div>
              <div className="mt-4 h-14 w-full rounded-xl bg-slate-800" />
              <div className="mt-4 h-20 w-full rounded-xl bg-slate-800" />
              <div className="mt-4 h-10 w-full rounded-xl bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-strong glow-border grid place-items-center rounded-2xl p-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
            <FaSearch />
          </div>
          <p className="mt-4 font-semibold text-white">No routes match your filters</p>
          <p className="mt-1 text-sm text-slate-400">Try a different search term, another coverage filter, or clear the filters.</p>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-holo mt-5">
              <FaTimes /> Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div key={`${query}-${filter}`} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 fade-in">
          {filtered.map((route) => (
            <RouteToolCard key={route.id || route.corridor} route={route} />
          ))}
        </div>
      )}
    </div>
  )
}
