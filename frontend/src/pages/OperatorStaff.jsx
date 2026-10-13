import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import { FaUserTie, FaMobileAlt, FaCheckCircle, FaClock, FaTimesCircle, FaIdBadge } from 'react-icons/fa'

const STATUS = {
  VERIFIED: { label: 'Verified', cls: 'bg-emerald-500/15 text-emerald-300', icon: FaCheckCircle },
  PENDING: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-300', icon: FaClock },
  REJECTED: { label: 'Rejected', cls: 'bg-red-500/15 text-red-300', icon: FaTimesCircle },
  UNVERIFIED: { label: 'Not verified', cls: 'bg-slate-700/40 text-slate-300', icon: FaIdBadge },
}

export default function OperatorStaff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get('/operator/staff')
      .then((res) => {
        if (!cancelled) setStaff(Array.isArray(res.data) ? res.data : [])
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load staff'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const drivers = staff.filter((s) => s.role === 'DRIVER')
  const conductors = staff.filter((s) => s.role === 'CONDUCTOR')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold gradient-text">Drivers &amp; Conductors</h1>
        <p className="text-sm text-slate-400">
          Everyone registered under your bus owner / association. Only your own staff appear here.
        </p>
        <div className="scan-divider mt-4 w-40" />
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Drivers', value: drivers.length },
          { label: 'Conductors', value: conductors.length },
          { label: 'Verified', value: staff.filter((s) => s.verificationStatus === 'VERIFIED').length },
        ].map((c) => (
          <div key={c.label} className="glass-strong rounded-2xl p-4">
            <div className="text-2xl font-bold text-white">{c.value}</div>
            <div className="text-xs uppercase tracking-wide text-slate-400">{c.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card grid place-items-center p-16 text-sm text-slate-400">Loading staff…</div>
      ) : staff.length === 0 ? (
        <div className="glass-strong rounded-2xl p-10 text-center text-sm text-slate-400">
          No drivers or conductors have joined your association yet.
        </div>
      ) : (
        <div className="glass-strong glow-border overflow-hidden rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Mobile</th>
                <th className="px-5 py-3">Identity</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const meta = STATUS[s.verificationStatus] || STATUS.UNVERIFIED
                const Icon = meta.icon
                return (
                  <tr key={s.userId} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {s.profileImageUrl ? (
                          <img src={s.profileImageUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-500/15 text-accent-400">
                            <FaUserTie />
                          </span>
                        )}
                        <div className="leading-tight">
                          <div className="font-semibold text-white">{s.fullName}</div>
                          <div className="text-xs text-slate-400">{s.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{s.role === 'DRIVER' ? 'Driver' : 'Conductor'}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-300">
                        <FaMobileAlt /> {s.mobile}
                      </span>
                      {s.mobileVerified && <FaCheckCircle className="ml-1.5 inline text-emerald-400" title="Mobile verified" />}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.cls}`}>
                        <Icon /> {meta.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
