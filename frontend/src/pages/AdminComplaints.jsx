import { useState, useEffect } from 'react'
import { api, errorMessage } from '../api/client'
import { FaChevronDown, FaChevronUp, FaSync, FaComment } from 'react-icons/fa'

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const statusColors = {
  OPEN: 'bg-amber-500/15 text-amber-400',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400',
  RESOLVED: 'bg-emerald-500/15 text-emerald-400',
  CLOSED: 'bg-slate-500/15 text-slate-400',
}

function ComplaintCard({ complaint, onUpdated, assignees }) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(complaint.status)
  const [resolution, setResolution] = useState('')
  const [assignedTo, setAssignedTo] = useState(complaint.assignedTo != null ? String(complaint.assignedTo) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await api.put(`/admin/complaints/${complaint.id}`, {
        status,
        resolution,
        assignedTo: assignedTo === '' ? null : Number(assignedTo),
      })
      await onUpdated()
    } catch (err) {
      setError(errorMessage(err, 'Update failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-strong glow-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-xs">Ref {complaint.bookingRef}</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs">{complaint.createdAt}</span>
          </div>
          <h3 className="mt-1 font-display font-bold text-white">{complaint.subject}</h3>
          <p className="mt-0.5 text-sm text-slate-400">From {complaint.passengerName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`badge ${statusColors[complaint.status] || 'bg-slate-500/15 text-slate-400'}`}>
            {complaint.status}
          </span>
          <button
            className="btn-holo !px-3 !py-1.5 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <FaChevronUp /> Close
              </>
            ) : (
              <>
                <FaChevronDown /> Review
              </>
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <div className="rounded-xl bg-slate-800/50 p-4 text-sm text-slate-300">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <FaComment /> Description
            </div>
            {complaint.description}
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`complaint-${complaint.id}-status`}>Status</label>
              <select id={`complaint-${complaint.id}-status`} className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor={`complaint-${complaint.id}-assigned`}>Assigned to</label>
              <select
                id={`complaint-${complaint.id}-assigned`}
                className="input"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignees.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.fullName || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor={`complaint-${complaint.id}-resolution`}>Resolution</label>
              <textarea
                id={`complaint-${complaint.id}-resolution`}
                className="input min-h-24 resize-y"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe how this complaint was resolved…"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button className="btn-nexus" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save update'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([])
  const [assignees, setAssignees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [res, usersRes] = await Promise.all([
        api.get('/admin/complaints'),
        api.get('/admin/users'),
      ])
      setComplaints(res.data || [])
      setAssignees(usersRes.data || [])
    } catch (err) {
      setError(errorMessage(err, 'Failed to load complaints'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Complaints</h1>
          <p className="text-sm text-slate-400">Track and resolve passenger complaints</p>
          <div className="scan-divider mt-4 w-40" />
        </div>
        <button className="btn-holo" onClick={load} disabled={loading}>
          <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-strong glow-border grid place-items-center rounded-2xl p-16 text-sm text-slate-400">Loading complaints…</div>
      ) : complaints.length === 0 ? (
        <div className="glass-strong glow-border rounded-2xl p-10 text-center text-sm text-slate-400">
          No complaints. All clear — nice.
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <ComplaintCard key={c.id} complaint={c} onUpdated={load} assignees={assignees} />
          ))}
        </div>
      )}
    </div>
  )
}
