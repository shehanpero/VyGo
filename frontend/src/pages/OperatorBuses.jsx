import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import { FaBus, FaPlus, FaMinus, FaEdit, FaTrash, FaTimes, FaUsers, FaUserPlus } from 'react-icons/fa'

const AMENITIES = ['WiFi', 'Water', 'Charging', 'AC']

const emptyForm = {
  registrationNo: '',
  busType: 'NORMAL',
  capacity: '',
  model: '',
  year: '',
  amenities: [...AMENITIES],
}

const normalizeAmenities = (a) => {
  if (Array.isArray(a)) return a
  if (typeof a === 'string') return a.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

const typeBadge = {
  NORMAL: 'bg-slate-500/15 text-slate-300',
  SEMI_LUXURY: 'bg-sky-500/15 text-sky-400',
  LUXURY: 'bg-purple-500/15 text-purple-400',
  AC: 'bg-amber-500/15 text-amber-400',
}

const statusBadge = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  VERIFIED: 'bg-emerald-500/15 text-emerald-400',
  REJECTED: 'bg-red-500/15 text-red-400',
  ACTIVE: 'bg-emerald-500/15 text-emerald-400',
  MAINTENANCE: 'bg-amber-500/15 text-amber-400',
  INACTIVE: 'bg-red-500/15 text-red-400',
}

const statusLabel = {
  PENDING: 'Pending verification',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  ACTIVE: 'Active',
  MAINTENANCE: 'Maintenance',
  INACTIVE: 'Inactive',
}

const badgeFor = (map, key, fallback) => map[key] || fallback

