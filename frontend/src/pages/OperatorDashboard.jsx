import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { dateOffset } from '../utils/dates'
import { FaBus, FaUsers, FaMoneyBillWave, FaCalendarAlt, FaChartBar, FaQrcode, FaArrowRight } from 'react-icons/fa'

const occupancyBadge = (pct) => {
  const n = Number(pct) || 0
  if (n < 60) return 'bg-emerald-500/15 text-emerald-400'
  if (n < 85) return 'bg-amber-500/15 text-amber-400'
  return 'bg-red-500/15 text-red-400'
}

const fmtLKR = (n) => 'LKR ' + Number(n || 0).toLocaleString()

export default function OperatorDashboard() {
  const [buses, setBuses] = useState([])
  const [occupancy, setOccupancy] = useState([])
  const [revenue, setRevenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const today = dateOffset(0)
        const [busesRes, occRes, revRes] = await Promise.all([
          api.get('/operator/buses'),
          api.get('/operator/reports/occupancy', { params: { from: today, to: today } }),
          api.get('/operator/reports/revenue', { params: { from: dateOffset(-7), to: today } }),
        ])
        setBuses(Array.isArray(busesRes.data) ? busesRes.data : [])
        setOccupancy(Array.isArray(occRes.data) ? occRes.data : [])
        setRevenue(revRes.data || null)
      } catch (err) {
        setError(errorMessage(err, 'Failed to load dashboard'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const bookedSum = occupancy.reduce((s, t) => s + (Number(t.booked) || 0), 0)
  const capacitySum = occupancy.reduce((s, t) => s + (Number(t.capacity) || 0), 0)
  const avgOccupancy = capacitySum ? Math.round((bookedSum / capacitySum) * 100) : 0

  const stats = [
    { label: 'Buses in fleet', value: String(buses.length), icon: FaBus, accent: 'bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400' },
    { label: "Today's avg occupancy", value: `${avgOccupancy}%`, icon: FaUsers, accent: 'bg-sky-500/15 text-sky-400' },
    { label: 'Revenue · last 7 days', value: revenue ? fmtLKR(revenue.totalRevenue) : 'LKR 0', icon: FaMoneyBillWave, accent: 'bg-emerald-500/15 text-emerald-400' },
  ]

  const quickLinks = [
    { to: '/scan', title: 'Scan Ticket QR', desc: 'Validate passenger e-tickets on board', icon: FaQrcode },
    { to: '/operator/buses', title: 'Manage Fleet', desc: 'Add, edit and remove buses', icon: FaBus },
    { to: '/operator/schedules', title: 'Schedules', desc: 'Create and manage trip schedules', icon: FaCalendarAlt },
    { to: '/operator/reports', title: 'Reports', desc: 'Revenue and occupancy analytics', icon: FaChartBar },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold gradient-text">Bus Owner Dashboard</h1>
        <p className="text-sm text-slate-400">Fleet, occupancy and revenue at a glance.</p>
        <div className="scan-divider mt-4 w-40" />
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="glass-strong glow-border rounded-2xl p-5">
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${s.accent}`}>
              <s.icon className="text-xl" />
            </div>
            <div className="mt-4 text-2xl font-extrabold text-white">{loading ? '…' : s.value}</div>
            <div className="text-sm text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-white">Quick links</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickLinks.map((l) => (
            <Link key={l.to} to={l.to} className="glass-strong glow-border group rounded-2xl p-5 transition hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
                  <l.icon />
                </span>
                <FaArrowRight className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-nexus-400" />
              </div>
              <div className="mt-4 font-semibold text-white">{l.title}</div>
              <div className="mt-1 text-sm text-slate-400">{l.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-white">Today's trips</h2>
        {loading ? (
          <div className="glass-strong glow-border rounded-2xl p-10 text-center text-slate-400">Loading trips…</div>
        ) : occupancy.length === 0 ? (
          <div className="glass-strong glow-border rounded-2xl p-10 text-center text-slate-400">No trips scheduled today.</div>
        ) : (
          <div className="glass-strong glow-border overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Route</th>
                    <th className="px-5 py-3">Departure</th>
                    <th className="px-5 py-3">Booked / Capacity</th>
                    <th className="px-5 py-3">Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {occupancy.map((t) => (
                    <tr key={t.tripId || `${t.route}-${t.departureTime}`} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-5 py-3 font-medium text-white">{t.route || '—'}</td>
                      <td className="px-5 py-3 text-slate-300">{t.departureTime || '—'}</td>
                      <td className="px-5 py-3 text-slate-300">{Number(t.booked) || 0} / {Number(t.capacity) || 0}</td>
                      <td className="px-5 py-3">
                        <span className={`badge ${occupancyBadge(t.occupancyPct)}`}>{Number(t.occupancyPct) || 0}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
