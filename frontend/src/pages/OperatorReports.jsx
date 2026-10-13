import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { FaMoneyBillWave, FaRoute, FaSearch, FaReceipt, FaChartLine } from 'react-icons/fa'
import { dateOffset } from '../utils/dates'

const occupancyBadge = (pct) => {
  const n = Number(pct) || 0
  if (n < 60) return 'bg-emerald-500/15 text-emerald-400'
  if (n < 85) return 'bg-amber-500/15 text-amber-400'
  return 'bg-red-500/15 text-red-400'
}

const fmtLKR = (n) => 'LKR ' + Number(n || 0).toLocaleString()

export default function OperatorReports() {
  const [from, setFrom] = useState(dateOffset(-7))
  const [to, setTo] = useState(dateOffset(0))
  const [applied, setApplied] = useState({ from: dateOffset(-7), to: dateOffset(0) })
  const [revenue, setRevenue] = useState(null)
  const [trips, setTrips] = useState(null)
  const [occupancy, setOccupancy] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const params = { from: applied.from, to: applied.to }
        const [revRes, tripsRes, occRes] = await Promise.all([
          api.get('/operator/reports/revenue', { params }),
          api.get('/operator/reports/trips', { params }),
          api.get('/operator/reports/occupancy', { params }),
        ])
        setRevenue(revRes.data || null)
        setTrips(tripsRes.data || null)
        setOccupancy(Array.isArray(occRes.data) ? occRes.data : [])
      } catch (err) {
        setError(errorMessage(err, 'Failed to load reports'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [applied])

  const apply = (e) => {
    e.preventDefault()
    setApplied({ from, to })
  }

  const daily = Array.isArray(revenue?.daily) ? revenue.daily : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold gradient-text">Reports</h1>
        <p className="text-sm text-slate-400">Revenue, trips and occupancy analytics.</p>
        <div className="scan-divider mt-4 w-40" />
      </div>

      <form onSubmit={apply} className="glass-strong glow-border flex flex-wrap items-end gap-4 rounded-2xl p-6">
        <div>
          <label className="label" htmlFor="opreports-from">From</label>
          <input id="opreports-from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="opreports-to">To</label>
          <input id="opreports-to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} required />
        </div>
        <button type="submit" className="btn-nexus" disabled={loading}>
          <FaSearch /> {loading ? 'Loading…' : 'Apply'}
        </button>
      </form>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-strong glow-border rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
            <FaMoneyBillWave className="text-nexus-400" /> Revenue
          </div>
          {loading ? (
            <div className="mt-2 text-3xl font-extrabold text-white">…</div>
          ) : (
            <>
              <div className="mt-2 text-3xl font-extrabold text-white">{fmtLKR(revenue?.totalRevenue)}</div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
                <span><b className="text-slate-200">{revenue?.totalBookings ?? 0}</b> bookings</span>
                <span>Avg fare <b className="text-slate-200">{fmtLKR(revenue?.avgFare)}</b></span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl bg-slate-800/40 p-4">
                  <FaReceipt className="text-rose-400" />
                  <div>
                    <div className="text-lg font-bold text-rose-400">{fmtLKR(revenue?.totalExpenses)}</div>
                    <div className="text-xs text-slate-400">Expenses</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-800/40 p-4">
                  <FaChartLine className={Number(revenue?.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                  <div>
                    <div className={`text-lg font-bold ${Number(revenue?.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtLKR(revenue?.profit)}</div>
                    <div className="text-xs text-slate-400">Profit</div>
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="mt-6">
            {loading ? (
              <div className="grid h-64 place-items-center text-slate-400">Loading chart…</div>
            ) : daily.length === 0 ? (
              <div className="grid h-64 place-items-center text-slate-400">No revenue data for this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={64} />
                  <Tooltip
                    formatter={(value, name) => [fmtLKR(value), name]}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(34,211,238,0.35)', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#22d3ee" strokeWidth={2} fill="url(#revenueFill)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#fb7185" strokeWidth={2} fill="url(#expenseFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-strong glow-border rounded-2xl p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
            <FaRoute className="text-nexus-400" /> Trips
          </div>
          {loading ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-800/60" />
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-slate-800/40 p-4">
                <div className="text-2xl font-extrabold text-white">{trips?.totalTrips ?? 0}</div>
                <div className="text-xs text-slate-400">Total trips</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-800/40 p-4">
                  <div className="text-xl font-bold text-emerald-400">{trips?.completedTrips ?? 0}</div>
                  <div className="text-xs text-slate-400">Completed</div>
                </div>
                <div className="rounded-xl bg-slate-800/40 p-4">
                  <div className="text-xl font-bold text-red-400">{trips?.cancelledTrips ?? 0}</div>
                  <div className="text-xs text-slate-400">Cancelled</div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-800/40 p-4">
                <div className="text-2xl font-extrabold text-white">{Number(trips?.averageOccupancyPct) || 0}%</div>
                <div className="text-xs text-slate-400">Avg occupancy</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-white">Trip occupancy</h2>
        {loading ? (
          <div className="glass-strong glow-border rounded-2xl p-10 text-center text-slate-400">Loading occupancy…</div>
        ) : occupancy.length === 0 ? (
          <div className="glass-strong glow-border rounded-2xl p-10 text-center text-slate-400">No trips in this date range.</div>
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
                    <th className="px-5 py-3">Revenue</th>
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
                      <td className="px-5 py-3 text-slate-300">{fmtLKR(t.revenue)}</td>
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
