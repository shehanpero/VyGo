import { useState, useEffect } from 'react'
import { api, errorMessage } from '../api/client'
import { FaCheck, FaTimes, FaBan, FaSync, FaBuilding, FaUsers } from 'react-icons/fa'

const TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']

const statusColors = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  APPROVED: 'bg-emerald-500/15 text-emerald-400',
  REJECTED: 'bg-red-500/15 text-red-400',
  SUSPENDED: 'bg-slate-500/15 text-slate-400',
}

const GROUPS = [
  { key: 'OWNER', label: 'Bus Owners', hint: 'Private bus owners & companies', icon: FaBuilding },
  { key: 'ASSOCIATION', label: 'Associations', hint: 'State & collective operators', icon: FaUsers },
]

export default function AdminOperators() {
  const [status, setStatus] = useState('ALL')
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // { type: 'reject' | 'suspend', operator }
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetchOperators = async () => {
      setLoading(true)
      setError('')
      try {
        const params = status === 'ALL' ? {} : { status }
        const res = await api.get('/admin/operators', { params })
        if (!cancelled) setOperators(res.data || [])
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Failed to load operators'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchOperators()
    return () => {
      cancelled = true
    }
  }, [status, reloadKey])

  const approve = async (operator) => {
    setError('')
    setBusy(true)
    try {
      await api.post(`/admin/operators/${operator.id}/approve`)
      setStatus('ALL')
      setLoading(true)
      const res = await api.get('/admin/operators')
      setOperators(res.data || [])
      setLoading(false)
    } catch (err) {
      setError(errorMessage(err, 'Approve failed'))
      setLoading(false)
    } finally {
      setBusy(false)
    }
  }

  const confirmAction = async () => {
    if (!modal) return
    setError('')
    setBusy(true)
    try {
      const { type, operator } = modal
      await api.post(`/admin/operators/${operator.id}/${type}`, { reason: reason.trim() })
      setModal(null)
      setReason('')
      const res = await api.get('/admin/operators', { params: status === 'ALL' ? {} : { status } })
      setOperators(res.data || [])
    } catch (err) {
      setError(errorMessage(err, 'Action failed'))
    } finally {
      setBusy(false)
    }
  }

  const operatorsOf = (key) => operators.filter((o) => (o.type || 'OWNER') === key)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Bus Owners &amp; Associations</h1>
          <p className="text-sm text-slate-400">Review, approve and manage bus owner and association registrations</p>
          <div className="scan-divider mt-4 w-40" />
        </div>
        <button className="btn-holo" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
          <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            aria-pressed={status === tab}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              status === tab
                ? 'bg-nexus-500 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-strong glow-border grid place-items-center rounded-2xl p-16 text-sm text-slate-400">Loading operators…</div>
      ) : operators.length === 0 ? (
        <div className="glass-strong glow-border rounded-2xl p-10 text-center text-sm text-slate-400">No bus owners or associations with status “{status}”.</div>
      ) : (
        <div className="space-y-8">
          {GROUPS.map((group) => {
            const rows = operatorsOf(group.key)
            if (rows.length === 0) return null
            const Icon = group.icon
            return (
              <section key={group.key} aria-label={group.label}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-nexus-400">
                    <Icon />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-white">{group.label}</h2>
                    <p className="text-xs text-slate-400">
                      {group.hint} · {rows.length}
                    </p>
                  </div>
                </div>
                <div className="glass-strong glow-border overflow-hidden rounded-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                          <th className="px-5 py-3">Name</th>
                          <th className="px-5 py-3">Type</th>
                          <th className="px-5 py-3">Registration No</th>
                          <th className="px-5 py-3">License No</th>
                          <th className="px-5 py-3">Owner</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Registered</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((op) => (
                          <tr key={op.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-nexus-400">
                                  <Icon />
                                </div>
                                <div>
                                  <div className="font-semibold text-white">{op.name}</div>
                                  <div className="text-xs text-slate-400">#{op.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`badge ${group.key === 'ASSOCIATION' ? 'bg-violet-500/15 text-violet-300' : 'bg-sky-500/15 text-sky-300'}`}>
                                {group.key === 'ASSOCIATION' ? 'Association' : 'Bus Owner'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-300">{op.registrationNo}</td>
                            <td className="px-5 py-3 text-slate-300">{op.licenseNo}</td>
                            <td className="px-5 py-3 text-slate-300">{op.ownerName}</td>
                            <td className="px-5 py-3">
                              <span className={`badge ${statusColors[op.status] || 'bg-slate-500/15 text-slate-400'}`}>
                                {op.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-400">{op.createdAt}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2">
                                {op.status === 'PENDING' && (
                                  <button
                                    className="btn-nexus !px-3 !py-1.5 text-xs"
                                    onClick={() => approve(op)}
                                    disabled={busy}
                                  >
                                    <FaCheck /> Approve
                                  </button>
                                )}
                                {op.status !== 'REJECTED' && (
                                  <button
                                    className="btn-danger !px-3 !py-1.5 text-xs"
                                    onClick={() => setModal({ type: 'reject', operator: op })}
                                    disabled={busy}
                                  >
                                    <FaTimes /> Reject
                                  </button>
                                )}
                                {op.status === 'APPROVED' && (
                                  <button
                                    className="btn-holo !px-3 !py-1.5 text-xs"
                                    onClick={() => setModal({ type: 'suspend', operator: op })}
                                    disabled={busy}
                                  >
                                    <FaBan /> Suspend
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" onClick={() => setModal(null)}>
          <div className="glass-strong glow-border w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-white">
              {modal.type === 'reject' ? 'Reject' : 'Suspend'} “{modal.operator.name}”
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Provide a reason for the {modal.type} action. The bus owner will be notified.
            </p>
            <div className="mt-4">
              <label className="label" htmlFor="adminops-reason">Reason</label>
              <textarea
                id="adminops-reason"
                className="input min-h-24 resize-y"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Invalid registration documents"
                required
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-holo" onClick={() => setModal(null)} disabled={busy}>
                Cancel
              </button>
              <button
                className={modal.type === 'reject' ? 'btn-danger' : 'btn-holo'}
                onClick={confirmAction}
                disabled={busy || !reason.trim()}
              >
                {busy ? 'Saving…' : modal.type === 'reject' ? 'Reject operator' : 'Suspend operator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
