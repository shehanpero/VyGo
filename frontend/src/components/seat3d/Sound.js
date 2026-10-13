// VyGo seat picker — procedural WebAudio module.
//
// Design rules enforced here:
//  - Single global AudioContext, created lazily on first playback AND primed by
//    the first user gesture (pointer/key/touch) so autoplay policy can never
//    block a cue silently.
//  - A cue is a NO-OP if the context is unavailable or not actually running
//    (muted tab / `suspended` state / resume still pending). We never schedule
//    sound on a suspended context — that queues up silent audio that would
//    burst out later.
//  - One global mute that gates every cue at call time. UI chimes stay under
//    200ms; the diegetic door hiss is intentionally ~0.5s.
//
// Why not Howler.js: there are no audio assets to manage (every cue is
// synthesized — oscillators + noise buffers), Howler is sample-playback
// oriented rather than synthesis oriented, and it would add ~30KB of
// dependency for zero feature gain on a module this small.

let ctx = null
let muted = false
let resumeListenersAttached = false

function getAC() {
  if (typeof window === 'undefined') return null
  return window.AudioContext || window.webkitAudioContext || null
}

function resumeCtx() {
  if (!ctx) return
  if (ctx.state === 'suspended') {
    // resume() is async; ignore rejection and rely on the running-state gate
    // in ensureCtx() so we never schedule on a context that stayed suspended.
    ctx.resume().catch(() => {})
  }
}

// Prime the context on the first user gesture (and whenever the tab becomes
// visible again) so a suspended context recovers without any user-visible
// action. Attached once per document — cheap and idempotent.
function attachResumeListeners() {
  if (resumeListenersAttached || typeof window === 'undefined') return
  resumeListenersAttached = true
  const prime = () => resumeCtx()
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(ev, prime, { passive: true, once: true })
  }
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resumeCtx()
  })
}

attachResumeListeners()

function ensureCtx() {
  const AC = getAC()
  if (!AC) return null
  if (!ctx) {
    try {
      ctx = new AC()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') resumeCtx()
  // Only schedule on a context that is actually running. If resume() hasn't
  // flipped the state yet (async) or the tab autoplay rules still apply,
  // return null so the cue no-ops gracefully.
  return ctx.state === 'running' ? ctx : null
}

function blip({ freq = 880, dur = 0.06, gain = 0.08, type = 'sine', when = 0, glide = 0 }) {
  if (muted) return
  const c = ensureCtx()
  if (!c) return
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (glide > 0) osc.frequency.exponentialRampToValueAtTime(freq + glide, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export function playSelect() {
  blip({ freq: 880, dur: 0.06, gain: 0.08, type: 'sine' })
}

export function playError() {
  blip({ freq: 130, dur: 0.14, gain: 0.1, type: 'triangle' })
}

// Two rising notes kept entirely under 200ms (0.09 + 0.09) to honor the UI
// chime budget.
export function playSuccess() {
  blip({ freq: 660, dur: 0.08, gain: 0.08, type: 'sine' })
  blip({ freq: 990, dur: 0.09, gain: 0.08, type: 'sine', when: 0.09 })
}

// Soft pneumatic door "hiss": ~0.5s of filtered noise.
// Synthesis approach:
//  - White noise is passed through a cheap one-pole lowpass in-sample (0.7
//    feedback) to pre-soften it before the biquad — keeps the burst from
//    sounding harsh/metallic.
//  - A BiquadFilter lowpass then sweeps 1400Hz -> 350Hz over the duration,
//    which reads as "pressure venting through a closing/opening door seal".
//  - Gain envelope: fast 30ms attack, exponential decay to silence by 500ms.
export function playDoorHiss() {
  if (muted) return
  const c = ensureCtx()
  if (!c) return
  const t0 = c.currentTime
  const dur = 0.5
  const rate = c.sampleRate
  const len = Math.max(1, Math.floor(rate * (dur + 0.06)))
  const buffer = c.createBuffer(1, len, rate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = last * 0.7 + white * 0.3
    data[i] = last
  }

  const src = c.createBufferSource()
  src.buffer = buffer
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 0.6
  lp.frequency.setValueAtTime(1400, t0)
  lp.frequency.exponentialRampToValueAtTime(350, t0 + dur)

  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  src.connect(lp).connect(g).connect(c.destination)
  src.start(t0)
  src.stop(t0 + dur + 0.06)
}

export function mute() {
  setMuted(true)
}

export function unmute() {
  setMuted(false)
}

export function setMuted(value) {
  muted = !!value
  // Unmuting is an explicit user intent to hear sound — try to wake a
  // suspended context (safe no-op if autoplay rules still apply).
  if (!muted) resumeCtx()
}

export function isMuted() {
  return muted
}

// Tactile feedback (Game Designer review): short vibration on select, a longer
// buzz on denial. Respects the OS-level prefers-reduced-motion hint via the
// caller; the module itself only guards availability so it can never throw.
let hapticsEnabled = true
export function setHapticsEnabled(value) {
  hapticsEnabled = !!value
}

function vibrate(pattern) {
  if (!hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* unsupported / permission denied — no-op */
  }
}

export function hapticSelect() {
  vibrate(12)
}

export function hapticDeny() {
  vibrate([30, 40, 30])
}

export const sound = {
  playSelect,
  playError,
  playSuccess,
  playDoorHiss,
  mute,
  unmute,
  setMuted,
  isMuted,
  setHapticsEnabled,
  hapticSelect,
  hapticDeny,
  get muted() {
    return muted
  },
}

export default sound
