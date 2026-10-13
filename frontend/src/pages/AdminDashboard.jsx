import { useState, useEffect } from 'react'
import { api, errorMessage } from '../api/client'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  FaTicketAlt,
  FaMoneyBillWave,
  FaBus,
  FaUsers,
  FaChartLine,
  FaExclamationTriangle,
  FaSync,
  FaHandHoldingUsd,
} from 'react-icons/fa'

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(34,211,238,0.35)',
  borderRadius: '12px',
  color: '#f1f5f9',
  fontSize: '12px',
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null)
  const [occupancy, setOccupancy] = useState([])
  const [revenue, setRevenue] = useState([])
  const [forecast, setForecast] = useState([])
  const [commission, setCommission] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [o, occ, rev, fc, com] = await Promise.all([
        api.get('/admin/analytics/overview'),
        api.get('/admin/analytics/occupancy-trend', { params: { days: 30 } }),
        api.get('/admin/analytics/revenue-trend', { params: { days: 30 } }),
        api.get('/admin/analytics/demand-forecast', {
          params: { from: 'Colombo', to: 'Kandy', days: 14 },
        }),
        api.get('/admin/analytics/commission-trend', { params: { days: 30 } }),
      ])
      setOverview(o.data)
      setOccupancy(occ.data || [])
      setRevenue(rev.data || [])
      setForecast(fc.data || [])
      setCommission(com.data || [])
    } catch (err) {
      setError(errorMessage(err, 'Failed to load analytics'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const stats = [
    {
      label: 'Total Bookings',
      value: overview ? Number(overview.totalBookings ?? 0).toLocaleString() : '—',
      icon: FaTicketAlt,
      color: 'text-nexus-400',
    },
    {
      label: 'Total Revenue',
      value: overview ? `LKR ${Number(overview.totalRevenue ?? 0).toLocaleString()}` : '—',
      icon: FaMoneyBillWave,
      color: 'text-nexus-300',
    },
    {
      label: 'Platform Commission',
      value: overview ? `LKR ${Number(overview.platformCommission ?? 0).toLocaleString()}` : '—',
      icon: FaHandHoldingUsd,
      color: 'text-emerald-400',
    },
    {
      label: 'Active Bus Owners',
      value: overview ? Number(overview.activeOperators ?? 0).toLocaleString() : '—',
      icon: FaUsers,
      color: 'text-violet-400',
    },
    {
      label: 'Total Buses',
      value: overview ? Number(overview.totalBuses ?? 0).toLocaleString() : '—',
      icon: FaBus,
      color: 'text-purple-400',
    },
    {
      label: 'Occupancy Rate',
      value: overview ? `${Number(overview.occupancyRate ?? 0)}%` : '—',
      icon: FaChartLine,
      color: 'text-amber-400',
    },
    {
      label: 'Pending Complaints',
      value: overview ? Number(overview.pendingComplaints ?? 0).toLocaleString() : '—',
      icon: FaExclamationTriangle,
      color: 'text-red-400',
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Admin Dashboard</h1>
          <p className="text-sm text-slate-400">Live analytics and demand insights across VyGo</p>
          <div className="scan-divider mt-4 w-40" />
        </div>
        <button className="btn-holo" onClick={load} disabled={loading}>
          <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-strong glow-border grid place-items-center rounded-2xl p-16 text-sm text-slate-400">Loading analytics…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-strong glow-border rounded-2xl p-5">
                <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl bg-slate-800 ${stat.color}`}>
                  <stat.icon />
                </div>
                <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="glass-strong glow-border rounded-2xl p-5">
              <h2 className="mb-4 font-display text-lg font-bold text-white">Occupancy Trend (30 days)</h2>
              {occupancy.length === 0 ? (
                <div className="grid h-72 place-items-center text-sm text-slate-400">No occupancy data</div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={occupancy} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Occupancy']} />
                      <Area
                        type="monotone"
                        dataKey="occupancyPct"
                        name="Occupancy"
                        stroke="#22d3ee"
                        fill="url(#occGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="glass-strong glow-border rounded-2xl p-5">
              <h2 className="mb-4 font-display text-lg font-bold text-white">Revenue & Bookings (30 days)</h2>
              {revenue.length === 0 ? (
                <div className="grid h-72 place-items-center text-sm text-slate-400">No revenue data</div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="revenue" name="Revenue (LKR)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="bookings" name="Bookings" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="glass-strong glow-border mt-6 rounded-2xl p-5">
            <h2 className="mb-1 font-display text-lg font-bold text-white">Platform Commission (30 days)</h2>
            <p className="mb-4 text-sm text-slate-400">5% VyGo commission earned per confirmed booking</p>
            {commission.length === 0 ? (
              <div className="grid h-72 place-items-center text-sm text-slate-400">No commission data</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={commission} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="commissionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`LKR ${Number(v).toLocaleString()}`, 'Commission']} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Commission"
                      stroke="#34d399"
                      fill="url(#commissionGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="glass-strong glow-border mt-6 overflow-hidden rounded-2xl">
            <div className="border-b border-white/5 p-5">
              <h2 className="font-display text-lg font-bold text-white">Demand Forecast — Colombo → Kandy (14 days)</h2>
              <p className="text-sm text-slate-400">Forecasted bookings and recommended fare per day</p>
            </div>
            {forecast.length === 0 ? (
              <div className="grid h-40 place-items-center text-sm text-slate-400">No forecast data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Forecasted Bookings</th>
                      <th className="px-5 py-3">Recommended Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.map((row) => (
                      <tr key={row.date} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                        <td className="px-5 py-3 text-slate-200">{row.date}</td>
                        <td className="px-5 py-3 text-slate-300">{Number(row.bookings ?? 0).toLocaleString()}</td>
                        <td className="px-5 py-3 font-semibold text-nexus-400">
                          LKR {Number(row.recommendedFare ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
