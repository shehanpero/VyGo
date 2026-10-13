import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'

const ROLE_TABS = [
  { code: 'PASSENGER', label: "I'm a Passenger" },
  { code: 'OPERATOR', label: "I'm a Bus Owner" },
  { code: 'DRIVER', label: "I'm a Driver" },
  { code: 'CONDUCTOR', label: "I'm a Conductor" },
]

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('PASSENGER')
  const [owners, setOwners] = useState([])
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    ownerId: '',
    operator: { type: 'OWNER', name: '', registrationNo: '', licenseNo: '', address: '', contactPerson: '', phone: '' },
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isStaff = role === 'DRIVER' || role === 'CONDUCTOR'

  useEffect(() => {
    if (!isStaff || owners.length) return
    let cancelled = false
    api
      .get('/operators/public')
      .then((res) => {
        if (!cancelled) setOwners(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isStaff, owners.length])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setOp = (k) => (e) => setForm({ ...form, operator: { ...form.operator, [k]: e.target.value } })
  const setOpType = (type) => setForm({ ...form, operator: { ...form.operator, type } })
  const ownersOf = (type) => owners.filter((o) => (o.type || 'OWNER') === type)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { fullName: form.fullName, email: form.email, mobile: form.mobile, password: form.password, role }
      if (role === 'OPERATOR') payload.operator = form.operator
      if (isStaff) {
        if (!form.ownerId) throw new Error('Select the bus owner / association you belong to')
        payload.ownerId = Number(form.ownerId)
      }
      await api.post('/auth/register', payload)
      await login(form.email, form.password)
      navigate(role === 'OPERATOR' ? '/operator' : isStaff ? '/verify' : '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, err?.message || 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-lg">
      <div className="glass-strong glow-border rounded-2xl p-8">
        <h1 className="font-display text-2xl font-bold text-white">
          Create your <span className="gradient-text">VyGo</span> account
        </h1>
        <p className="mb-6 text-sm text-slate-400">
          Book buses as a passenger, register your company as a bus owner, or join as a driver or conductor.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-800 p-1">
          {ROLE_TABS.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => setRole(r.code)}
              aria-pressed={role === r.code}
              className={`rounded-lg py-2 text-sm font-semibold transition ${role === r.code ? 'bg-gradient-to-r from-nexus-500 to-violet-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="register-fullname">Full name</label>
            <input id="register-fullname" className="input" value={form.fullName} onChange={set('fullName')} placeholder="Nimal Perera" autoComplete="name" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="register-email">Email</label>
              <input id="register-email" type="email" className="input" value={form.email} onChange={set('email')} placeholder="you@mail.com" autoComplete="email" required />
            </div>
            <div>
              <label className="label" htmlFor="register-mobile">Mobile</label>
              <input id="register-mobile" inputMode="tel" className="input" value={form.mobile} onChange={set('mobile')} placeholder="0712345678" autoComplete="tel" required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="register-password">Password</label>
            <input id="register-password" type="password" className="input" value={form.password} onChange={set('password')} placeholder="Min 8 characters" autoComplete="new-password" minLength={8} required />
          </div>

          {isStaff && (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm font-semibold text-white">Bus owner / association</p>
              <p className="text-xs text-slate-400">
                Pick the owner or association you work for. You will appear only under them.
              </p>
              <select className="input" value={form.ownerId} onChange={set('ownerId')} required>
                <option value="">Select your bus owner / association</option>
                {ownersOf('OWNER').length > 0 && (
                  <optgroup label="Bus Owners">
                    {ownersOf('OWNER').map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </optgroup>
                )}
                {ownersOf('ASSOCIATION').length > 0 && (
                  <optgroup label="Associations">
                    {ownersOf('ASSOCIATION').map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              {owners.length === 0 && (
                <p className="text-xs text-amber-300">No approved bus owners are listed yet.</p>
              )}
            </div>
          )}

          {role === 'OPERATOR' && (
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm font-semibold text-white">Company / association details</p>
              <div>
                <span className="label">Register as</span>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800 p-1">
                  {[
                    { value: 'OWNER', label: 'Bus Owner' },
                    { value: 'ASSOCIATION', label: 'Association' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setOpType(t.value)}
                      aria-pressed={form.operator.type === t.value}
                      className={`rounded-lg py-2 text-sm font-semibold transition ${form.operator.type === t.value ? 'bg-gradient-to-r from-nexus-500 to-violet-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Bus Owners are private individuals/companies. Associations are collective or state operators (e.g. SLTB).
                </p>
              </div>
              <div>
                <label className="label" htmlFor="register-company-name">Company / association name</label>
                <input id="register-company-name" className="input" value={form.operator.name} onChange={setOp('name')} placeholder="Lanka Express" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="register-registration-no">Registration no.</label>
                  <input id="register-registration-no" className="input" value={form.operator.registrationNo} onChange={setOp('registrationNo')} placeholder="PV-1234" required />
                </div>
                <div>
                  <label className="label" htmlFor="register-license-no">License no.</label>
                  <input id="register-license-no" className="input" value={form.operator.licenseNo} onChange={setOp('licenseNo')} placeholder="L-88" required />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="register-address">Address</label>
                <input id="register-address" className="input" value={form.operator.address} onChange={setOp('address')} placeholder="No 12, Colombo" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="register-contact-person">Contact person</label>
                  <input id="register-contact-person" className="input" value={form.operator.contactPerson} onChange={setOp('contactPerson')} placeholder="R. Perera" required />
                </div>
                <div>
                  <label className="label" htmlFor="register-phone">Phone</label>
                  <input id="register-phone" className="input" value={form.operator.phone} onChange={setOp('phone')} placeholder="011-2345678" required />
                </div>
              </div>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-nexus w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-nexus-300 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
