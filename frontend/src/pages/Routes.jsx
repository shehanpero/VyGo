import { motion } from 'framer-motion'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { today } from '../utils/dates'
import ExpresswayCorridors, { displayCorridorCode } from '../components/ExpresswayCorridors'
import Reveal from '../components/nexus/Reveal'
import {
  FaSearch,
  FaArrowRight,
  FaRoad,
  FaClock,
  FaRoute,
  FaMapMarkerAlt,
  FaTimes,
} from 'react-icons/fa'

// Leaflet stays out of the main bundle — RouteMap is code-split and lands in
// the stable `leaflet` manual chunk (docs/performance.md §2.1).
const RouteMap = lazy(() => import('../components/RouteMap'))

const ROUTE_TYPES = ['NORMAL', 'EXPRESSWAY']
const ROUTE_CLASSES = ['CITY', 'SUBURBAN', 'INTERCITY', 'LONG_DISTANCE']
const DEBOUNCE_MS = 300

const typeBadge = (type) =>
  type === 'EXPRESSWAY' ? 'bg-expressway-500/15 text-expressway-300' : 'bg-slate-500/15 text-slate-300'

const classBadge = (routeClass) =>
  ({
    CITY: 'bg-nexus-500/15 text-nexus-400',
    SUBURBAN: 'bg-sky-500/15 text-sky-400',
    INTERCITY: 'bg-amber-500/15 text-amber-400',
    LONG_DISTANCE: 'bg-purple-500/15 text-purple-400',
  })[routeClass] || 'bg-slate-500/15 text-slate-400'

const ROUTE_CLASS_LABELS = {
  CITY: 'City',
  SUBURBAN: 'Suburban',
  INTERCITY: 'Intercity',
  LONG_DISTANCE: 'Long distance',
}

// Human corridor names so users see "Southern Expressway (E01)" not just "E01".
// The backend stores codes as E001/E003 — both forms map to the same corridor.
const CORRIDOR_NAMES = {
  E01: 'Southern Expressway',
  E001: 'Southern Expressway',
  E03: 'Colombo–Katunayake Expressway',
  E003: 'Colombo–Katunayake Expressway',
}

