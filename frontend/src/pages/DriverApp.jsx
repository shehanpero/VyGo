import { useState, useEffect } from 'react'
import { api, errorMessage } from '../api/client'
import { today } from '../utils/dates'
import {
  FaBus,
  FaRoute,
  FaSatelliteDish,
  FaLocationArrow,
  FaCheckCircle,
  FaClock,
  FaChair,
} from 'react-icons/fa'

const tripStatusColors = {
  SCHEDULED: 'bg-slate-500/15 text-slate-400',
  DEPARTED: 'bg-blue-500/15 text-blue-400',
  ARRIVED: 'bg-nexus-500/15 text-nexus-400',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

export default function DriverApp() {
  const [buses, setBuses] = useState([])
  const [busesLoading, setBusesLoading] = useState(true)
  const [date, setDate] = useState(today())
  const [trips, setTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedBusId, setSelectedBusId] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [speed, setSpeed] = useState('')
  const [locating, setLocating] = useState(false)
  const [pingBusy, setPingBusy] = useState(false)
  const [pingMsg, setPingMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setBusesLoading(true)
      setError('')
      try {
        const res = await api.get('/driver/buses')
        const list = Array.isArray(res.data) ? res.data : []
        if (!cancelled) {
          setBuses(list)
          setSelectedBusId((prev) => prev || (list[0] ? String(list[0].busId) : ''))
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Failed to load your buses'))
      } finally {
        if (!cancelled) setBusesLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setTripsLoading(true)
      try {
        const res = await api.get('/driver/trips', { params: { date } })
        if (!cancelled) setTrips(res.data || [])
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Failed to load trips'))
      } finally {
        if (!cancelled) setTripsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [date])

  const useMyLocation = () => {
    setPingMsg('')
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser — enter coordinates manually.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        if (pos.coords.speed != null && pos.coords.speed >= 0) {
          setSpeed((pos.coords.speed * 3.6).toFixed(1))
        }
        setLocating(false)
      },
      () => {
        setError('Could not get your location — enter coordinates manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const sendPing = async (e) => {
    e.preventDefault()
    if (!selectedBusId) return
    setPingBusy(true)
    setPingMsg('')
    setError('')
    try {
      await api.post('/bus-location', {
        busId: Number(selectedBusId),
        latitude: Number(lat),
        longitude: Number(lng),
        speedKph: speed === '' ? null : Number(speed),
      })
      setPingMsg('Location broadcast to your operator')
    } catch (err) {
      setError(errorMessage(err, 'Failed to broadcast location'))
    } finally {
      setPingBusy(false)
    }
  }

  const selectedBus = buses.find((b) => String(b.busId) === selectedBusId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold gradient-text">Driver Console</h1>
        <p className="text-sm text-slate-400">Your assigned buses, daily trips and live location sharing</p>
        <div className="scan-divider mt-4 w-40" />
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="glass-strong glow-border rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display font-bold text-white">
            <FaBus className="text-nexus-400" /> My buses
          </h2>
          {busesLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800/60" />
              ))}
            </div>
          ) : buses.length === 0 ? (
            <p className="text-sm text-slate-400">No buses assigned to you yet.</p>
          ) : (
            <div className="space-y-3">
              {buses.map((b) => (
                <button
                  key={b.busId}
                  type="button"
                  onClick={() => setSelectedBusId(String(b.busId))}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    String(b.busId) === selectedBusId
                      ? 'border-nexus-500/50 bg-nexus-500/10'
                      : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{b.registrationNo || `Bus #${b.busId}`}</span>
                    <span className="badge bg-violet-500/15 text-violet-400">{b.role}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {b.busType || '—'} · capacity {b.capacity ?? '—'}
                  </div>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={sendPing} className="mt-6 space-y-4 border-t border-white/5 pt-5">
            <h3 className="flex items-center gap-2 font-display font-bold text-white">
              <FaSatelliteDish className="text-nexus-400" /> Broadcast location
            </h3>
            <p className="text-xs text-slate-400">
              Sharing for <b className="text-slate-200">{selectedBus?.registrationNo || 'no bus selected'}</b>
            </p>
            <button type="button" className="btn-holo w-full" onClick={useMyLocation} disabled={locating || !selectedBusId}>
              <FaLocationArrow /> {locating ? 'Locating…' : 'Use my current location'}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="driver-lat">Latitude</label>
                <input id="driver-lat" className="input" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="6.927100" required />
              </div>
              <div>
                <label className="label" htmlFor="driver-lng">Longitude</label>
                <input id="driver-lng" className="input" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="79.861200" required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="driver-speed">Speed (km/h, optional)</label>
              <input id="driver-speed" type="number" min="0" className="input" value={speed} onChange={(e) => setSpeed(e.target.value)} placeholder="0" />
            </div>
            {pingMsg && <p role="status" className="text-sm text-emerald-400">{pingMsg}</p>}
            <button type="submit" className="btn-nexus w-full" disabled={pingBusy || !selectedBusId}>
              <FaSatelliteDish /> {pingBusy ? 'Broadcasting…' : 'Broadcast location'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="glass-strong glow-border relative rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 font-display font-bold text-white">
                <FaRoute className="text-nexus-400" /> Trips
              </h2>
              <div className="w-48">
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Trip date" />
              </div>
            </div>
            {tripsLoading ? (
              <div className="grid place-items-center p-12 text-sm text-slate-400">Loading trips…</div>
            ) : trips.length === 0 ? (
              <div className="grid place-items-center p-12 text-sm text-slate-400">No trips on {date}.</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Bus</th>
                      <th className="px-4 py-3">Departure</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Seats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => (
                      <tr key={trip.tripId} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                        <td className="px-4 py-3 font-semibold text-white">{trip.route}</td>
                        <td className="px-4 py-3 text-slate-300">{trip.busReg}</td>
                        <td className="px-4 py-3 text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <FaClock className="text-slate-500" /> {trip.departureTime}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${tripStatusColors[trip.status] || 'bg-slate-500/15 text-slate-400'}`}>
                            {trip.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <FaChair /> {trip.bookedSeats}/{trip.capacity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="glass-strong glow-border grid place-items-center gap-2 rounded-2xl p-8 text-center text-slate-400">
            <FaCheckCircle className="text-2xl text-emerald-400/70" />
            <p className="text-sm">
              Keep this page open while driving — broadcast your location so passengers and your bus owner can
              track the bus. Position updates every broadcast.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
