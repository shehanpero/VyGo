import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import Reveal from '../components/nexus/Reveal'
import { FaBell, FaCheck, FaEnvelope, FaInbox, FaSms } from 'react-icons/fa'

const channelIcon = (channel) => {
  const c = String(channel || '').toUpperCase()
  if (c === 'EMAIL') return <FaEnvelope className="text-nexus-400" />
  if (c === 'SMS') return <FaSms className="text-nexus-400" />
  return <FaBell className="text-nexus-400" />
}

const formatSentAt = (sentAt) =>
  sentAt ? new Date(sentAt).toLocaleString() : '—'

export default function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [markingId, setMarkingId] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/notifications')
        setItems(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        setError(errorMessage(err, 'Failed to load notifications'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const markRead = async (id) => {
    setMarkingId(id)
    try {
      await api.post(`/notifications/${id}/read`)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'READ', isRead: true } : n)))
    } catch (err) {
      setError(errorMessage(err, 'Failed to mark as read'))
    } finally {
      setMarkingId(null)
    }
  }

  const isRead = (n) => n.isRead === true || String(n.status || '').toUpperCase() === 'READ'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Notifications</h1>
          <div className="scan-divider mt-3 w-40" />
        </div>
        <span className="badge badge-aurora bg-slate-500/15 text-slate-400">{items.length} total</span>
      </div>

      {loading && (
        <div role="status" className="glass-strong glow-border rounded-2xl p-10 text-center text-slate-400">
          Loading notifications…
        </div>
      )}
      {!loading && error && (
        <div role="alert" className="glass-strong glow-border rounded-2xl p-10 text-center text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="glass-strong glow-border rounded-2xl p-12 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20">
            <FaInbox className="text-3xl text-nexus-400" />
          </div>
          <h2 className="font-display text-lg font-bold text-white">No notifications</h2>
          <p className="mt-2 text-sm text-slate-400">You're all caught up.</p>
        </div>
      )}

      <div className="grid gap-3">
        {items.map((n, i) => (
          <Reveal key={n.id} delay={(i % 3) * 0.06}>
          <div
            className={`glass-strong glow-border rounded-2xl p-4 transition ${isRead(n) ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20">
                  {channelIcon(n.channel)}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{n.subject}</span>
                    <span className="badge bg-slate-500/15 text-slate-400">{n.channel}</span>
                    {isRead(n) && <span className="badge badge-aurora bg-emerald-500/15 text-emerald-400">Read</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatSentAt(n.sentAt)}</p>
                </div>
              </div>
              {!isRead(n) && (
                <button
                  type="button"
                  className="btn-holo shrink-0 !px-3 !py-1.5 text-xs"
                  disabled={markingId === n.id}
                  onClick={() => markRead(n.id)}
                >
                  <FaCheck /> {markingId === n.id ? 'Marking…' : 'Mark read'}
                </button>
              )}
            </div>
          </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
