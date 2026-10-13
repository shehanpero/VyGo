import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import { FaPlus, FaMinus, FaRoute, FaStopCircle } from 'react-icons/fa'
import { dateOffset, toLocalYMD } from '../utils/dates'

const addYears = (years) => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + years)
  return toLocalYMD(d)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const emptySchedule = {
  routeId: '',
  busId: '',
  departureTime: '06:00',
  arrivalTime: '09:30',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  effectiveFrom: dateOffset(0),
  effectiveTo: addYears(1),
}

const emptyRoute = {
  fromCity: '',
  toCity: '',
  distanceKm: '',
  durationMin: '',
  boardingPoints: [
    { name: '', city: '', timeOffsetMin: '' },
    { name: '', city: '', timeOffsetMin: '' },
  ],
}

const daysText = (days) => {
  if (!Array.isArray(days) || !days.length) return '—'
  return days.map((d) => DAY_LABELS[Number(d) - 1] || d).join(', ')
}

export default function OperatorSchedules() {
  const [schedules, setSchedules] = useState([])
  const [routes, setRoutes] = useState([])
  const [buses, setBuses] = useState([])
  const [schedForm, setSchedForm] = useState(emptySchedule)
  const [routeForm, setRouteForm] = useState(emptyRoute)
  const [routeOpen, setRouteOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [savingRoute, setSavingRoute] = useState(false)
  const [deactivating, setDeactivating] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [scheduleError, setScheduleError] = useState('')
  const [routeError, setRouteError] = useState('')
  const [message, setMessage] = useState('')

  const loadAll = async () => {
    try {
      const [schedRes, routesRes, busesRes] = await Promise.all([
        api.get('/operator/schedules'),
        api.get('/routes'),
        api.get('/operator/buses'),
      ])
      setSchedules(Array.isArray(schedRes.data) ? schedRes.data : [])
      setRoutes(Array.isArray(routesRes.data) ? routesRes.data : [])
      setBuses(Array.isArray(busesRes.data) ? busesRes.data : [])
    } catch (err) {
      setLoadError(errorMessage(err, 'Failed to load schedules'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const setSched = (k) => (e) => setSchedForm({ ...schedForm, [k]: e.target.value })

  const toggleDay = (day) => {
    setSchedForm({
      ...schedForm,
      daysOfWeek: schedForm.daysOfWeek.includes(day)
        ? schedForm.daysOfWeek.filter((d) => d !== day)
        : [...schedForm.daysOfWeek, day],
    })
  }

  const submitSchedule = async (e) => {
    e.preventDefault()
    setSavingSchedule(true)
    setScheduleError('')
    setMessage('')
    const payload = {
      routeId: schedForm.routeId,
      busId: schedForm.busId,
      departureTime: schedForm.departureTime,
      arrivalTime: schedForm.arrivalTime,
      daysOfWeek: schedForm.daysOfWeek,
      effectiveFrom: schedForm.effectiveFrom,
      effectiveTo: schedForm.effectiveTo,
    }
    try {
      await api.post('/operator/schedules', payload)
      setSchedForm(emptySchedule)
      await loadAll()
      setMessage('Schedule created successfully.')
    } catch (err) {
      setScheduleError(errorMessage(err, 'Failed to add schedule'))
    } finally {
      setSavingSchedule(false)
    }
  }

  const deactivate = async (s) => {
    const label = s.route || s.id
    if (!window.confirm(`Deactivate schedule ${label}?`)) return
    setDeactivating(s.id)
    setMessage('')
    try {
      const res = await api.delete(`/operator/schedules/${s.id}`)
      setMessage(res.data?.message || 'Schedule deactivated.')
      await loadAll()
    } catch (err) {
      setLoadError(errorMessage(err, 'Failed to deactivate schedule'))
    } finally {
      setDeactivating(null)
    }
  }

  const setRoute = (k) => (e) => setRouteForm({ ...routeForm, [k]: e.target.value })

  const setBP = (idx, k, v) => {
    setRouteForm({
      ...routeForm,
      boardingPoints: routeForm.boardingPoints.map((bp, i) => (i === idx ? { ...bp, [k]: v } : bp)),
    })
  }

  const submitRoute = async (e) => {
    e.preventDefault()
    setSavingRoute(true)
    setRouteError('')
    setMessage('')
    const payload = {
      routeType: 'NORMAL',
      routeClass: 'INTERCITY',
      fromCity: routeForm.fromCity,
      toCity: routeForm.toCity,
      distanceKm: Number(routeForm.distanceKm) || 0,
      durationMin: Number(routeForm.durationMin) || 0,
      boardingPoints: routeForm.boardingPoints
        .filter((bp) => bp.name || bp.city)
        .map((bp, idx) => ({
          name: bp.name,
          city: bp.city,
          sequence: idx + 1,
          timeOffsetMin: Number(bp.timeOffsetMin) || 0,
        })),
    }
    try {
      await api.post('/operator/routes', payload)
      setRouteForm(emptyRoute)
      setRouteOpen(false)
      await loadAll()
      setMessage('Route created successfully.')
    } catch (err) {
      setRouteError(errorMessage(err, 'Failed to create route'))
    } finally {
      setSavingRoute(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold gradient-text">Schedules</h1>
        <p className="text-sm text-slate-400">Create and manage recurring trip schedules.</p>
        <div className="scan-divider mt-4 w-40" />
      </div>

      {message && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{message}</div>}
      {loadError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{loadError}</div>}

      <form onSubmit={submitSchedule} className="glass-strong glow-border space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-lg font-bold text-white">Add schedule</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="opsched-route">Route</label>
            <select id="opsched-route" className="input" value={schedForm.routeId} onChange={setSched('routeId')} required>
              <option value="">Select route</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.fromCity || '—'} → {r.toCity || '—'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="opsched-bus">Bus</label>
            <select id="opsched-bus" className="input" value={schedForm.busId} onChange={setSched('busId')} required>
              <option value="">Select bus</option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>{b.registrationNo || '—'}{b.busType ? ` · ${b.busType}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="opsched-departure">Departure time</label>
            <input id="opsched-departure" type="time" className="input" value={schedForm.departureTime} onChange={setSched('departureTime')} required />
          </div>
          <div>
            <label className="label" htmlFor="opsched-arrival">Arrival time</label>
            <input id="opsched-arrival" type="time" className="input" value={schedForm.arrivalTime} onChange={setSched('arrivalTime')} required />
          </div>
          <div>
            <label className="label" htmlFor="opsched-effective-from">Effective from</label>
            <input id="opsched-effective-from" type="date" className="input" value={schedForm.effectiveFrom} onChange={setSched('effectiveFrom')} required />
          </div>
          <div>
            <label className="label" htmlFor="opsched-effective-to">Effective to</label>
            <input id="opsched-effective-to" type="date" className="input" value={schedForm.effectiveTo} onChange={setSched('effectiveTo')} required />
          </div>
        </div>
        <div>
          <label className="label" id="opsched-days-label">Days of week</label>
          <div role="group" aria-labelledby="opsched-days-label" className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, i) => {
              const day = i + 1
              const active = schedForm.daysOfWeek.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${active ? 'border-nexus-500/50 bg-nexus-500/15 text-nexus-400' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        {scheduleError && <p role="alert" className="text-sm text-red-400">{scheduleError}</p>}
        <button type="submit" className="btn-nexus" disabled={savingSchedule || !schedForm.routeId || !schedForm.busId}>
          <FaPlus /> {savingSchedule ? 'Adding…' : 'Add schedule'}
        </button>
      </form>

      <div className="glass-strong glow-border overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => setRouteOpen(!routeOpen)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <span className="flex items-center gap-2 font-semibold text-white">
            <FaRoute className="text-nexus-400" /> New route
          </span>
          {routeOpen ? <FaMinus className="text-slate-400" /> : <FaPlus className="text-slate-400" />}
        </button>
        {routeOpen && (
          <form onSubmit={submitRoute} className="space-y-4 border-t border-slate-800 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="opsched-route-from-city">From city</label>
                <input id="opsched-route-from-city" className="input" value={routeForm.fromCity} onChange={setRoute('fromCity')} placeholder="Colombo" required />
              </div>
              <div>
                <label className="label" htmlFor="opsched-route-to-city">To city</label>
                <input id="opsched-route-to-city" className="input" value={routeForm.toCity} onChange={setRoute('toCity')} placeholder="Kandy" required />
              </div>
              <div>
                <label className="label" htmlFor="opsched-route-distance">Distance (km)</label>
                <input id="opsched-route-distance" type="number" min="1" className="input" value={routeForm.distanceKm} onChange={setRoute('distanceKm')} placeholder="115" required />
              </div>
              <div>
                <label className="label" htmlFor="opsched-route-duration">Duration (min)</label>
                <input id="opsched-route-duration" type="number" min="1" className="input" value={routeForm.durationMin} onChange={setRoute('durationMin')} placeholder="180" required />
              </div>
            </div>
            <div>
              <label className="label" id="opsched-bp-label">Boarding points</label>
              <div role="group" aria-labelledby="opsched-bp-label" className="space-y-3">
                {routeForm.boardingPoints.map((bp, idx) => (
                  <div key={idx} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-3">
                    <input className="input" aria-label={`Boarding point ${idx + 1} name`} value={bp.name} onChange={(e) => setBP(idx, 'name', e.target.value)} placeholder={`Point name (${idx + 1})`} />
                    <input className="input" aria-label={`Boarding point ${idx + 1} city`} value={bp.city} onChange={(e) => setBP(idx, 'city', e.target.value)} placeholder="City" />
                    <input type="number" className="input" aria-label={`Boarding point ${idx + 1} time offset`} value={bp.timeOffsetMin} onChange={(e) => setBP(idx, 'timeOffsetMin', e.target.value)} placeholder="Time offset (min)" />
                  </div>
                ))}
              </div>
            </div>
            {routeError && <p role="alert" className="text-sm text-red-400">{routeError}</p>}
            <button type="submit" className="btn-nexus" disabled={savingRoute}>
              <FaRoute /> {savingRoute ? 'Creating…' : 'Create route'}
            </button>
          </form>
        )}
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-white">Schedules</h2>
        <div className="glass-strong glow-border overflow-hidden rounded-2xl">
          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading schedules…</div>
          ) : schedules.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No schedules yet. Add one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Route</th>
                    <th className="px-5 py-3">Bus</th>
                    <th className="px-5 py-3">Departure</th>
                    <th className="px-5 py-3">Arrival</th>
                    <th className="px-5 py-3">Days</th>
                    <th className="px-5 py-3">Effective</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-5 py-3 font-medium text-white">{s.route || '—'}</td>
                      <td className="px-5 py-3 text-slate-300">
                        {s.busReg || '—'}{s.busType ? ` · ${s.busType}` : ''}
                      </td>
                      <td className="px-5 py-3 text-slate-300">{s.departureTime || '—'}</td>
                      <td className="px-5 py-3 text-slate-300">{s.arrivalTime || '—'}</td>
                      <td className="px-5 py-3 text-slate-300">{daysText(s.daysOfWeek)}</td>
                      <td className="px-5 py-3 text-slate-300">{s.effectiveFrom || '—'} → {s.effectiveTo || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`badge ${s.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-300'}`}>{s.status || '—'}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          {s.status === 'ACTIVE' ? (
                            <button type="button" onClick={() => deactivate(s)} disabled={deactivating === s.id} className="btn-danger !px-3 !py-1.5 text-xs">
                              <FaStopCircle /> {deactivating === s.id ? 'Deactivating…' : 'Deactivate'}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
