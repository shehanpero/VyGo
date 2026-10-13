import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, errorMessage, saveAuth, getStoredToken } from '../api/client'
import { rolesLabel } from '../lib/roles'
import {
  FaUser,
  FaEnvelope,
  FaMobileAlt,
  FaSave,
  FaIdBadge,
  FaCamera,
  FaCheckCircle,
  FaShieldAlt,
  FaArrowRight,
} from 'react-icons/fa'

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(meta)?.[1] || 'image/jpeg'
  const bin = atob(base64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) buf[i] = bin.charCodeAt(i)
  return new Blob([buf], { type: mime })
}

const VERIFY_TONE = {
  UNVERIFIED: 'text-slate-300',
  PENDING: 'text-amber-300',
  VERIFIED: 'text-emerald-300',
  REJECTED: 'text-red-300',
}

export default function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const [otpStage, setOtpStage] = useState('idle') // idle | sent | done
  const [otp, setOtp] = useState('')
  const [otpBusy, setOtpBusy] = useState(false)
  const [otpMsg, setOtpMsg] = useState('')
  const [otpError, setOtpError] = useState('')

  const isStaff = user?.roles?.includes('DRIVER') || user?.roles?.includes('CONDUCTOR')

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value })
    setSaved(false)
    setError('')
  }

  const applyUser = (updated) => {
    setUser(updated)
    saveAuth(getStoredToken(), updated)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await api.put('/auth/me', {
        fullName: form.fullName,
        email: form.email,
        mobile: form.mobile,
      })
      applyUser(res.data)
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err, 'Failed to update profile'))
    } finally {
      setSaving(false)
    }
  }

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      setPhotoBusy(true)
      setPhotoError('')
      try {
        const blob = dataUrlToBlob(String(reader.result))
        const fd = new FormData()
        fd.append('file', blob, 'profile.jpg')
        const up = await api.post('/uploads', fd)
        const res = await api.put('/auth/me/photo', { url: up.data.url })
        applyUser(res.data)
      } catch (err) {
        setPhotoError(errorMessage(err, 'Could not update photo'))
      } finally {
        setPhotoBusy(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const requestOtp = async () => {
    setOtpBusy(true)
    setOtpError('')
    setOtpMsg('')
    try {
      const res = await api.post('/auth/mobile/verify-request')
      setOtpStage('sent')
      setOtpMsg(res.data?.devOtp ? `Sandbox code: ${res.data.devOtp}` : 'Code sent to your mobile.')
    } catch (err) {
      setOtpError(errorMessage(err, 'Could not send the code'))
    } finally {
      setOtpBusy(false)
    }
  }

  const confirmOtp = async () => {
    setOtpBusy(true)
    setOtpError('')
    try {
      const res = await api.post('/auth/mobile/verify', { otp: otp.trim() })
      applyUser(res.data)
      setOtpStage('done')
      setOtpMsg('Mobile number verified.')
    } catch (err) {
      setOtpError(errorMessage(err, 'Invalid or expired code'))
    } finally {
      setOtpBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold gradient-text">My Profile</h1>
        <p className="text-sm text-slate-400">Update your contact details and identity</p>
        <div className="scan-divider mt-4 w-40" />
      </div>

      <div className="glass-strong glow-border rounded-2xl p-6">
        <div className="flex items-center gap-4 border-b border-white/5 pb-5">
          <label className="group relative grid h-16 w-16 cursor-pointer place-items-center overflow-hidden rounded-full bg-accent-500/15 text-accent-400">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <FaUser className="text-3xl" />
            )}
            <span className="absolute inset-0 grid place-items-center bg-slate-950/60 opacity-0 transition group-hover:opacity-100">
              {photoBusy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-accent-400" />
              ) : (
                <FaCamera className="text-lg text-white" />
              )}
            </span>
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
          </label>
          <div className="leading-tight">
            <div className="text-lg font-semibold text-white">{user?.fullName}</div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-accent-400">
              <FaIdBadge /> {rolesLabel(user?.roles)}
            </div>
            {photoError && <div className="mt-1 text-xs text-red-400">{photoError}</div>}
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="profile-name">Full name</label>
            <input id="profile-name" className="input" value={form.fullName} onChange={set('fullName')} maxLength={120} required />
          </div>
          <div>
            <label className="label" htmlFor="profile-email">Email</label>
            <div className="relative">
              <FaEnvelope className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input id="profile-email" type="email" className="input pl-9" value={form.email} onChange={set('email')} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="profile-mobile">Mobile</label>
            <div className="relative">
              <FaMobileAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="profile-mobile"
                className="input pl-9"
                value={form.mobile}
                onChange={set('mobile')}
                placeholder="07xxxxxxxx"
                pattern="^0[0-9]{9}$"
                title="10 digits starting with 0, e.g. 0712345678"
                required
              />
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {saved && <p role="status" className="text-sm text-emerald-400">Profile updated</p>}

          <button type="submit" className="btn-nexus" disabled={saving}>
            <FaSave /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <FaMobileAlt className="text-accent-400" /> Mobile number
          {user?.mobileVerified ? (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
              <FaCheckCircle /> Verified
            </span>
          ) : (
            <span className="ml-auto rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">Unverified</span>
          )}
        </div>

        {!user?.mobileVerified && (
          <div className="mt-4 space-y-3">
            {otpStage === 'idle' && (
              <button type="button" className="btn-secondary" onClick={requestOtp} disabled={otpBusy}>
                {otpBusy ? 'Sending…' : 'Send verification code'}
              </button>
            )}
            {otpStage === 'sent' && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1">
                  <label className="label" htmlFor="profile-otp">Enter the 6-digit code</label>
                  <input
                    id="profile-otp"
                    className="input tracking-[0.3em]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                  />
                </div>
                <button type="button" className="btn-nexus" onClick={confirmOtp} disabled={otpBusy || otp.trim().length < 6}>
                  {otpBusy ? 'Verifying…' : 'Verify'}
                </button>
              </div>
            )}
            {otpMsg && <p className="text-xs text-emerald-400">{otpMsg}</p>}
            {otpError && <p className="text-xs text-red-400">{otpError}</p>}
          </div>
        )}
      </div>

      {isStaff && (
        <div className="glass-strong glow-border rounded-2xl p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FaShieldAlt className="text-accent-400" /> Identity verification
            <span className={`ml-auto rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold ${VERIFY_TONE[user?.verificationStatus] || 'text-slate-300'}`}>
              {user?.verificationStatus || 'UNVERIFIED'}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Add your ID card or passport, driving licence and a face scan to get verified.
          </p>
          <Link to="/verify" className="btn-nexus mt-4">
            <FaIdBadge className="mr-2" /> Open verification <FaArrowRight className="ml-2" />
          </Link>
        </div>
      )}
    </div>
  )
}
