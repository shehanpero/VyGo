import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import Reveal from '../components/nexus/Reveal'
import PullToRefresh from '../components/PullToRefresh'
import { FaArrowRight, FaBus, FaChair, FaClock, FaMapMarkerAlt, FaTicketAlt } from 'react-icons/fa'

const STATUS_STYLES = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  CONFIRMED: 'bg-emerald-500/15 text-emerald-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
  COMPLETED: 'bg-slate-500/15 text-slate-400',
}

const formatDate = (tripDate) =>
  tripDate ? new Date(tripDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

// Hydrate a minimal trip so the Payment page can render the itinerary when
// resuming an unpaid (PENDING) booking.
const buildTrip = (b) => ({
  tripId: b.tripId,
  from: b.boardingPoint?.city ?? '',
  to: b.dropoffPoint?.city ?? '',
  departureTime: b.bus?.departureTime ?? '',
  arrivalTime: b.bus?.arrivalTime ?? '',
  busType: b.bus?.type ?? '',
  busReg: b.bus?.reg ?? '',
  operator: b.bus?.operator ?? '',
  fare: b.seatsCount ? Number(b.totalFare) / b.seatsCount : 0,
  boardingPoints: b.boardingPoint ? [b.boardingPoint] : [],
  dropoffPoints: b.dropoffPoint ? [b.dropoffPoint] : [],
})

const resumeState = (b) => ({
  mode: 'resume',
  bookingRef: b.bookingRef,
  trip: buildTrip(b),
  seatNumbers: b.seatNumbers ?? [],
  boardingPointId: b.boardingPoint?.id,
  dropoffPointId: b.dropoffPoint?.id,
  totalFare: b.totalFare,
})

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/bookings/my', { params: { page: 0, size: 20 } })
      setBookings(res.data.content ?? [])
      setTotalElements(res.data.totalElements ?? 0)
    } catch (err) {
      setError(errorMessage(err, 'Failed to load your bookings'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <PullToRefresh onRefresh={load}>
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">My bookings</h1>
          <div className="scan-divider mt-3 w-40" />
        </div>
        <span className="badge badge-aurora bg-slate-500/15 text-slate-400">{totalElements} total</span>
      </div>

      {loading && (
        <div role="status" className="glass-strong glow-border rounded-2xl p-10 text-center text-slate-400">
          Loading bookings…
        </div>
      )}
      {!loading && error && (
        <div role="alert" className="glass-strong glow-border rounded-2xl border-red-800/50 p-10 text-center text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div className="glass-strong glow-border rounded-2xl p-12 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/20 to-nexus-300/15">
            <FaTicketAlt className="text-3xl text-nexus-400" />
          </div>
          <h2 className="font-display text-lg font-bold text-white">No bookings yet</h2>
          <p className="mt-2 text-sm text-slate-400">Search for a trip and book your first seat.</p>
          <Link to="/" className="btn-nexus mt-6">Find a trip</Link>
        </div>
      )}

      <div className="grid gap-4">
        {bookings.map((b, i) => (
          <Reveal key={b.bookingRef} delay={(i % 3) * 0.07}>
            <div className="glass-strong glow-border rounded-2xl p-5">
              <Link to={`/bookings/${b.bookingRef}`} className="group block">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-mono text-sm text-slate-300">
                    <FaTicketAlt className="text-nexus-400" />
                    {b.bookingRef}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-lg font-bold text-white">
                    <span>{b.boardingPoint?.name ?? '—'}</span>
                    <FaArrowRight className="text-nexus-400" />
                    <span>{b.dropoffPoint?.name ?? '—'}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-400">{formatDate(b.tripDate)}</div>
                </div>
                <span className={`badge ${STATUS_STYLES[b.status] ?? 'bg-slate-500/15 text-slate-400'}`}>{b.status}</span>
              </div>

              <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <FaBus className="text-nexus-400" />
                  {b.bus?.operator} · {b.bus?.type}
                  <span className="text-xs text-slate-400">{b.bus?.reg}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <FaClock className="text-nexus-400" />
                  Departs {b.bus?.departureTime}
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <FaChair className="text-nexus-400" />
                  {b.seatsCount} seat{b.seatsCount === 1 ? '' : 's'} · {b.seatNumbers?.join(', ')}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                <div className="text-sm text-slate-400">
                  <FaMapMarkerAlt className="mr-1 inline text-nexus-400" />
                  Boarding: {b.boardingPoint?.time} · Drop-off: {b.dropoffPoint?.time}
                </div>
                <div className="text-lg font-extrabold gradient-text">{`LKR ${Number(b.totalFare).toLocaleString()}`}</div>
              </div>
              </Link>

              {b.status === 'PENDING' && Number(b.paymentRequired) > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-700/40 pt-3">
                  <span className="text-xs text-amber-400">
                    Payment still due · LKR {Number(b.paymentRequired).toLocaleString()}
                  </span>
                  <Link
                    to="/pay"
                    state={resumeState(b)}
                    className="btn-nexus px-4 py-2 text-sm"
                  >
                    Complete payment
                  </Link>
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </div>
    </PullToRefresh>
  )
}
