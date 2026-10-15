import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import CameraCapture from '../components/CameraCapture'
import {
  FaIdCard,
  FaCamera,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaIdBadge,
  FaUserCheck,
  FaArrowRight,
  FaBuilding,
} from 'react-icons/fa'

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(meta)?.[1] || 'image/jpeg'
  const bin = atob(base64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) buf[i] = bin.charCodeAt(i)
  return new Blob([buf], { type: mime })
}

// Mirrors the backend SriLankaIdValidator: structure + embedded birth date.
function validateIdNumber(idType, raw) {
  const value = (raw || '').replace(/[\s-]/g, '').toUpperCase()
  if (!value) return 'Document number is required'
  if (idType === 'PASSPORT') {
    return /^[A-Z]{1,2}\d{6,9}$/.test(value) ? '' : 'Enter a valid passport number, e.g. N1234567'
  }
  let year
  let day
  if (/^\d{9}[VX]$/.test(value)) {
    year = Number(value.slice(0, 2))
    day = Number(value.slice(2, 5))
    year = year >= 30 ? 1900 + year : 2000 + year
  } else if (/^\d{12}$/.test(value)) {
    year = Number(value.slice(0, 4))
    day = Number(value.slice(4, 7))
  } else {
    return 'Enter a valid NIC, e.g. 199012345678 or 901234567V'
  }
  const effective = day > 500 ? day - 500 : day
  const maxDay = ((y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365)(year)
  if (year < 1900 || year > new Date().getFullYear() || effective < 1 || effective > maxDay) {
    return 'That NIC does not encode a real birth date'
  }
  return ''
}

const STATUS_META = {
  UNVERIFIED: { label: 'Not verified', icon: FaIdBadge, tone: 'text-slate-300', ring: 'border-slate-700' },
  PENDING: { label: 'Pending review', icon: FaClock, tone: 'text-amber-300', ring: 'border-amber-500/40' },
  VERIFIED: { label: 'Verified', icon: FaCheckCircle, tone: 'text-emerald-300', ring: 'border-emerald-500/40' },
  REJECTED: { label: 'Rejected', icon: FaTimesCircle, tone: 'text-red-300', ring: 'border-red-500/40' },
}

function CaptureField({ label, hint, url, onOpen, required }) {
  return (
    <div>
      <div className="label">
        {label} {required && <span className="text-red-400">*</span>}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className={`relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
          url ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 bg-slate-900 hover:border-accent-400/50'
        }`}
      >
        {url ? (
          <img src={url} alt={label} className="h-14 w-20 rounded-lg object-cover" />
        ) : (
          <span className="grid h-14 w-20 place-items-center rounded-lg bg-slate-800 text-slate-500">
            <FaCamera />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">{url ? 'Captured — tap to retake' : 'Tap to capture'}</span>
          {hint && <span className="block text-xs text-slate-400">{hint}</span>}
        </span>
        {url && <FaCheckCircle className="text-emerald-400" />}
      </button>
    </div>
  )
}

export default function IdentityVerification() {
  const { user, setUser } = useAuth()
  const isDriver = user?.roles?.includes('DRIVER')
  const isConductor = user?.roles?.includes('CONDUCTOR')
  const isOperator = user?.roles?.includes('OPERATOR')
  const eligible = isDriver || isConductor || isOperator
  const roleLabel = isOperator ? 'Bus owner / association' : isDriver ? 'Driver' : 'Conductor'

  const [verification, setVerification] = useState(null)
  const [owners, setOwners] = useState([])
  const [form, setForm] = useState({
    ownerId: user?.ownerId ? String(user.ownerId) : '',
    idType: 'NIC',
    idNumber: '',
    idFrontUrl: '',
    idBackUrl: '',
    licenseUrl: '',
    businessDocUrl: '',
    selfieUrl: '',
  })
  const [capture, setCapture] = useState(null) // 'idFront' | 'idBack' | 'license' | 'businessDoc' | 'selfie'
  const [selfieLiveness, setSelfieLiveness] = useState(false)
  const [selfieActions, setSelfieActions] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [vRes, oRes] = await Promise.all([
          api.get('/auth/verification').catch(() => ({ data: null })),
          api.get('/operators/public').catch(() => ({ data: [] })),
        ])
        if (cancelled) return
        setVerification(vRes.data)
        setOwners(Array.isArray(oRes.data) ? oRes.data : [])
        const v = vRes.data
        if (v) {
          setForm((f) => ({
            ...f,
            ownerId: v.ownerId ? String(v.ownerId) : f.ownerId,
            idType: v.idType || f.idType,
            idNumber: v.idNumber || '',
            idFrontUrl: v.idFrontUrl || '',
            idBackUrl: v.idBackUrl || '',
            licenseUrl: v.licenseUrl || '',
            businessDocUrl: v.businessDocUrl || '',
            selfieUrl: v.selfieUrl || '',
          }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const upload = async (field, dataUrl, meta) => {
    setError('')
    setUploading(field)
    try {
      const blob = dataUrlToBlob(dataUrl)
      const fd = new FormData()
      fd.append('file', blob, `${field}.jpg`)
      const res = await api.post('/uploads', fd)
      setForm((f) => ({ ...f, [field]: res.data.url }))
      if (field === 'selfie') {
        setSelfieLiveness(Boolean(meta?.livenessPassed))
        setSelfieActions(meta?.actions || '')
      }
    } catch (err) {
      setError(errorMessage(err, 'Upload failed'))
    } finally {
      setUploading('')
    }
  }

  const status = verification?.status || 'UNVERIFIED'
  const meta = STATUS_META[status] || STATUS_META.UNVERIFIED
  const StatusIcon = meta.icon
  const canSubmit = useMemo(() => {
    if (!isOperator && !form.ownerId) return false
    if (validateIdNumber(form.idType, form.idNumber)) return false
    if (!form.idFrontUrl || !form.selfieUrl) return false
    if (form.idType === 'NIC' && !form.idBackUrl) return false
    if (isDriver && !form.licenseUrl) return false
    if (isOperator && !form.businessDocUrl) return false
    return true
  }, [form, isDriver, isOperator])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await api.post('/auth/verification', {
        idType: form.idType,
        idNumber: form.idNumber.trim(),
        idFrontUrl: form.idFrontUrl,
        idBackUrl: form.idType === 'NIC' ? form.idBackUrl : null,
        licenseUrl: isDriver ? form.licenseUrl : form.licenseUrl || null,
        businessDocUrl: isOperator ? form.businessDocUrl : null,
        selfieUrl: form.selfieUrl,
        ownerId: !isOperator && form.ownerId ? Number(form.ownerId) : null,
        livenessPassed: selfieLiveness,
        livenessActions: selfieActions || null,
      })
      setVerification(res.data)
      const meRes = await api.get('/auth/me')
      setUser(meRes.data)
      setMessage('Submitted — a platform admin will review your identity.')
    } catch (err) {
      setError(errorMessage(err, 'Could not submit verification'))
    } finally {
      setSaving(false)
    }
  }

  if (!eligible) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="glass-strong glow-border rounded-2xl p-8 text-center">
          <FaIdBadge className="mx-auto mb-3 text-3xl text-slate-500" />
          <h1 className="font-display text-xl font-bold text-white">Identity verification</h1>
          <p className="mt-2 text-sm text-slate-400">
            Identity verification is available for registered drivers, conductors, and bus owners / associations.
          </p>
          <Link to="/account" className="btn-secondary mt-4">
            Back to profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold gradient-text">Identity verification</h1>
        <p className="text-sm text-slate-400">
          {isOperator
            ? 'Verify your identity and business so passengers and drivers can trust your operation.'
            : 'Verify who you are so passengers and your bus owner / association can trust you.'}
        </p>
        <div className="scan-divider mt-4 w-40" />
      </div>

      <div className={`glass-strong glow-border flex items-center gap-4 rounded-2xl border p-5 ${meta.ring}`}>
        <span className={`grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-xl ${meta.tone}`}>
          <StatusIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FaUserCheck className="text-accent-400" /> {meta.label}
          </div>
          <div className="text-xs text-slate-400">
            {roleLabel}
            {verification?.ownerName ? ` · ${verification.ownerName}` : ''}
          </div>
        </div>
      </div>

      {verification?.note && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
          {verification.note}
        </p>
      )}

      {loading ? (
        <div className="card grid place-items-center p-12 text-sm text-slate-400">Loading…</div>
      ) : status === 'VERIFIED' ? (
        <div className="glass-strong rounded-2xl p-6 text-center">
          <FaCheckCircle className="mx-auto mb-3 text-4xl text-emerald-400" />
          <p className="text-sm text-slate-300">
            Your identity is verified. Nothing else is required.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="glass-strong glow-border space-y-5 rounded-2xl p-6">
          {!isOperator && (
            <div>
              <label className="label" htmlFor="verify-owner">Bus owner / association <span className="text-red-400">*</span></label>
              <select id="verify-owner" className="input" value={form.ownerId} onChange={set('ownerId')} required>
                <option value="">Select the owner you belong to</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          {isOperator && (
            <div className="flex items-start gap-3 rounded-xl border border-accent-400/30 bg-accent-500/5 p-3">
              <FaBuilding className="mt-0.5 text-accent-400" />
              <p className="text-xs text-slate-300">
                You are verifying as a <span className="font-semibold text-white">bus owner / association</span>. We will
                check your NIC, your business registration certificate, and your face.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="verify-idtype">Document type <span className="text-red-400">*</span></label>
              <select id="verify-idtype" className="input" value={form.idType} onChange={set('idType')}>
                <option value="NIC">National ID (NIC)</option>
                <option value="PASSPORT">Passport</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="verify-idnumber">Document number <span className="text-red-400">*</span></label>
              <input
                id="verify-idnumber"
                className="input"
                value={form.idNumber}
                onChange={set('idNumber')}
                placeholder={form.idType === 'NIC' ? '199012345678' : 'N1234567'}
                required
              />
              {form.idNumber && validateIdNumber(form.idType, form.idNumber) && (
                <p className="mt-1 text-xs text-red-400">{validateIdNumber(form.idType, form.idNumber)}</p>
              )}
            </div>
          </div>

          <CaptureField
            label={form.idType === 'NIC' ? 'ID card — front' : 'Passport — photo page'}
            hint="Photograph the document clearly"
            url={form.idFrontUrl}
            required
            onOpen={() => setCapture('idFront')}
          />
          {form.idType === 'NIC' && (
            <CaptureField
              label="ID card — back"
              hint="Both sides are required"
              url={form.idBackUrl}
              required
              onOpen={() => setCapture('idBack')}
            />
          )}
          {isOperator && (
            <CaptureField
              label="Business registration certificate"
              hint="The certificate showing your bus owner / association registration"
              url={form.businessDocUrl}
              required
              onOpen={() => setCapture('businessDoc')}
            />
          )}
          {!isOperator && (
            <CaptureField
              label={isDriver ? 'Driving licence' : 'Driving licence (optional)'}
              hint={isDriver ? 'Required for drivers' : 'Add it if you have one'}
              url={form.licenseUrl}
              required={isDriver}
              onOpen={() => setCapture('license')}
            />
          )}
          <CaptureField
            label="Face scan"
            hint="A guided live scan (blink + turn your head) — it must match your ID photo"
            url={form.selfieUrl}
            required
            onOpen={() => setCapture('selfie')}
          />
          {form.selfieUrl && !selfieLiveness && (
            <p className="text-xs text-amber-300">
              This face scan was not taken live. Retake it via the camera (not upload) so liveness and face-match can be checked.
            </p>
          )}

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-400">{message}</p>}
          {uploading && <p className="text-xs text-slate-400">Uploading {uploading}…</p>}

          <button type="submit" className="btn-nexus w-full justify-center" disabled={saving || !canSubmit || Boolean(uploading)}>
            <FaIdCard className="mr-2" /> {saving ? 'Submitting…' : 'Submit for review'} <FaArrowRight className="ml-2" />
          </button>
        </form>
      )}

      {capture && (
        <CameraCapture
          mode={capture === 'selfie' ? 'face' : 'document'}
          liveness={capture === 'selfie'}
          onCancel={() => setCapture(null)}
          onCapture={(dataUrl, meta) => {
            const field = capture
            setCapture(null)
            upload(field, dataUrl, meta)
          }}
        />
      )}
    </div>
  )
}
