import { useCallback, useState } from 'react'
import { API_BASE_KEY } from '../api/client'
import { Logo } from './Brand'
import { useI18n } from '../i18n'

export function normalizeServerAddress(raw) {
  let value = (raw || '').trim().replace(/\/+$/, '')
  if (!value) return ''
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`
  return value
}

// Common on-device / LAN addresses a dev VyGo backend is likely to live on.
// `10.0.2.2` is the Android emulator's loopback to the host machine.
const CANDIDATE_HOSTS = [
  '127.0.0.1:8080',
  'localhost:8080',
  '10.0.2.2:8080',
  '192.168.1.1:8080',
  '192.168.0.1:8080',
  '192.168.8.1:8080',
  '192.168.10.1:8080',
  '10.0.0.1:8080',
  '192.168.1.50:8080',
  '192.168.1.100:8080',
]

// Accepts plain host:port, full URLs, or `vygo://` invite links.
function toBase(raw) {
  return normalizeServerAddress(String(raw || '').replace(/^vygo:\/\//i, ''))
}

async function probeHost(host) {
  const base = toBase(host)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 900)
  try {
    const res = await fetch(`${base}/api/v1/health`, { method: 'GET', signal: controller.signal })
    if (!res.ok) return null
    let service = 'VyGo backend'
    try {
      const data = await res.json()
      if (data && data.service) service = data.service
    } catch {
      /* a non-JSON 200 still means the server is reachable */
    }
    return { base, service }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export default function ConnectScreen({ standalone = true, onClose }) {
  const { t } = useI18n()
  const [address, setAddress] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(API_BASE_KEY) : null
    return saved || ''
  })
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [found, setFound] = useState([])
  const [copied, setCopied] = useState(false)

  const scanNetwork = useCallback(async () => {
    setScanning(true)
    setScanned(false)
    setFound([])
    const results = await Promise.all(CANDIDATE_HOSTS.map(probeHost))
    setFound(results.filter(Boolean))
    setScanned(true)
    setScanning(false)
  }, [])

  const copyInvite = useCallback(async () => {
    const base = toBase(address)
    if (!base) return
    try {
      await navigator.clipboard.writeText(base)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be blocked in some contexts */
    }
  }, [address])

  async function testConnection(addressValue) {
    const base = toBase(addressValue)
      if (!base) {
        const fail = { ok: false, message: t('connect.enterFirstShort') }
        setResult(fail)
        return fail
      }
    setTesting(true)
    setResult(null)
    let outcome
    try {
      const res = await fetch(`${base}/api/v1/health`, { method: 'GET' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      let message = `Connected to ${base}`
      try {
        const data = await res.json()
        if (data && data.status) message = `${data.status} · ${data.service || 'vygo-backend'}`
      } catch {
        // Some proxies answer 200 without a JSON body; a successful GET is enough.
      }
      outcome = { ok: true, message, base }
    } catch (err) {
      outcome = { ok: false, message: `Could not reach server: ${err.message}` }
    } finally {
      setTesting(false)
    }
    setResult(outcome)
    return outcome
  }

  async function saveAndContinue() {
    const base = toBase(address)
    if (!base) {
      setError(t('connect.enterFirst'))
      return
    }
    const lastResult = result?.base === base ? result : await testConnection(base)
    if (lastResult?.ok) {
      localStorage.setItem(API_BASE_KEY, base)
      window.location.reload()
    }
  }

  return (
    <div
      className={
        standalone
          ? 'screen-full flex flex-col items-center justify-center bg-slate-950 px-4 py-10'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur'
      }
      role={standalone ? undefined : 'dialog'}
      aria-modal={standalone ? undefined : 'true'}
    >
      <div className="w-full max-w-md">
        <div className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <Logo size={40} showText={false} link={false} />
             <h1 className="font-display text-lg font-bold text-white">
               {t('connect.title')}
             </h1>
            {!standalone && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close server settings"
                className="text-slate-400 hover:text-white"
              >
                X
              </button>
            )}
          </div>

           <p className="mb-5 text-sm text-slate-400">
             {t('connect.subtitle')}
           </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="connect-address" className="label">
                Server address
              </label>
              <input
                id="connect-address"
                className="input"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setError('')
                  setResult(null)
                }}
                 placeholder={t('connect.placeholder')}
                 inputMode="url"
                 autoCapitalize="none"
                 autoCorrect="off"
                 spellCheck={false}
               />
                <p className="mt-1.5 text-xs text-slate-400">
                  {t('connect.hint')}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">{t('connect.scanHint')}</p>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700/60"
                    disabled={scanning}
                    onClick={scanNetwork}
                  >
                    {scanning ? t('connect.scanning') : t('connect.scan')}
                  </button>
                </div>
             </div>

             {scanning && <p className="mt-3 text-xs text-slate-400">{t('connect.scanning')}</p>}

             {!scanning && scanned && found.length === 0 && (
               <p className="mt-3 text-xs text-slate-400">{t('connect.noServers')}</p>
             )}

             {found.length > 0 && (
               <div className="mt-3 space-y-2">
                 <p className="text-xs uppercase tracking-wide text-slate-400">{t('connect.found')}</p>
                 {found.map((s) => (
                   <button
                     key={s.base}
                     type="button"
                     className="flex w-full items-center justify-between rounded-lg border border-nexus-500/40 bg-nexus-500/10 px-3 py-2 text-left transition hover:bg-nexus-500/20"
                     onClick={() => {
                       setAddress(s.base)
                       setResult({ ok: true, message: s.base, base: s.base })
                     }}
                   >
                     <span>
                       <span className="block text-sm font-semibold text-white">{s.base}</span>
                       <span className="block text-xs text-slate-400">{s.service}</span>
                     </span>
                     <span className="text-xs font-semibold text-nexus-300">{t('connect.useThis')}</span>
                   </button>
                 ))}
               </div>
             )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            {result && (
              <p className={`text-sm ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.message}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={testing}
                onClick={() => testConnection(address)}
              >
                 {testing ? 'Testing…' : t('action.testConnection')}
              </button>
               <button
                 type="button"
                 className="btn-nexus px-4 py-2.5 text-sm font-semibold"
                 disabled={testing}
                 onClick={saveAndContinue}
               >
                  {testing ? 'Testing…' : t('action.saveContinue')}
               </button>
               <button
                 type="button"
                 className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs text-slate-300 transition hover:bg-slate-700/60"
                 disabled={!address.trim() || testing}
                 onClick={copyInvite}
               >
                 {copied ? t('connect.inviteCopied') : t('connect.copyInvite')}
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}