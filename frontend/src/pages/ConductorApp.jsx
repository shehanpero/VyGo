import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { today } from '../utils/dates'
import BusSeatMap from '../components/BusSeatMap'
import {
  FaBus,
  FaTicketAlt,
  FaQrcode,
  FaCamera,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaChair,
} from 'react-icons/fa'

const tripStatusColors = {
  SCHEDULED: 'bg-slate-500/15 text-slate-400',
  DEPARTED: 'bg-blue-500/15 text-blue-400',
  ARRIVED: 'bg-nexus-500/15 text-nexus-400',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

export default function ConductorApp() {
  const navigate = useNavigate()
  const [date, setDate] = useState(today())
  const [trips, setTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedTrip, setSelectedTrip] = useState(null)
  const [seatMap, setSeatMap] = useState(null)
  const [seatsLoading, setSeatsLoading] = useState(false)
  const [selectedSeats, setSelectedSeats] = useState([])

  const [passengerName, setPassengerName] = useState('')
  const [passengerMobile, setPassengerMobile] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [boardingPointId, setBoardingPointId] = useState('')
  const [dropoffPointId, setDropoffPointId] = useState('')
  const [bookingBusy, setBookingBusy] = useState(false)
  const [bookingMsg, setBookingMsg] = useState('')

  const [qrContent, setQrContent] = useState('')
  const [validateBusy, setValidateBusy] = useState(false)
  const [validation, setValidation] = useState(null)

  const [seatsSoldOnBoard, setSeatsSoldOnBoard] = useState('')
  const [cashCollected, setCashCollected] = useState('')
  const [notes, setNotes] = useState('')
  const [reconcileBusy, setReconcileBusy] = useState(false)
  const [reconcileMsg, setReconcileMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    const fetchTrips = async () => {
      setTripsLoading(true)
      setError('')
      try {
        const res = await api.get('/conductor/trips', { params: { date } })
        if (!cancelled) setTrips(res.data || [])
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Failed to load trips'))
      } finally {
        if (!cancelled) setTripsLoading(false)
      }
    }
    fetchTrips()
    return () => {
      cancelled = true
    }
  }, [date])

  const loadSeats = async (trip) => {
    setSeatsLoading(true)
    setError('')
    try {
      const res = await api.get(`/conductor/trips/${trip.tripId}/seats`)
      setSeatMap(res.data)
      setSelectedSeats([])
    } catch (err) {
      setError(errorMessage(err, 'Failed to load seat map'))
    } finally {
      setSeatsLoading(false)
    }
  }

  const selectTrip = (trip) => {
    setSelectedTrip(trip)
    setSeatMap(null)
    setSelectedSeats([])
    setValidation(null)
    setQrContent('')
    setReconcileMsg('')
    loadSeats(trip)
  }

  const toggleSeat = (seat) => {
    if (seat.status !== 'AVAILABLE') return
    setSelectedSeats((prev) =>
      prev.includes(seat.seatNumber)
        ? prev.filter((s) => s !== seat.seatNumber)
        : [...prev, seat.seatNumber]
    )
  }

  const submitManualBooking = async (e) => {
    e.preventDefault()
    if (!selectedTrip || selectedSeats.length === 0) return
    setBookingBusy(true)
    setBookingMsg('')
    setError('')
    try {
      await api.post('/conductor/manual-booking', {
        tripId: selectedTrip.tripId,
        seatNumbers: selectedSeats,
        passengerName,
        passengerMobile,
        paymentMethod: 'CASH',
        amountPaid: Number(amountPaid) || 0,
        boardingPointId: boardingPointId ? Number(boardingPointId) : null,
        dropoffPointId: dropoffPointId ? Number(dropoffPointId) : null,
      })
      setBookingMsg('Booking created successfully')
      setPassengerName('')
      setPassengerMobile('')
      setAmountPaid('')
      setSelectedSeats([])
      await loadSeats(selectedTrip)
    } catch (err) {
      setError(errorMessage(err, 'Manual booking failed'))
    } finally {
      setBookingBusy(false)
    }
  }

  const submitValidation = async (e) => {
    e.preventDefault()
    if (!selectedTrip || !qrContent.trim()) return
    setValidateBusy(true)
    setValidation(null)
    setError('')
    try {
      const res = await api.post('/tickets/validate', {
        qrContent: qrContent.trim(),
        tripId: selectedTrip.tripId,
      })
      setValidation(res.data)
    } catch (err) {
      setValidation({ valid: false, message: errorMessage(err, 'Validation failed'), ticket: null })
    } finally {
      setValidateBusy(false)
    }
  }

  const submitReconcile = async (e) => {
    e.preventDefault()
    if (!selectedTrip) return
    setReconcileBusy(true)
    setReconcileMsg('')
    setError('')
    try {
      await api.post(`/conductor/trips/${selectedTrip.tripId}/reconcile`, {
        seatsSoldOnBoard: Number(seatsSoldOnBoard) || 0,
        cashCollected: Number(cashCollected) || 0,
        notes,
      })
      setReconcileMsg('Reconciliation submitted')
      setSeatsSoldOnBoard('')
      setCashCollected('')
      setNotes('')
    } catch (err) {
      setError(errorMessage(err, 'Reconciliation failed'))
    } finally {
      setReconcileBusy(false)
    }
  }

  const farePerSeat = seatMap ? Number(seatMap.farePerSeat || 0) : 0

  // Time-to-value: prefill the "Amount paid" with the computed seat fare the
  // moment seats are picked, so a conductor never hand-types what the screen
  // already totals up. A deliberately entered (non-zero) figure is respected;
  // clearing the field back to zero re-derives it on the next change.
  useEffect(() => {
    const derived = selectedSeats.length * farePerSeat
    if (selectedSeats.length > 0 && farePerSeat > 0) {
      setAmountPaid((prev) => (Number(prev) !== 0 ? prev : String(derived)))
    } else {
      setAmountPaid('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeats, farePerSeat])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Conductor Console</h1>
          <p className="text-sm text-slate-400">Trips, seat maps, manual bookings and validation</p>
          <div className="scan-divider mt-4 w-40" />
        </div>
        <div className="w-full max-w-52">
          <label className="label" htmlFor="conductor-trip-date">Trip date</label>
          <input
            id="conductor-trip-date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setSelectedTrip(null)
              setSeatMap(null)
              setValidation(null)
            }}
            required
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="glass-strong glow-border overflow-hidden rounded-2xl">
        <div className="border-b border-white/5 px-5 py-4">
          <h2 className="font-display font-bold text-white">Trips on {date}</h2>
        </div>
        {tripsLoading ? (
          <div className="grid place-items-center p-12 text-sm text-slate-400">Loading trips…</div>
        ) : trips.length === 0 ? (
          <div className="grid place-items-center p-12 text-sm text-slate-400">No trips scheduled for this date.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Route</th>
                  <th className="px-5 py-3">Bus</th>
                  <th className="px-5 py-3">Departure</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Seats</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr
                    key={trip.tripId}
                    className={`border-b border-white/5 last:border-0 transition ${
                      selectedTrip?.tripId === trip.tripId ? 'bg-nexus-500/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="px-5 py-3 font-semibold text-white">{trip.route}</td>
                    <td className="px-5 py-3 text-slate-300">{trip.busReg}</td>
                    <td className="px-5 py-3 text-slate-300">{trip.departureTime}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${tripStatusColors[trip.status] || 'bg-slate-500/15 text-slate-400'}`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {trip.bookedSeats}/{trip.capacity}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="btn-holo !px-3 !py-1.5 text-xs" onClick={() => selectTrip(trip)}>
                        <FaChair /> {selectedTrip?.tripId === trip.tripId ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTrip && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="glass-strong glow-border rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display font-bold text-white">
                Seat map — {selectedTrip.route}
              </h2>
              <span className="badge bg-nexus-500/15 text-nexus-400">
                LKR {farePerSeat.toLocaleString()}/seat
              </span>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              {seatMap?.busType} · capacity {seatMap?.capacity} · fare LKR {farePerSeat.toLocaleString()}
            </p>

            {seatsLoading ? (
              <div className="grid place-items-center p-12 text-sm text-slate-400">Loading seats…</div>
            ) : !seatMap || seatMap.seats.length === 0 ? (
              <div className="grid place-items-center p-12 text-sm text-slate-400">No seat data.</div>
            ) : (
              <>
                <BusSeatMap
                  seats={seatMap.seats}
                  capacity={seatMap.capacity}
                  busType={seatMap.busType}
                  selected={selectedSeats}
                  onToggle={toggleSeat}
                  size="sm"
                />
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-red-500/40" /> BOOKED
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-slate-800" /> AVAILABLE
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-amber-500/40" /> LOCKED
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-nexus-500" /> Selected
                  </span>
                </div>
              </>
            )}

            <form onSubmit={submitManualBooking} className="mt-5 space-y-4 border-t border-white/5 pt-5">
              <h3 className="flex items-center gap-2 font-display font-bold text-white">
                <FaTicketAlt className="text-nexus-400" /> Manual booking
              </h3>
              {selectedSeats.length > 0 && (
                <p className="text-sm text-slate-300">
                  {selectedSeats.length} seat{selectedSeats.length === 1 ? '' : 's'} · LKR{' '}
                  {(selectedSeats.length * farePerSeat).toLocaleString()}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="conductor-passenger-name">Passenger name</label>
                  <input
                    id="conductor-passenger-name"
                    className="input"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="e.g. Nuwan Perera"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="conductor-passenger-mobile">Passenger mobile</label>
                  <input
                    id="conductor-passenger-mobile"
                    className="input"
                    value={passengerMobile}
                    onChange={(e) => setPassengerMobile(e.target.value)}
                    placeholder="07xxxxxxxx"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="conductor-payment-method">Payment method</label>
                  <select id="conductor-payment-method" className="input" value="CASH" readOnly disabled>
                    <option value="CASH">CASH</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="conductor-amount-paid">Amount paid (LKR)</label>
                  <input
                    id="conductor-amount-paid"
                    type="number"
                    min="0"
                    className="input"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="conductor-boarding-point-id">Boarding point ID</label>
                  <input
                    id="conductor-boarding-point-id"
                    type="number"
                    className="input"
                    value={boardingPointId}
                    onChange={(e) => setBoardingPointId(e.target.value)}
                    placeholder="(from seat map / route)"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="conductor-dropoff-point-id">Dropoff point ID</label>
                  <input
                    id="conductor-dropoff-point-id"
                    type="number"
                    className="input"
                    value={dropoffPointId}
                    onChange={(e) => setDropoffPointId(e.target.value)}
                    placeholder="(from seat map / route)"
                  />
                </div>
              </div>
              {bookingMsg && <p role="status" className="text-sm text-emerald-400">{bookingMsg}</p>}
              <button
                type="submit"
                className="btn-nexus w-full"
                disabled={bookingBusy || selectedSeats.length === 0}
              >
                {bookingBusy ? 'Booking…' : `Book ${selectedSeats.length || ''} seat${selectedSeats.length === 1 ? '' : 's'}`}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="glass-strong glow-border rounded-2xl p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-white">
                <FaQrcode className="text-nexus-400" /> Ticket validation
              </h3>
              <form onSubmit={submitValidation} className="space-y-3">
                <div className="flex items-center gap-2">
                  <textarea
                    className="input min-h-20 flex-1 resize-y"
                    value={qrContent}
                    onChange={(e) => setQrContent(e.target.value)}
                    placeholder="Paste QR content"
                    aria-label="Paste QR content"
                    required
                  />
                </div>
                <button
                  type="button"
                  className="btn-nexus w-full"
                  onClick={() => navigate('/scan')}
                >
                  <FaCamera /> Scan with camera
                </button>
                <button type="submit" className="btn-holo w-full" disabled={validateBusy || !qrContent.trim()}>
                  {validateBusy ? 'Validating…' : 'Validate ticket'}
                </button>
              </form>
              {validation && (
                <div
                  role="status"
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                    validation.valid
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-red-500/40 bg-red-500/10 text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {validation.valid ? <FaCheckCircle /> : <FaTimesCircle />}
                    {validation.message || (validation.valid ? 'Ticket is valid' : 'Ticket is not valid')}
                  </div>
                  {validation.valid && validation.ticket && (
                    <div className="mt-3 space-y-1 text-xs text-slate-300">
                      {validation.ticket.bookingRef && (
                        <div>Ref: {validation.ticket.bookingRef}</div>
                      )}
                      {validation.ticket.passengerName && (
                        <div>Passenger: {validation.ticket.passengerName}</div>
                      )}
                      {validation.ticket.seatNumbers && (
                        <div>Seats: {Array.isArray(validation.ticket.seatNumbers) ? validation.ticket.seatNumbers.join(', ') : validation.ticket.seatNumbers}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="glass-strong glow-border rounded-2xl p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-white">
                <FaMoneyBillWave className="text-nexus-400" /> End-of-trip reconciliation
              </h3>
              <form onSubmit={submitReconcile} className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="conductor-seats-sold">Seats sold on board</label>
                    <input
                      id="conductor-seats-sold"
                      type="number"
                      min="0"
                      className="input"
                      value={seatsSoldOnBoard}
                      onChange={(e) => setSeatsSoldOnBoard(e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="conductor-cash-collected">Cash collected (LKR)</label>
                    <input
                      id="conductor-cash-collected"
                      type="number"
                      min="0"
                      className="input"
                      value={cashCollected}
                      onChange={(e) => setCashCollected(e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="conductor-notes">Notes</label>
                  <textarea
                    id="conductor-notes"
                    className="input min-h-16 resize-y"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes for the operator…"
                  />
                </div>
                {reconcileMsg && <p role="status" className="text-sm text-nexus-400">{reconcileMsg}</p>}
                <button type="submit" className="btn-holo w-full" disabled={reconcileBusy}>
                  {reconcileBusy ? 'Submitting…' : 'Submit reconciliation'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {!selectedTrip && (
        <div className="glass-strong glow-border mt-6 grid place-items-center gap-3 rounded-2xl p-12 text-center text-slate-400">
          <FaBus className="text-3xl text-slate-600" />
          <p className="text-sm">Select a trip above to view its seat map, book manually and reconcile.</p>
        </div>
      )}
    </div>
  )
}
