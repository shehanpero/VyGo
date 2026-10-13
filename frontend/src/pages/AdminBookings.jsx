import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import {
  FaTicketAlt,
  FaCreditCard,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa'

const statusBadge = (status) => {
  const s = (status || '').toUpperCase()
  const map = {
    CONFIRMED: 'bg-emerald-500/15 text-emerald-400',
    COMPLETED: 'bg-sky-500/15 text-sky-400',
    CANCELLED: 'bg-red-500/15 text-red-400',
    REJECTED: 'bg-red-500/15 text-red-400',
    PENDING: 'bg-amber-500/15 text-amber-400',
    SUCCESS: 'bg-emerald-500/15 text-emerald-400',
    PAID: 'bg-emerald-500/15 text-emerald-400',
    FAILED: 'bg-red-500/15 text-red-400',
    REFUNDED: 'bg-cyan-500/15 text-cyan-400',
    REFUND_PENDING: 'bg-amber-500/15 text-amber-400',
  }
  return map[s] || 'bg-slate-500/15 text-slate-300'
}

export default function AdminBookings() {
  const [tab, setTab] = useState('bookings')
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const size = 20

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const load = async () => {
      try {
        const isBookings = tab === 'bookings'
        const params = { page, size }
        if (status) params.status = status
        if (isBookings && q.trim()) params.q = q.trim()
        const res = await api.get(`/admin/${isBookings ? 'bookings' : 'payments'}`, { params })
        if (!cancelled) setData(res.data)
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, `Failed to load ${tab}`))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [tab, page, status, reload]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitSearch = (e) => {
    if (e) e.preventDefault()
    setPage(0)
    setReload((r) => r + 1)
  }

  const reset = () => {
    setStatus('')
    setQ('')
    setPage(0)
    setReload((r) => r + 1)
  }

  const fmt = (n) =>
    n == null ? '—' : `LKR ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

  const date = (v) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—')

  const pageButtons = []
  for (let i = 0; i < data.totalPages; i++) {
    pageButtons.push(i)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">All Bookings &amp; Payments</h1>
          <p className="text-sm text-slate-400">Every booking and payment across the platform</p>
          <div className="scan-divider mt-4 w-40" />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={tab === 'bookings' ? 'btn-holo' : 'btn-secondary'}
            onClick={() => {
              setTab('bookings')
              setPage(0)
            }}
          >
            <FaTicketAlt /> Bookings
          </button>
          <button
            type="button"
            className={tab === 'payments' ? 'btn-holo' : 'btn-secondary'}
            onClick={() => {
              setTab('payments')
              setPage(0)
            }}
          >
            <FaCreditCard /> Payments
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="glass-strong glow-border mb-5 flex flex-wrap items-center gap-3 rounded-2xl p-4">
        {tab === 'bookings' && (
          <form onSubmit={submitSearch} className="flex min-w-56 flex-1 items-center gap-2">
            <FaSearch className="text-slate-500" />
            <input
              className="input !py-2"
              placeholder="Search ref, passenger, mobile, route…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search bookings"
            />
          </form>
        )}
        <select
          className="input !w-auto !py-2"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(0)
            setReload((r) => r + 1)
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {tab === 'bookings'
            ? ['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))
            : ['PENDING', 'SUCCESS', 'FAILED', 'REFUND_PENDING', 'REFUNDED'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
        </select>
        <button type="button" className="btn-secondary" onClick={reset}>
          Reset
        </button>
      </div>

      <div role="status" aria-live="polite" className="mb-3 flex items-center gap-3 text-xs text-slate-400">
        <span>
          {data.totalElements.toLocaleString()} {tab} (page {page + 1} of {Math.max(data.totalPages, 1)})
        </span>
        {loading && <span className="loader-beam h-4 w-16 rounded-full" />}
      </div>

      {loading ? (
        <div className="glass-strong glow-border grid place-items-center rounded-2xl p-16 text-sm text-slate-400">
          Loading {tab}…
        </div>
      ) : data.content.length === 0 ? (
        <div className="glass-strong glow-border rounded-2xl p-10 text-center text-sm text-slate-400">
          No {tab} match the current filters.
        </div>
      ) : (
        <>
          {tab === 'bookings' ? (
            <div className="glass-strong glow-border overflow-x-auto rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Passenger</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Seats</th>
                    <th className="px-4 py-3 text-right">Fare</th>
                    <th className="px-4 py-3">Via</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((b) => (
                    <tr key={b.id} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-nexus-400">{b.bookingRef}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span>{b.passengerName || '—'}</span>
                          <span className="text-xs text-slate-500">{b.passengerMobile || ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {b.fromCity} → {b.toCity}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {b.tripDate ? new Date(b.tripDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">{b.seatsCount}</td>
                      <td className="px-4 py-3 text-right">{fmt(b.totalFare)}</td>
                      <td className="px-4 py-3 text-xs">{b.bookedVia || 'WALK-IN'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusBadge(b.status)}`}>{b.status || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{date(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="glass-strong glow-border overflow-x-auto rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Gateway TXN</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Gateway</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-4 py-3 text-xs text-slate-500">{p.id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-nexus-400">{p.bookingRef}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.gatewayTxnId}</td>
                      <td className="px-4 py-3 text-xs">{p.method || '—'}</td>
                      <td className="px-4 py-3 text-xs">{p.gateway || '—'}</td>
                      <td className="px-4 py-3 text-right">{fmt(p.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusBadge(p.status)}`}>{p.status || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{date(p.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <FaChevronLeft /> Prev
              </button>
              {pageButtons.slice(Math.max(0, page - 2), page + 3).map((i) => (
                <button
                  key={i}
                  type="button"
                  className={i === page ? 'btn-holo' : 'btn-secondary'}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                className="btn-secondary"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
              >
                Next <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}