export default function Routes() {
  const [query, setQuery] = useState('')
  const [appliedQ, setAppliedQ] = useState('')
  const [type, setType] = useState('')
  const [routeClass, setRouteClass] = useState('')
  const [catalogue, setCatalogue] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get('/routes')
      .then((res) => !cancelled && setCatalogue(res.data || []))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setAppliedQ(query.trim()), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let cancelled = false
    const fetchRoutes = async () => {
      setLoading(true)
      setError('')
      try {
        const params = {}
        if (appliedQ) params.q = appliedQ
        if (type) params.type = type
        if (routeClass) params.routeClass = routeClass
        const res = await api.get('/routes', { params })
        if (!cancelled) setRoutes(res.data || [])
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
  }, [appliedQ, type, routeClass])

  const stats = useMemo(() => {
    const expressway = catalogue.filter((r) => r.routeType === 'EXPRESSWAY').length
    const boardingPoints = catalogue.reduce((sum, r) => sum + (Array.isArray(r.boardingPoints) ? r.boardingPoints.length : 0), 0)
    return { total: catalogue.length || 146, expressway: expressway || 2, boardingPoints }
  }, [catalogue])

  const hasFilters = Boolean(appliedQ || type || routeClass)

  const clearFilters = () => {
    setQuery('')
    setAppliedQ('')
    setType('')
    setRouteClass('')
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold gradient-text">Route Catalogue</h1>
        <p className="mt-1 text-sm text-slate-400">Browse every bus route across Sri Lanka — expressway corridors and classic CTB services</p>
        <div className="scan-divider mt-4 w-40" />
        <Link to="/route-tools" className="btn-holo mt-4 !py-2 text-xs">
          <FaRoute /> Open Live Routes &amp; Contacts
        </Link>
      </div>

      {/* Corridor explorer — map + corridor cards above the catalogue */}
      <section className="mb-10" aria-label="Corridor map">
        <div className="mb-4">
          <span className="eyebrow">Corridor map</span>
          <h2 className="section-title">Sri Lanka expressway & highway network</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            E01 Southern and E03 Airport expressways overlaid on the classic highways. Click a corridor for served towns
            and operators.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="glass-strong glow-border grid h-[460px] place-items-center rounded-2xl text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-nexus-500" />
                Loading corridor map…
              </div>
            </div>
          }
        >
          <RouteMap height={460} className="overflow-hidden rounded-2xl border border-slate-800" />
        </Suspense>
      </section>

      <ExpresswayCorridors className="mb-10" />

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="stat-tile">
          <p className="stat-tile-label">Routes on the network</p>
          <p className="stat-tile-value">{stats.total}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-tile-label">Expressway corridors</p>
          <p className="stat-tile-value">E01 · E03</p>
        </div>
        <div className="stat-tile">
          <p className="stat-tile-label">Bus Owners</p>
          <p className="stat-tile-value">16</p>
        </div>
        <div className="stat-tile">
          <p className="stat-tile-label">Boarding points</p>
          <p className="stat-tile-value tabular-nums">{stats.boardingPoints}</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="glass-strong glow-border mb-6 rounded-2xl p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input !pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by city or route number, e.g. Kandy, Kataragama or 122"
              aria-label="Search routes"
            />
          </div>

          <div>
            <span id="route-type-label" className="sr-only">Route type</span>
            <div
              role="group"
              aria-labelledby="route-type-label"
              className="relative flex rounded-xl border border-slate-700 bg-slate-900/80 p-1"
            >
              <button
                type="button"
                onClick={() => setType('')}
                aria-pressed={type === ''}
                className="relative z-10 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
              >
                <span className={type === '' ? 'text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}>
                  All
                </span>
                {type === '' && (
                  <motion.span
                    layoutId="routes-type-pill"
                    className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
              {ROUTE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(type === t ? '' : t)}
                  aria-pressed={type === t}
                  className="relative z-10 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
                >
                  <span className={type === t ? 'text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}>
                    {t === 'NORMAL' ? 'Normal' : 'Expressway'}
                  </span>
                  {type === t && (
                    <motion.span
                      layoutId="routes-type-pill"
                      className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="sr-only">Route class</span>
            <select
              className="input"
              value={routeClass}
              onChange={(e) => setRouteClass(e.target.value)}
              aria-label="Filter by route class"
            >
              <option value="">All classes</option>
              {ROUTE_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {ROUTE_CLASS_LABELS[c] || c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
            <span className="text-xs text-slate-400">Active filters:</span>
            {appliedQ && (
              <span className="badge bg-nexus-500/15 text-nexus-300">“{appliedQ}”</span>
            )}
            {type && <span className="badge bg-expressway-500/15 text-expressway-300">{type === 'EXPRESSWAY' ? 'Expressway' : 'Normal'}</span>}
            {routeClass && <span className="badge bg-amber-500/15 text-amber-300">{ROUTE_CLASS_LABELS[routeClass] || routeClass.replace('_', ' ')}</span>}
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
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          {loading ? 'Loading routes…' : `${routes.length} route${routes.length === 1 ? '' : 's'} found`}
        </h2>
        {!loading && hasFilters && routes.length > 0 && (
          <span className="text-xs text-slate-400">showing filtered results</span>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-strong glow-border animate-pulse rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-slate-800" />
                <div className="h-5 w-24 rounded-lg bg-slate-800" />
              </div>
              <div className="mt-4 h-16 w-full rounded-xl bg-slate-800" />
              <div className="mt-4 h-10 w-full rounded-xl bg-slate-800" />
            </div>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <div className="glass-strong glow-border grid place-items-center rounded-2xl p-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
            <FaSearch />
          </div>
          <p className="mt-4 font-semibold text-white">No routes match your filters</p>
          <p className="mt-1 text-sm text-slate-400">Try a different city, a nearby stop, or clear the filters below.</p>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-holo mt-5">
              <FaTimes /> Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div key={`${appliedQ}-${type}-${routeClass}`} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 fade-in">
          {routes.map((route, i) => (
            <Reveal key={route.id} delay={(i % 3) * 0.07} className="h-full">
            <article
              className="glass-strong glow-border group flex h-full flex-col rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
                    <FaRoute />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-lg font-bold text-white">{route.routeNumber || '—'}</span>
                      {route.expresswayCode ? (
                        <span className="route-pill route-pill--expressway">
                          {displayCorridorCode(route.expresswayCode)}
                        </span>
                      ) : (
                        route.routeType === 'EXPRESSWAY' && (
                          <span className="route-pill route-pill--expressway">E</span>
                        )
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {route.expresswayCode
                        ? CORRIDOR_NAMES[String(route.expresswayCode).replace(/^E/i, 'E')] || 'Expressway service'
                        : 'General road'}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`badge ${typeBadge(route.routeType)}`}>{route.routeType || 'NORMAL'}</span>
                  {route.routeClass && (
                    <span className={`badge ${classBadge(route.routeClass)}`}>
                      {ROUTE_CLASS_LABELS[route.routeClass] || route.routeClass.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-800/50 px-4 py-3">
                <div className="min-w-0 font-semibold text-white">
                  <span className="block truncate">{route.fromCity}</span>
                </div>
                <div className="flex shrink-0 flex-col items-center px-2">
                  <FaArrowRight className="text-nexus-400" />
                  <span className="mt-1 text-[10px] text-slate-400">
                    {Number(route.distanceKm)} km
                  </span>
                </div>
                <div className="min-w-0 text-right font-semibold text-white">
                  <span className="block truncate">{route.toCity}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <FaClock className="text-nexus-400/70" /> {route.durationMin} min
                </span>
                <span className="flex items-center gap-1.5">
                  <FaMapMarkerAlt className="text-nexus-400/70" />{' '}
                  {Array.isArray(route.boardingPoints) ? route.boardingPoints.length : 0} boarding pts
                </span>
                <span className="hidden items-center gap-1.5 sm:flex">
                  <FaRoad className="text-nexus-400/70" /> {Number(route.distanceKm)} km
                </span>
              </div>

              {/* Handoff fix: send date + runSearch:true so Home auto-runs the
                  pre-targeted search (see docs/ux-research.md G4). */}
              <Link
                to="/"
                state={{
                  from: route.fromCity,
                  to: route.toCity,
                  date: today(),
                  runSearch: true,
                  routeNumber: route.routeNumber || undefined,
                  expresswayCode: route.expresswayCode || undefined,
                }}
                className="btn-nexus mt-5 w-full"
              >
                <FaSearch /> Search trips
              </Link>
            </article>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}
