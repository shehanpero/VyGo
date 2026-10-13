import confetti from 'canvas-confetti'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api, errorMessage } from '../api/client'
import Reveal from '../components/nexus/Reveal'
import BottomSheet from '../components/BottomSheet'
import {
  FaArrowRight,
  FaBan,
  FaBus,
  FaCalendarAlt,
  FaChair,
  FaCheck,
  FaClock,
  FaCreditCard,
  FaMapMarkerAlt,
  FaTicketAlt,
  FaUndo,
  FaUser,
} from 'react-icons/fa'

const STATUS_STYLES = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  CONFIRMED: 'bg-emerald-500/15 text-emerald-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
  COMPLETED: 'bg-slate-500/15 text-slate-400',
}

const formatDate = (tripDate) =>
  tripDate ? new Date(tripDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

// The QR endpoint is authenticated, so a plain <img> (which can't attach the
// Bearer header) would 401. Fetch the PNG as a blob through the authed client
// and render it as an object URL instead.
function TicketQr({ t }) {
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let url = ''
    let cancelled = false
    const load = async () => {
      const path = String(t.qrCodeUrl || '').replace(/^\/api\/v1/, '')
      if (!path) return
      try {
        const res = await api.get(path, { responseType: 'blob' })
        if (cancelled) return
        url = URL.createObjectURL(res.data)
        setSrc(url)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    load()
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [t.qrCodeUrl])

  if (failed) {
    return (
      <div className="mx-auto mt-3 grid h-40 w-40 place-items-center rounded-lg bg-slate-800 p-1 text-xs text-slate-400">
        QR unavailable
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={`QR ticket for ${t.ticketRef} — seat ${t.seatNumber}`}
      className="mx-auto mt-3 h-40 w-40 rounded-lg bg-white p-1"
    />
  )
}

const BOOKING_STEPS = ['Booked', 'Confirmed', 'Completed']
const REFUND_STEPS = ['Requested', 'Processing', 'Refunded']

function bookingStep(status) {
  switch (status) {
    case 'PENDING':
      return { currentIndex: 0, failed: false }
    case 'CONFIRMED':
      return { currentIndex: 1, failed: false }
    case 'COMPLETED':
      return { currentIndex: 2, failed: false }
    case 'CANCELLED':
      return { currentIndex: 0, failed: true }
    default:
      return { currentIndex: 0, failed: false }
  }
}

function refundStep(status) {
  switch (status) {
    case 'PENDING':
      return { currentIndex: 0, failed: false }
    case 'PROCESSING':
      return { currentIndex: 1, failed: false }
    case 'COMPLETED':
    case 'REFUNDED':
      return { currentIndex: 2, failed: false }
    case 'FAILED':
      return { currentIndex: 1, failed: true }
    default:
      return { currentIndex: 0, failed: false }
  }
}

function Stepper({ steps, currentIndex, failed = false }) {
  return (
    <div className="flex flex-col">
      {steps.map((label, i) => {
        const isLast = i === steps.length - 1
        const isDone = i < currentIndex && !failed
        const isActive = i === currentIndex && !failed
        const isFailed = failed && i === currentIndex
        const node = isFailed
          ? 'border-red-500/60 bg-red-500/15 text-red-400'
          : isDone
            ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400'
            : isActive
              ? 'border-nexus-400/70 bg-nexus-500/15 text-nexus-300'
              : 'border-slate-700 bg-slate-800/60 text-slate-500'
        const labelColor = isFailed
          ? 'text-red-400'
          : isActive
            ? 'text-nexus-200'
            : isDone
              ? 'text-slate-300'
              : 'text-slate-500'
        return (
          <div key={label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <motion.div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-bold ${node}`}
                initial={{ scale: 0.6, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18, delay: i * 0.08 }}
              >
                {isFailed ? (
                  <FaBan className="text-xs" />
                ) : isDone ? (
                  <FaCheck className="text-xs" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </motion.div>
              {!isLast && (
                <div className="relative my-1 w-0.5 flex-1 bg-slate-700">
                  <motion.div
                    className="absolute inset-x-0 top-0 rounded bg-gradient-to-b from-nexus-500 to-violet-500"
                    initial={{ height: '0%' }}
                    animate={{ height: isDone ? '100%' : '0%' }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                  />
                </div>
              )}
            </div>
            <div className={isLast ? '' : 'pb-6'}>
              <p className={`text-sm font-semibold ${labelColor}`}>{label}</p>
              {isActive && !failed && <p className="text-xs text-slate-500">In progress</p>}
              {isFailed && <p className="text-xs text-red-400/80">Stopped</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function BookingDetail() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const hasTriggeredConfetti = useRef(false)

  useEffect(() => {
    if (booking?.status === 'CONFIRMED' && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true
      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.55 },
          colors: ['#22d3ee', '#38bdf8', '#818cf8', '#34d399', '#ffffff'],
        })
      } catch {}
    }
  }, [booking?.status])
  const [cancelOpen, setCancelOpen] = useState(false)

  // Hydrate a minimal trip so Payment can render the itinerary for a PENDING
  // booking whose payment was never completed (resume path).
  const buildTrip = useCallback(
    (b) => ({
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
    }),
    []
  )

  const resumePayment = useCallback(() => {
    if (!booking) return
    navigate('/pay', {
      state: {
        mode: 'resume',
        bookingRef: booking.bookingRef,
        trip: buildTrip(booking),
        seatNumbers: booking.seatNumbers ?? [],
        boardingPointId: booking.boardingPoint?.id,
        dropoffPointId: booking.dropoffPoint?.id,
        totalFare: booking.totalFare,
      },
    })
  }, [booking, buildTrip, navigate])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/bookings/${ref}`)
      setBooking(res.data)
    } catch (err) {
      setError(errorMessage(err, 'Failed to load booking'))
    } finally {
      setLoading(false)
    }
  }, [ref])

  useEffect(() => {
    load()
  }, [load])

  const cancelBooking = async () => {
    if (!reason.trim()) {
      setCancelError('Please provide a reason for cancellation.')
      return
    }
    setCancelling(true)
    setCancelError('')
    try {
      const res = await api.post(`/bookings/${ref}/cancel`, { reason })
      setBooking(res.data)
      return true
    } catch (err) {
      setCancelError(errorMessage(err, 'Failed to cancel booking'))
      return false
    } finally {
      setCancelling(false)
    }
  }

  if (loading)
    return (
      <div role="status" className="glass-strong glow-border loader-beam mx-auto max-w-3xl overflow-hidden rounded-2xl p-12 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
          <FaBus className="text-xl" />
        </div>
        <p className="mt-4 font-display text-sm font-semibold text-white">Loading booking…</p>
      </div>
    )
  if (error)
    return (
      <div className="glass-strong glow-border mx-auto max-w-3xl rounded-2xl p-10 text-center">
        <p role="alert" className="text-red-400">{error}</p>
        <Link to="/bookings" className="btn-holo mt-6">Back to my bookings</Link>
      </div>
    )
  if (!booking) return null

  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  const hasRefund = Boolean(booking.refund)

  return (
    <Reveal className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Booking detail</h1>
          <p className="mt-1 font-mono text-sm text-nexus-300">{booking.bookingRef}</p>
          <div className="scan-divider mt-3 w-40" />
        </div>
        <span className={`badge badge-aurora ${STATUS_STYLES[booking.status] ?? 'bg-slate-500/15 text-slate-400'}`}>
          {booking.status}
        </span>
      </div>

      {/* Booking status tracker */}
      <div className="glass-strong glow-border mb-6 rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
          <FaBus className="text-nexus-400" /> Booking status
        </h2>
        <Stepper steps={BOOKING_STEPS} {...bookingStep(booking.status)} />
      </div>

      {/* Itinerary */}
      <div className="glass-strong glow-border mb-6 rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
          <FaMapMarkerAlt className="text-nexus-400" /> Itinerary
        </h2>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-xl font-bold text-white">
              <span>{booking.boardingPoint?.city ?? '—'}</span>
              <FaArrowRight className="text-nexus-400" />
              <span>{booking.dropoffPoint?.city ?? '—'}</span>
            </div>
            <div className="mt-2 space-y-1 text-sm text-slate-400">
              <div>
                Board: <span className="text-slate-200">{booking.boardingPoint?.name}</span>
                {booking.boardingPoint?.time ? ` · ${booking.boardingPoint.time}` : ''}
              </div>
              <div>
                Drop-off: <span className="text-slate-200">{booking.dropoffPoint?.name}</span>
                {booking.dropoffPoint?.time ? ` · ${booking.dropoffPoint.time}` : ''}
              </div>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="flex items-center justify-end gap-1.5 text-slate-300">
              <FaBus className="text-nexus-400" /> {booking.bus?.operator}
            </div>
            <div className="text-xs text-slate-400">{booking.bus?.reg} · {booking.bus?.type}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <FaCalendarAlt className="text-nexus-400" /> {formatDate(booking.tripDate)}
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <FaClock className="text-nexus-400" /> Depart {booking.bus?.departureTime}
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <FaChair className="text-nexus-400" /> {booking.seatsCount} seat{booking.seatsCount === 1 ? '' : 's'}
          </div>
        </div>
        <div className="mt-2 text-sm text-slate-400">
          Seats: <span className="font-semibold text-white">{booking.seatNumbers?.join(', ')}</span>
        </div>
      </div>

      {/* Passenger + fare */}
      <div className="glass-strong glow-border mb-6 rounded-2xl p-5">
        <h2 className="mb-4 font-display text-lg font-bold text-white">Passenger &amp; fare</h2>
        <div className="flex items-center gap-1.5 text-sm text-slate-300">
          <FaUser className="text-nexus-400" /> {booking.passengerName ?? '—'}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="text-sm text-slate-400">
            Total fare
            <div className="text-2xl font-extrabold gradient-text">{`LKR ${Number(booking.totalFare).toLocaleString()}`}</div>
          </div>
          <div className="text-right text-sm">
            <span className="text-slate-400">Payment required</span>
            <div className="text-lg font-bold text-white">{booking.paymentRequired ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>

      {/* Pending payment — booking exists but is not confirmed yet */}
      {booking.status === 'PENDING' && Number(booking.paymentRequired) > 0 && (
        <div className="glass-strong glow-border mb-6 rounded-2xl border-amber-700/50 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-white">
            <FaCreditCard className="text-amber-400" /> Finish your payment
          </h2>
          <p className="text-sm text-slate-400">
            Your booking is reserved but not confirmed yet — LKR {Number(booking.paymentRequired).toLocaleString()} is
            still due. Complete payment to issue your QR e-tickets.
          </p>
          <button type="button" className="btn-nexus mt-4 w-full" onClick={resumePayment}>
            Continue to payment
          </button>
        </div>
      )}

      {/* Tickets */}
      {booking.status === 'CONFIRMED' && booking.tickets?.length > 0 && (        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
            <FaTicketAlt className="text-nexus-400" /> Tickets
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {booking.tickets.map((t) => (
              <div key={t.ticketRef} className="glass-strong glow-border rounded-2xl p-5 text-center">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-slate-300">{t.ticketRef}</span>
                  <span className="badge badge-aurora bg-emerald-500/15 text-emerald-400">{t.status}</span>
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Seat <span className="font-bold text-white">{t.seatNumber}</span>
                </div>
                <div className="mx-auto mt-3 grid h-40 w-40 place-items-center rounded-lg border border-nexus-500/30 bg-white p-1 shadow-[0_0_24px_-6px_rgba(34,211,238,0.5)]">
                  <TicketQr t={t} />
                </div>
                <p className="mt-2 text-xs text-slate-400">Show this QR to the conductor when boarding.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancellation */}
      {canCancel && (
        <div className="glass-strong glow-border mb-6 rounded-2xl p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
            <FaBan className="text-red-400" /> Cancel booking
          </h2>
          <p className="text-sm text-slate-400">
            Need to change plans? Cancel and we’ll process any eligible refund.
          </p>
          <button
            type="button"
            className="btn-danger mt-4 w-full"
            onClick={() => setCancelOpen(true)}
          >
            Cancel booking
          </button>
        </div>
      )}

      <BottomSheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel booking">
        <label className="label" htmlFor="cancel-reason">Reason</label>
        <input
          id="cancel-reason"
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Change of plans"
        />
        {cancelError && <p role="alert" className="mt-2 text-sm text-red-400">{cancelError}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-holo flex-1" onClick={() => setCancelOpen(false)}>
            Keep booking
          </button>
          <button
            type="button"
            className="btn-danger flex-1"
            disabled={cancelling}
            onClick={async () => {
              const ok = await cancelBooking()
              if (ok) setCancelOpen(false)
            }}
          >
            {cancelling ? 'Cancelling…' : 'Confirm cancel'}
          </button>
        </div>
      </BottomSheet>

      {/* Refund summary */}
      {hasRefund && (
        <div className="glass-strong glow-border mb-6 rounded-2xl border-red-800/50 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
            <FaUndo className="text-red-400" /> Refund
          </h2>
          <div className="mb-4">
            <Stepper steps={REFUND_STEPS} {...refundStep(booking.refund.status)} />
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Amount</div>
              <div className="font-bold text-white">LKR {Number(booking.refund.amount).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Fee</div>
              <div className="font-bold text-white">LKR {Number(booking.refund.fee).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Status</div>
              <span className={`badge mt-0.5 ${STATUS_STYLES[booking.refund.status] ?? 'bg-slate-500/15 text-slate-400'}`}>
                {booking.refund.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {booking.status === 'CANCELLED' && (
        <div className="glass-strong glow-border rounded-2xl border-red-800/50 p-5 text-sm text-slate-300">
          This booking was cancelled{booking.cancelReason ? ` — reason: ${booking.cancelReason}` : ''}.
          {hasRefund ? ' A refund has been processed (see above).' : ''}
        </div>
      )}

      <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Link to="/" className="btn-nexus w-full sm:w-auto">
          <FaBus /> Find another trip
        </Link>
        <Link to="/bookings" className="btn-holo w-full sm:w-auto">Back to my bookings</Link>
      </div>
    </Reveal>
  )
}