export default function OperatorBuses() {
  const [buses, setBuses] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const [staffBus, setStaffBus] = useState(null)
  const [staff, setStaff] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffForm, setStaffForm] = useState({ role: 'CONDUCTOR', name: '', email: '', mobile: '', password: '' })
  const [staffError, setStaffError] = useState('')
  const [staffSaving, setStaffSaving] = useState(false)

  const loadBuses = async () => {
    try {
      const res = await api.get('/operator/buses')
      setBuses(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(errorMessage(err, 'Failed to load buses'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBuses()
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const toggleAmenity = (a) => {
    setForm({
      ...form,
      amenities: form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a],
    })
  }

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setOpen(true)
  }

  const openEdit = (bus) => {
    setEditing(bus)
    setForm({
      registrationNo: bus.registrationNo || '',
      busType: bus.busType || 'NORMAL',
      capacity: bus.capacity != null ? String(bus.capacity) : '',
      model: bus.model || '',
      year: bus.year != null ? String(bus.year) : '',
      amenities: normalizeAmenities(bus.amenities),
    })
    setFormError('')
    setOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    const payload = {
      registrationNo: form.registrationNo,
      busType: form.busType,
      capacity: Number(form.capacity),
      model: form.model,
      year: Number(form.year),
      amenities: form.amenities,
    }
    try {
      if (editing) {
        await api.put(`/operator/buses/${editing.id}`, payload)
      } else {
        await api.post('/operator/buses', payload)
      }
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await loadBuses()
    } catch (err) {
      setFormError(errorMessage(err, editing ? 'Failed to update bus' : 'Failed to add bus'))
    } finally {
      setSaving(false)
    }
  }

  const removeBus = async (bus) => {
    if (!window.confirm(`Delete bus ${bus.registrationNo}? This cannot be undone.`)) return
    try {
      await api.delete(`/operator/buses/${bus.id}`)
      await loadBuses()
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete bus'))
    }
  }

  const loadStaff = async (busId) => {
    setStaffLoading(true)
    setStaffError('')
    try {
      const res = await api.get(`/operator/buses/${busId}/staff`)
      setStaff(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setStaffError(errorMessage(err, 'Failed to load staff'))
    } finally {
      setStaffLoading(false)
    }
  }

  const openStaff = (bus) => {
    setStaffBus(bus)
    setStaff([])
    setStaffForm({ role: 'CONDUCTOR', name: '', email: '', mobile: '', password: '' })
    setStaffError('')
    loadStaff(bus.id)
  }

  const closeStaff = () => {
    setStaffBus(null)
    setStaff([])
    setStaffError('')
  }

  const setStaffField = (k) => (e) => setStaffForm({ ...staffForm, [k]: e.target.value })

  const addStaff = async (e) => {
    e.preventDefault()
    if (!staffBus) return
    setStaffSaving(true)
    setStaffError('')
    const payload = {
      role: staffForm.role,
      name: staffForm.name || null,
      email: staffForm.email || null,
      mobile: staffForm.mobile || null,
      password: staffForm.password || null,
    }
    try {
      await api.post(`/operator/buses/${staffBus.id}/staff`, payload)
      setStaffForm({ role: staffForm.role, name: '', email: '', mobile: '', password: '' })
      await loadStaff(staffBus.id)
    } catch (err) {
      setStaffError(errorMessage(err, 'Failed to add staff'))
    } finally {
      setStaffSaving(false)
    }
  }

  const removeStaff = async (member) => {
    if (!staffBus) return
    if (!window.confirm(`Remove ${member.fullName} from ${staffBus.registrationNo}?`)) return
    try {
      await api.delete(`/operator/buses/${staffBus.id}/staff/${member.id}`)
      await loadStaff(staffBus.id)
    } catch (err) {
      setStaffError(errorMessage(err, 'Failed to remove staff'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Manage Fleet</h1>
          <p className="text-sm text-slate-400">{buses.length} bus{buses.length === 1 ? '' : 'es'} in your fleet</p>
          <div className="scan-divider mt-3 w-40" />
        </div>
        <button type="button" onClick={() => (open ? setOpen(false) : openAdd())} className="btn-nexus">
          {open ? <><FaMinus /> Close form</> : <><FaPlus /> Add bus</>}
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {buses.some((b) => b.status === 'PENDING') && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <strong className="font-semibold">Vehicle verification required.</strong> Newly added buses stay
          <span className="mx-1 font-semibold">Pending verification</span> and cannot be scheduled until a platform
          admin verifies the vehicle.
        </div>
      )}
      {buses.some((b) => b.status === 'REJECTED') && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          One or more buses were rejected during vehicle verification. Update the details and contact support for a re-check.
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="glass-strong glow-border space-y-4 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">{editing ? 'Edit bus' : 'Add a new bus'}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-white" title="Close">
              <FaTimes />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="opbus-registration">Registration no.</label>
              <input id="opbus-registration" className="input" value={form.registrationNo} onChange={set('registrationNo')} placeholder="PV-1234" required />
            </div>
            <div>
              <label className="label" htmlFor="opbus-type">Bus type</label>
              <select id="opbus-type" className="input" value={form.busType} onChange={set('busType')}>
                <option value="NORMAL">Normal</option>
                <option value="SEMI_LUXURY">Semi Luxury</option>
                <option value="LUXURY">Luxury</option>
                <option value="AC">AC</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="opbus-capacity">Capacity</label>
              <input id="opbus-capacity" type="number" min="1" className="input" value={form.capacity} onChange={set('capacity')} placeholder="45" required />
            </div>
            <div>
              <label className="label" htmlFor="opbus-model">Model</label>
              <input id="opbus-model" className="input" value={form.model} onChange={set('model')} placeholder="Tata LP 909" />
            </div>
            <div>
              <label className="label" htmlFor="opbus-year">Year</label>
              <input id="opbus-year" type="number" min="1990" max="2030" className="input" value={form.year} onChange={set('year')} placeholder="2022" />
            </div>
          </div>
          <div>
            <label className="label" id="opbus-amenities-label">Amenities</label>
            <div role="group" aria-labelledby="opbus-amenities-label" className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const active = form.amenities.includes(a)
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${active ? 'border-nexus-500/50 bg-nexus-500/15 text-nexus-400' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                  >
                    {a}
                  </button>
                )
              })}
            </div>
          </div>
          {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn-nexus" disabled={saving}>
              <FaBus /> {saving ? 'Saving…' : editing ? 'Update bus' : 'Add bus'}
            </button>
            {editing && (
              <button type="button" className="btn-holo" onClick={openAdd}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      )}

      <div className="glass-strong glow-border overflow-hidden rounded-2xl">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading buses…</div>
        ) : buses.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No buses yet. Add your first bus to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Registration</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Model</th>
                  <th className="px-5 py-3">Year</th>
                  <th className="px-5 py-3">Capacity</th>
                  <th className="px-5 py-3">Amenities</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buses.map((bus) => (
                  <tr key={bus.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-5 py-3 font-medium text-white">{bus.registrationNo || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${badgeFor(typeBadge, bus.busType, 'bg-slate-500/15 text-slate-300')}`}>{bus.busType || '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{bus.model || '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{bus.year ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{bus.capacity ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{normalizeAmenities(bus.amenities).join(', ') || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${badgeFor(statusBadge, bus.status, 'bg-slate-500/15 text-slate-300')}`}>
                        {statusLabel[bus.status] || bus.status || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openStaff(bus)} className="btn-secondary !px-3 !py-1.5 text-xs">
                          <FaUsers /> Staff
                        </button>
                        <button type="button" onClick={() => openEdit(bus)} className="btn-holo !px-3 !py-1.5 text-xs">
                          <FaEdit /> Edit
                        </button>
                        <button type="button" onClick={() => removeBus(bus)} className="btn-danger !px-3 !py-1.5 text-xs">
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {staffBus && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="glass-strong glow-border my-8 w-full max-w-3xl rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Staff — {staffBus.registrationNo}
                </h2>
                <p className="text-xs text-slate-400">Assign drivers and conductors to this bus</p>
              </div>
              <button type="button" onClick={closeStaff} aria-label="Close" className="text-slate-400 hover:text-white" title="Close">
                <FaTimes />
              </button>
            </div>

            {staffError && <p role="alert" className="mt-4 text-sm text-red-400">{staffError}</p>}

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
              {staffLoading ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading staff…</div>
              ) : staff.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No staff assigned yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((m) => (
                      <tr key={m.id} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-4 py-3 font-medium text-white">{m.fullName || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${m.role === 'DRIVER' ? 'bg-violet-500/15 text-violet-400' : 'bg-sky-500/15 text-sky-400'}`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <div>{m.mobile || '—'}</div>
                          <div className="text-xs text-slate-500">{m.email || ''}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => removeStaff(m)} className="btn-danger !px-3 !py-1.5 text-xs">
                            <FaTrash /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <form onSubmit={addStaff} className="mt-5 space-y-4 border-t border-white/5 pt-5">
              <h3 className="flex items-center gap-2 font-display font-bold text-white">
                <FaUserPlus className="text-nexus-400" /> Add staff
              </h3>
              <p className="text-xs text-slate-400">
                Attaches an existing account by email or mobile, or creates a new one (default password
                <span className="font-mono text-slate-300"> password123</span>).
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="label" htmlFor="staff-role">Role</label>
                  <select id="staff-role" className="input" value={staffForm.role} onChange={setStaffField('role')}>
                    <option value="CONDUCTOR">Conductor</option>
                    <option value="DRIVER">Driver</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="staff-name">Name</label>
                  <input id="staff-name" className="input" value={staffForm.name} onChange={setStaffField('name')} placeholder="Full name" />
                </div>
                <div>
                  <label className="label" htmlFor="staff-mobile">Mobile</label>
                  <input id="staff-mobile" className="input" value={staffForm.mobile} onChange={setStaffField('mobile')} placeholder="07xxxxxxxx" />
                </div>
                <div>
                  <label className="label" htmlFor="staff-email">Email</label>
                  <input id="staff-email" type="email" className="input" value={staffForm.email} onChange={setStaffField('email')} placeholder="name@vygo.lk" />
                </div>
                <div>
                  <label className="label" htmlFor="staff-password">Password (new accounts)</label>
                  <input id="staff-password" type="password" className="input" value={staffForm.password} onChange={setStaffField('password')} placeholder="password123" autoComplete="new-password" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-nexus" disabled={staffSaving}>
                  <FaUserPlus /> {staffSaving ? 'Adding…' : 'Add staff'}
                </button>
                <button type="button" className="btn-holo" onClick={closeStaff}>
                  Done
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
