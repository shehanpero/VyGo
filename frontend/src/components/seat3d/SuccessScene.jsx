import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { FaArrowRight, FaClock, FaTicketAlt } from 'react-icons/fa'
import { playSuccess } from './Sound'

// NEXUS brand palette (cyan + violet + magenta + slate-white) — futuristic,
// matches the aurora/gradient system so the reservation burst feels on-brand.
const CONFETTI_COLORS = ['#22d3ee', '#a5f3fc', '#a78bfa', '#8b5cf6', '#e879f9', '#f8fafc']
const CONFETTI_COUNT = 44
const CONFETTI_DURATION = 1.5
const CONFETTI_FADE_START = 0.8

function Confetti() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }
    resize()
    window.addEventListener('resize', resize)

    const parts = Array.from({ length: CONFETTI_COUNT }, () => ({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * canvas.width * 0.5,
      y: -20 - Math.random() * canvas.height * 0.15,
      vx: (Math.random() - 0.5) * 1.4 * dpr,
      vy: (2.2 + Math.random() * 3.2) * dpr,
      w: (4 + Math.random() * 5) * dpr,
      h: (7 + Math.random() * 7) * dpr,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.1,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      life: 1,
    }))

    let raf = 0
    const started = performance.now()
    const tick = (now) => {
      const elapsed = (now - started) / 1000
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        if (elapsed > CONFETTI_FADE_START) {
          p.life = Math.max(0, 1 - (elapsed - CONFETTI_FADE_START) / (CONFETTI_DURATION - CONFETTI_FADE_START))
        }
        if (p.y < canvas.height + 40 && p.life > 0) alive = true
        ctx.save()
        ctx.globalAlpha = p.life
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (alive && elapsed < CONFETTI_DURATION + 0.1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      // Clean up the canvas fully so the overlay never lingers after unmount.
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden="true"
    />
  )
}

// Radial "bloom" that radiates from behind the success badge — a soft, on-brand
// burst of expanding rings. Pure transform/opacity, so it stays GPU-cheap and is
// disabled under reduced-motion (see `reducedMotion` below).
function Bloom() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-nexus-400/50"
          initial={{ scale: 0.4, opacity: 0.6 }}
          animate={{ scale: 3 + i * 0.9, opacity: 0 }}
          transition={{ duration: 1.7, delay: i * 0.22, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export default function SuccessScene({ payload, expiresAt, onContinue, onClose }) {
  useEffect(() => {
    playSuccess()
  }, [])

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  // Live countdown of the server-side seat lock. Once it expires the seats are
  // released, so payment must be locked out until the user reselects.
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const remainingMs = expiresAt ? Math.max(0, Date.parse(expiresAt) - now) : null
  const expired = remainingMs !== null && remainingMs <= 0
  const totalSecs = Math.ceil(remainingMs / 1000)
  const lockMin = Math.floor(totalSecs / 60)
  const lockSec = String(totalSecs % 60).padStart(2, '0')

  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Seats reserved"
    >
      {!reducedMotion && <Confetti />}
      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-nexus-400/30 bg-slate-900 p-6 text-center shadow-[0_0_80px_-12px_rgba(34,211,238,0.45)]"
        initial={{ opacity: 0, scale: 0.86, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-nexus-400/70 to-transparent" />
        {!reducedMotion && <Bloom />}
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-nexus-500/15 text-3xl">
          🎉
        </div>
        <h2 className="mt-3 text-xl font-extrabold text-white">Your seats have been successfully reserved.</h2>
        <p className="mt-1 text-sm text-slate-400">
          {payload?.routeNumber} · {payload?.from} → {payload?.to}
        </p>

        <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
            <span>Seat reservation</span>
            <FaTicketAlt className="text-nexus-400" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-left">
              <div className="text-2xl font-extrabold text-white">{payload?.ref}</div>
              <div className="text-xs text-slate-400">{payload?.date}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-nexus-300">Seats</div>
              <div className="text-sm text-slate-200">{(payload?.seats || []).join(', ')}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4">
            <FaTicketAlt className="shrink-0 text-xl text-nexus-400" />
            <div className="text-left">
              <div className="text-sm font-semibold text-slate-200">E-ticket issued after payment</div>
              <div className="text-xs text-slate-400">The QR e-ticket for your seats appears once the payment is confirmed.</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-400">Total</span>
            <span className="text-lg font-extrabold text-nexus-400">LKR {(payload?.totalFare ?? 0).toLocaleString()}</span>
          </div>
          {expiresAt && (
            <div
              className={`mt-2 flex items-center justify-center gap-1.5 text-xs ${expired ? 'text-red-400' : 'text-slate-400'}`}
              role="status"
              aria-live="polite"
            >
              <FaClock aria-hidden="true" className={expired ? '' : 'text-amber-400'} />
              {expired ? (
                <span>
                  Seat lock expired — your seats were released. Close this and reselect to book.
                </span>
              ) : (
                <span>
                  Seats held for <b className="text-amber-300">{lockMin}:{lockSec}</b> — complete payment before it runs out.
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onContinue}
          autoFocus
          disabled={expired}
          className="btn-nexus mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {expired ? (
            'Lock expired — reselect seats'
          ) : (
            <>Continue to Payment <FaArrowRight /></>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full py-2 text-xs text-slate-400 transition hover:text-slate-200"
        >
          {expired ? 'Reselect seats' : 'Stay here'}
        </button>
      </motion.div>
    </motion.div>
    </MotionConfig>
  )
}
