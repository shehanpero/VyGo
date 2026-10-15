import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import { FaCheck, FaTimes, FaBus, FaBuilding, FaUserTie } from 'react-icons/fa'

const FILTERS = ['PENDING', 'VERIFIED', 'REJECTED', 'ALL']

const statusClasses = {
  VERIFIED: 'bg-emerald-500/15 text-emerald-300',
  REJECTED: 'bg-red-500/15 text-red-300',
  PENDING: 'bg-amber-500/15 text-amber-300',
}

const typeLabel = {
  NORMAL: 'Normal',
  SEMI_LUXURY: 'Semi Luxury',
  LUXURY: 'Luxury',
  AC: 'AC',
}

const parseAmenities = (a) => {
  if (Array.isArray(a)) return a
  if (typeof a === 'string') {
    try {
      const parsed = JSON.parse(a)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return a.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  return []
}

export default function AdminBuses() {
  const [filter, setFilter] = useState('PENDING')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // { type: 'VERIFIED' | 'REJECTED', row }
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = (status) => {
    setLoading(true)
    api
      .get('/admin/buses', { params: status === 'ALL' ? {} : { status } })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(errorMessage(err, 'Failed to load buses')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const decide = async () => {
    if (!modal) return
    setBusy(true)
    setError('')
    try {
      await api.post(`/admin/buses/${modal.row.id}/verification`, {
        status: modal.type,
        note: note.trim() || null,
      })
      setModal(null)
      setNote('')
      load(filter)
    } catch (err) {
      setError(errorMessage(err, 'Action failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold gradient-text">Vehicle Verifications</h1>
        <p className="text-sm text-slate-400">
          Review buses added by owners and associations. A bus must be verified before it can be scheduled.
        </p>
        <div className="scan-divider mt-4 w-40" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              filter === f ? 'bg-accent-500/15 text-accent-400 border border-accent-400/30' : 'text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="card grid place-items-center p-16 text-sm text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="glass-strong rounded-2xl p-10 text-center text-sm text-slate-400">
          No {filter === 'ALL' ? '' : filter.toLowerCase()} buses.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((b) => (
            <div key={b.id} className="glass-strong glow-border rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-500/15 text-accent-400">
                    <FaBus />
                  </span>
                  <div className="leading-tight">
                    <div className="font-semibold text-white">{b.registrationNo}</div>
                    <div className="text-xs text-slate-400">
                      {typeLabel[b.busType] || b.busType || '—'} · {b.capacity ?? '—'} seats
                      {b.model ? ` · ${b.model}` : ''}
                      {b.year ? ` (${b.year})` : ''}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1"><FaBuilding /> {b.operatorName || '—'}</span>
                      {b.operatorType && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">{b.operatorType}</span>}
                      <span className="inline-flex items-center gap-1"><FaUserTie /> {b.ownerName || '—'}{b.ownerEmail ? ` · ${b.ownerEmail}` : ''}</span>
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[b.status] || 'bg-slate-800 text-slate-300'}`}>
                  {b.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-3">
                <div>
                  <div className="mb-1 font-semibold text-slate-300">Operator registration</div>
                  {b.operatorRegistrationNo || '—'}
                </div>
                <div>
                  <div className="mb-1 font-semibold text-slate-300">Amenities</div>
                  {parseAmenities(b.amenities).join(', ') || '—'}
                </div>
                <div>
                  <div className="mb-1 font-semibold text-slate-300">Bus type</div>
                  {typeLabel[b.busType] || b.busType || '—'}
                </div>
              </div>

              {b.status === 'PENDING' && (
                <div className="mt-4 flex gap-3">
                  <button type="button" className="btn-nexus" onClick={() => { setModal({ type: 'VERIFIED', row: b }); setNote('') }}>
                    <FaCheck className="mr-2" /> Verify vehicle
                  </button>
                  <button type="button" className="btn-danger" onClick={() => { setModal({ type: 'REJECTED', row: b }); setNote('') }}>
                    <FaTimes className="mr-2" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => !busy && setModal(null)}>
          <div className="glass-strong w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold text-white">
              {modal.type === 'VERIFIED' ? 'Verify' : 'Reject'} bus {modal.row.registrationNo}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {modal.type === 'VERIFIED'
                ? 'This vehicle will be marked as verified and can then be scheduled.'
                : 'Add a reason so the owner knows what to fix.'}
            </p>
            <textarea
              className="input mt-4 min-h-24"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={modal.type === 'REJECTED' ? 'Reason for rejection' : 'Optional note'}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button
                type="button"
                className={modal.type === 'VERIFIED' ? 'btn-nexus' : 'btn-danger'}
                onClick={decide}
                disabled={busy || (modal.type === 'REJECTED' && !note.trim())}
              >
                {busy ? 'Saving…' : modal.type === 'VERIFIED' ? 'Verify' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
