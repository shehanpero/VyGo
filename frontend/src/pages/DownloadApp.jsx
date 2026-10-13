import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, isNativePlatform, API_BASE_KEY } from '../api/client'
import Reveal from '../components/nexus/Reveal'
import {
  FaAndroid,
  FaArrowLeft,
  FaBus,
  FaCheckCircle,
  FaDownload,
  FaQrcode,
  FaMobileAlt,
  FaWifi,
} from 'react-icons/fa'

const FEATURES = [
  { icon: FaBus, title: 'Book expressway seats', detail: 'Reserve your exact seat in seconds — pay by card through PayHere.' },
  { icon: FaQrcode, title: 'QR e-tickets', detail: 'Your ticket lives on your phone. Board with a single scan.' },
  { icon: FaMobileAlt, title: 'Live trip tracking', detail: 'See where your bus is and get reminders before departure.' },
  { icon: FaWifi, title: 'Works on the move', detail: 'A fast, native-feeling experience built for Sri Lankan expressways.' },
]

function formatSize(bytes) {
  if (!bytes) return null
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

export default function DownloadApp() {
  const native = isNativePlatform()
  const apiBase = native ? `${localStorage.getItem(API_BASE_KEY) || ''}/api/v1` : '/api/v1'
  const downloadUrl = `${apiBase}/app/download`

  const [info, setInfo] = useState(null)

  useEffect(() => {
    let active = true
    api
      .get('/app/info')
      .then((res) => {
        if (active) setInfo(res.data)
      })
      .catch(() => {
        if (active) setInfo({ available: false })
      })
    return () => {
      active = false
    }
  }, [])

  const available = info?.available !== false
  const version = info?.version
  const size = formatSize(info?.sizeBytes)

  return (
    <Reveal className="mx-auto max-w-3xl">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-accent-400"
      >
        <FaArrowLeft /> Back
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold gradient-text">Get the VyGo app</h1>
        <p className="mt-1 text-sm text-slate-400">
          Book expressway bus seats across Sri Lanka — right from your phone.
        </p>
        <div className="scan-divider mt-4" />
      </div>

      <div className="glass-strong glow-border relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-nexus-500/20 blur-3xl" />

        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-nexus-500/25 to-violet-500/20 glow-border">
            <FaAndroid className="text-4xl text-nexus-300" />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="font-display text-xl font-bold text-white">VyGo for Android</h2>
              <span className="badge badge-aurora bg-nexus-500/15 text-nexus-400">Android</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {version ? `Version ${version}` : 'Latest release'}
              {size ? ` · ${size}` : ''} · Android 8.0 and above
            </p>

            {native ? (
              <div className="mt-5 rounded-xl border border-emerald-800/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <FaCheckCircle className="mr-2 inline" />
                You're already using the VyGo app — no download needed.
              </div>
            ) : available ? (
              <a
                href={downloadUrl}
                download
                className="btn-nexus mt-5 w-full sm:w-auto"
                aria-label="Download the VyGo Android app"
              >
                <FaDownload /> Download APK
              </a>
            ) : (
              <div className="mt-5 rounded-xl border border-amber-800/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                The app package isn't available right now. Please check back soon.
              </div>
            )}

            {!native && available && (
              <p className="mt-3 text-xs text-slate-500">
                You may need to allow installing apps from your browser the first time.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="glass-strong rounded-2xl border border-slate-800/60 p-5">
            <Icon className="text-xl text-nexus-400" />
            <h3 className="mt-3 font-display text-base font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{detail}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-slate-500">
        Prefer the browser? You can keep booking at{' '}
        <Link to="/" className="text-nexus-300 underline-offset-2 hover:underline">
          vygo.lk
        </Link>
        .
      </p>
    </Reveal>
  )
}
