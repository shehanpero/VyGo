import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import { FaCheck, FaTimes, FaUserShield, FaMobileAlt, FaImage } from 'react-icons/fa'

const FILTERS = ['PENDING', 'VERIFIED', 'REJECTED', 'ALL']

export default function AdminVerifications() {
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
      .get('/admin/staff/verifications', { params: status === 'ALL' ? {} : { status } })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(errorMessage(err, 'Failed to load verifications')))
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
      await api.post(`/admin/staff/${modal.row.userId}/verification`, {
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

  const docLink = (url) =>
    url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-lg border border-slate-700">
        <img src={url} alt="document" className="h-20 w-28 object-cover transition group-hover:opacity-80" />
      </a>
    ) : (
      <span className="grid h-20 w-28 place-items-center rounded-lg border border-dashed border-slate-700 text-xs text-slate-500">
        <FaImage />
      </span>
    )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold gradient-text">Identity Verifications</h1>
        <p className="text-sm text-slate-400">Review drivers and conductors who submitted ID documents and a face scan.</p>
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
          No {filter === 'ALL' ? '' : filter.toLowerCase()} verifications.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.userId} className="glass-strong glow-border rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-500/15 text-accent-400">
                    <FaUserShield />
                  </span>
                  <div className="leading-tight">
                    <div className="font-semibold text-white">{r.fullName}</div>
                    <div className="text-xs text-slate-400">
                      {r.role === 'DRIVER' ? 'Driver' : 'Conductor'} · {r.ownerName || 'No owner'}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      <FaMobileAlt /> {r.mobile}
                      {r.mobileVerified && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">verified</span>}
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    r.status === 'VERIFIED'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : r.status === 'REJECTED'
                        ? 'bg-red-500/15 text-red-300'
                        : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {r.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-4">
                <div>
                  <div className="mb-1 font-semibold text-slate-300">Document</div>
                  {r.idType} · {r.idNumber || '—'}
                </div>
                <div>
                  <div className="mb-1 font-semibold text-slate-300">ID front</div>
                  {docLink(r.idFrontUrl)}
                </div>
                <div>
                  <div className="mb-1 font-semibold text-slate-300">{r.idBackUrl ? 'ID back' : 'Licence'}</div>
                  {docLink(r.idBackUrl || r.licenseUrl)}
                </div>
                <div>
                  <div className="mb-1 font-semibold text-slate-300">Face scan</div>
                  {docLink(r.selfieUrl)}
                </div>
              </div>

              {r.licenseUrl && r.idBackUrl && (
                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold text-slate-300">Licence</div>
                  {docLink(r.licenseUrl)}
                </div>
              )}

              {r.note && <p className="mt-3 text-xs text-slate-400">Note: {r.note}</p>}

              {r.status === 'PENDING' && (
                <div className="mt-4 flex gap-3">
                  <button type="button" className="btn-nexus" onClick={() => { setModal({ type: 'VERIFIED', row: r }); setNote('') }}>
                    <FaCheck className="mr-2" /> Approve
                  </button>
                  <button type="button" className="btn-danger" onClick={() => { setModal({ type: 'REJECTED', row: r }); setNote('') }}>
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
              {modal.type === 'VERIFIED' ? 'Approve' : 'Reject'} {modal.row.fullName}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {modal.type === 'VERIFIED'
                ? 'This driver/conductor will be marked as verified.'
                : 'Add a reason so they know what to fix.'}
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
                {busy ? 'Saving…' : modal.type === 'VERIFIED' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
