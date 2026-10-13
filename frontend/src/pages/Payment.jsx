import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import Reveal from '../components/nexus/Reveal'
import { FaArrowRight, FaBus, FaCheckCircle, FaCreditCard, FaExternalLinkAlt, FaFlagCheckered, FaMapMarkerAlt, FaUser } from 'react-icons/fa'

const STORAGE_KEY = 'vygo_payment_ctx'

const STEPS = [
  { num: 1, label: 'Booking' },
  { num: 2, label: 'Payment' },
  { num: 3, label: 'Confirmation' },
]

// Resolve a boarding/drop-off id to its human stop name (from the trip object
// SeatSelect passes through navigation state). Falls back to the raw id only
// when the trip data is missing the points array.
function pointLabel(points, id) {
  const match = (points || []).find((p) => Number(p.id) === Number(id))
  if (!match) return null
  return match.city ? `${match.name} · ${match.city}` : match.name
}

export default function Payment() {
  const location = useLocation()
  const navigate = useNavigate()

  const [ctx, setCtx] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let initial = null
    if (location.state?.trip) {
      // Resume = the booking already exists (created earlier, payment never
      // completed), so skip the "create booking" step and jump straight to the
      // PayHere stage.
      const resume = location.state.mode === 'resume'
      initial = {
        ...location.state,
        step: resume ? 1 : 0,
        bookingRef: location.state.bookingRef || '',
        paymentId: '',
        txnId: '',
        amount: 0,
        redirectUrl: '',
      }
    } else {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        initial = raw ? JSON.parse(raw) : null
      } catch {
        initial = null
      }
    }
    if (initial) {
      setCtx(initial)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    }
  }, [location.state])

  const save = (next) => {
    setCtx(next)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const initiatePayment = async () => {
    setBusy('initiate')
    setError('')
    try {
      const res = await api.post('/payments/initiate', {
        bookingRef: ctx.bookingRef,
        method: 'CARD',
      })
      save({
        ...ctx,
        step: 2,
        paymentId: res.data.paymentId,
        txnId: res.data.txnId,
        amount: res.data.amount,
        redirectUrl: res.data.redirectUrl,
        sandbox: res.data.sandbox,
      })
    } catch (err) {
      setError(errorMessage(err, 'Failed to initiate payment'))
    } finally {
      setBusy('')
    }
  }

  const confirmPayment = async () => {
    setBusy('confirm')
    setError('')
    try {
      const res = await api.post('/payments/confirm', { txnId: ctx.txnId })
      if (res.data.status === 'SUCCESS') {
        sessionStorage.removeItem(STORAGE_KEY)
        navigate(`/bookings/${ctx.bookingRef}`)
      } else {
        setError(`Payment status: ${res.data.status}`)
      }
    } catch (err) {
      setError(errorMessage(err, 'Failed to confirm payment'))
    } finally {
      setBusy('')
    }
  }

  // Single-intent checkout: one "Pay now" action creates the booking and
  // opens PayHere in sequence, so passengers never see an internal
  // "create booking" step (docs/ux-journeys.md Journey A acceptance).
  const payNow = async () => {
    setBusy('paynow')
    setError('')
    try {
      const created = await api.post('/bookings', {
        lockToken: ctx.lockToken,
        tripId: ctx.trip.tripId,
        seatNumbers: ctx.seatNumbers,
        boardingPointId: Number(ctx.boardingPointId),
        dropoffPointId: Number(ctx.dropoffPointId),
      })
      const bookingRef = created.data.bookingRef
      save({ ...ctx, step: 1, bookingRef })
      const initiated = await api.post('/payments/initiate', {
        bookingRef,
        method: 'CARD',
      })
      save({
        ...ctx,
        step: 2,
        bookingRef,
        paymentId: initiated.data.paymentId,
        txnId: initiated.data.txnId,
        amount: initiated.data.amount,
        redirectUrl: initiated.data.redirectUrl,
        sandbox: initiated.data.sandbox,
      })
    } catch (err) {
      setError(errorMessage(err, 'Payment could not be started'))
    } finally {
      setBusy('')
    }
  }

  if (!ctx) {
    return (
      <div className="glass-strong glow-border mx-auto max-w-xl rounded-2xl p-12 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/20 to-nexus-300/15">
          <FaCreditCard className="text-3xl text-nexus-400" />
        </div>
        <h1 className="font-display text-xl font-bold gradient-text">No booking in progress</h1>
        <p className="mt-2 text-sm text-slate-400">Select seats for a trip first, then come back here to pay.</p>
        <Link to="/" className="btn-nexus mt-6">Back to search</Link>
      </div>
    )
  }

  const { trip } = ctx
  const step = ctx.step
  const boardingLabel =
    pointLabel(trip?.boardingPoints, ctx.boardingPointId) || `Boarding point ${ctx.boardingPointId}`
  const dropoffLabel =
    pointLabel(trip?.dropoffPoints, ctx.dropoffPointId) || `Drop-off point ${ctx.dropoffPointId}`

  return (
    <Reveal className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold gradient-text">Payment</h1>
        <p className="mt-1 text-sm text-slate-400">Secure checkout · powered by PayHere</p>
        <div className="scan-divider mt-4" />
      </div>

      {/* Step indicator */}
      <ol className="mb-8 flex items-center gap-2 sm:gap-4">
        {STEPS.map((s, i) => {
          const active = step >= s.num - 1
          const done = step > s.num - 1
          return (
            <li key={s.num} aria-current={step === s.num - 1 ? 'step' : undefined} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition-all duration-300 ${
                  active
                    ? 'glow-border bg-gradient-to-br from-nexus-500 via-violet-500 to-fuchsia-500 text-slate-950'
                    : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                {done ? <FaCheckCircle className="text-slate-950" /> : s.num}
              </span>
              <span className={`hidden text-sm font-medium sm:inline ${active ? 'font-display text-white' : 'text-slate-400'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={`h-px flex-1 rounded transition-colors duration-500 ${
                    active ? 'bg-gradient-to-r from-nexus-500/70 to-violet-500/40' : 'bg-slate-800'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>

      {/* Trip + seats summary (shown throughout) */}
      <div className="glass-strong glow-border mb-6 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-lg font-bold text-white">
            <FaBus className="text-nexus-400" />
            <span>{trip.departureTime}</span>
            <FaArrowRight className="text-nexus-400" />
            <span>{trip.arrivalTime}</span>
          </div>
          <span className="badge badge-aurora bg-nexus-500/15 text-nexus-400">{trip.busType}</span>
        </div>
        <div className="mt-2 text-sm text-slate-400">
          {trip.from} → {trip.to} · <FaUser className="mr-0.5 inline text-nexus-400" />{trip.operator} · {trip.busReg}
          {trip.routeNumber && <span className="text-slate-400"> · Route {trip.routeNumber}</span>}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-sm">
          <div className="text-slate-300">
            Seats: <span className="font-semibold text-white">{ctx.seatNumbers.join(', ')}</span>
          </div>
          <div className="text-slate-300">
            Total: <span className="text-lg font-extrabold gradient-text">{`LKR ${Number(ctx.totalFare).toLocaleString()}`}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <FaMapMarkerAlt className="text-nexus-400" />
            {boardingLabel}
          </span>
          <span className="flex items-center gap-1">
            <FaFlagCheckered className="text-nexus-400" />
            {dropoffLabel}
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-800/60 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Step 1 — pay now (creates the booking, then opens PayHere) */}
      {step === 0 && (
        <div className="glass-strong glow-border rounded-2xl p-6">
          <h2 className="mb-1 font-display text-lg font-bold text-white">Pay now</h2>
          <p className="mb-4 text-sm text-slate-400">
            We'll hold your seat{ctx.seatNumbers.length === 1 ? '' : 's'} while you complete card payment in the secure
            PayHere window.
          </p>
          <button type="button" className="btn-nexus w-full" disabled={busy === 'paynow'} onClick={payNow}>
            {busy === 'paynow'
              ? 'Starting payment…'
              : `Pay now · LKR ${Number(ctx.totalFare ?? (trip.fare * (ctx.seatNumbers?.length || 1))).toLocaleString()}`}
          </button>
        </div>
      )}

      {/* Step 2 — pay */}
      {step === 1 && (
        <div className="glass-strong glow-border rounded-2xl p-6">
          <h2 className="mb-1 font-display text-lg font-bold text-white">Pay securely</h2>
          <p className="mb-4 text-sm text-slate-400">
            Booking <span className="font-semibold text-white">{ctx.bookingRef}</span> is ready. Pay by card through
            PayHere.
          </p>
          <button type="button" className="btn-holo w-full" disabled={busy === 'initiate'} onClick={initiatePayment}>
            {busy === 'initiate' ? 'Preparing payment…' : 'Pay with card'}
          </button>
        </div>
      )}

      {/* Step 3 — confirm payment */}
      {step === 2 && (
        <div className="glass-strong glow-border rounded-2xl p-6">
          <h2 className="mb-1 font-display text-lg font-bold text-white">Confirm payment</h2>
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Amount due</span>
              <span className="text-lg font-extrabold gradient-text">{`LKR ${Number(ctx.amount).toLocaleString()}`}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-slate-400">Transaction ID</span>
              <span className="font-mono text-xs text-nexus-300">{ctx.txnId}</span>
            </div>
            {import.meta.env.DEV && ctx.sandbox && (
              <div className="mt-2">
                <span className="badge badge-aurora bg-amber-500/15 text-amber-400">Dev sandbox · no real charge</span>
              </div>
            )}
          </div>
          <a href={ctx.redirectUrl} target="_blank" rel="noreferrer" aria-label="Open PayHere (opens in a new tab)" className="btn-holo w-full">
            <FaExternalLinkAlt /> Open PayHere
          </a>
          <p className="mt-3 text-center text-xs text-slate-400">
            Complete your payment in the PayHere window, then return here to finish your booking. Your e-ticket is issued
            once payment is confirmed.
          </p>
          <button type="button" className="btn-nexus mt-4 w-full" disabled={busy === 'confirm'} onClick={confirmPayment}>
            {busy === 'confirm' ? 'Confirming…' : "I've completed payment"}
          </button>
        </div>
      )}
    </Reveal>
  )
}
