import { useEffect, useRef } from 'react'

/**
 * HeroScene3D — self-contained animated "3D-style" hero background for VyGo.
 *
 * Depicts a Sri Lankan expressway at dusk: a stylised highway sweeps in from the
 * lower-left and converges on a glowing city skyline (Colombo-esque) on the
 * horizon. A subtle bus silhouette travels toward the viewer, emerald light
 * streams (head/tail lights) flow along the lanes, emerald street lamps cast
 * pools of light, palm silhouettes frame the foreground, and stars + a warm
 * dusk sun fade behind the skyline.
 *
 * Implemented with plain Canvas 2D + a tiny hand-rolled perspective projection
 * (no three.js, no CDN, no extra dependencies). All scene geometry lives in a
 * small 3D world (X = lateral, Y = height, Z = depth from camera) and is
 * projected to screen space each frame.
 *
 * Props:
 *   className : string — extra classes for the <canvas> element. The parent is
 *               responsible for sizing; the canvas fills its container
 *               (width/height 100%). e.g. "absolute inset-0" to layer it.
 *
 * Behaviour:
 *   - Responsive: ResizeObserver on the canvas + window resize fallback.
 *   - DPR capped at 2. Static scenery is baked into an offscreen canvas on
 *     resize, so per-frame cost is small.
 *   - prefers-reduced-motion: renders one static frame, no rAF loop.
 *   - Tab hidden: rAF loop keeps ticking but drawing is skipped (free).
 *   - Unmount: full cleanup (rAF, observers, listeners).
 */

/* ------------------------------------------------------------------ *
 *  World constants (world units; Z is depth from the camera)
 * ------------------------------------------------------------------ */
const Z_NEAR = 3.5      // closest visible depth (bottom of frame)
const Z_FAR = 210       // where the road meets the city
const ROAD_HALF = 3.1   // half road width (world)
const LANE_OFF = 1.55   // lane centre offset from road centre
const SWEEP = 1.7       // how far the road curls to the left at the bottom
const CAM_H = 1.5       // camera height above the road surface
const N_SAMPLES = 120   // road sampling resolution

const DASH_PERIOD = 9   // world-units per dash cycle
const DASH_LEN = 4.5    // world-units per dash
const DASH_FLOW = 9     // world-units/sec the dashes stream toward the camera

const PALETTE = {
  night: '#020617',      // slate-950
  deep: '#050b16',
  asphalt: '#060c17',
  emerald: '#10b981',
  emeraldBright: '#34d399',
  emeraldPale: '#a7f3d0',
  mint: '#d1fae5',
  amber: '#fcd34d',
  amberPale: '#fde68a',
  cream: '#fff7ed',
  white: '#f8fafc',
}

/* ------------------------------------------------------------------ *
 *  Small helpers
 * ------------------------------------------------------------------ */
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
const frac = (v) => v - Math.floor(v)

/** Deterministic PRNG so the scene looks the same every load. */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ *
 *  Component
 * ------------------------------------------------------------------ */
export default function HeroScene3D({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced =
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      false

    let W = 0
    let H = 0
    let dpr = 1
    let rafId = 0
    let samples = []
    let st = null // static scenery (roads, skyline, lights…) baked once per resize
    let bg = null // offscreen canvas with the baked scenery
    let vg = null // offscreen canvas with the vignette
    const startTime = performance.now()

    /* ----- projection ----- */
    const roadCenterX = (z) =>
      -SWEEP * Math.pow(clamp01((Z_FAR - z) / (Z_FAR - Z_NEAR)), 1.5)

    const project = (x, y, z, f, cx, cy) => {
      if (z <= 0.1) return null
      const s = f / z
      return [cx + x * s, cy + (CAM_H - y) * s, s]
    }

    const sampleAt = (i, f, cx, cy) => {
      const z = Z_NEAR + (Z_FAR - Z_NEAR) * (i / N_SAMPLES)
      const xc = roadCenterX(z)
      const s = f / z
      const gy = cy + CAM_H * s
      const pt = (dx) => [cx + (xc + dx) * s, gy]
      return {
        z,
        s,
        c: pt(0),
        l: pt(-LANE_OFF),
        r: pt(LANE_OFF),
        el: pt(-ROAD_HALF),
        er: pt(ROAD_HALF),
        elIn: pt(-(ROAD_HALF - 0.16)),
        elOut: pt(-(ROAD_HALF + 0.16)),
        erIn: pt(ROAD_HALF - 0.16),
        erOut: pt(ROAD_HALF + 0.16),
      }
    }

    const interpAt = (z, f, cx, cy) => {
      const u = clamp01((z - Z_NEAR) / (Z_FAR - Z_NEAR))
      const fi = u * N_SAMPLES
      const i = Math.min(Math.floor(fi), N_SAMPLES - 1)
      const t = Math.min(fi - i, 1)
      const a = samples[i]
      const b = samples[Math.min(i + 1, N_SAMPLES)]
      return {
        z: lerp(a.z, b.z, t),
        s: lerp(a.s, b.s, t),
        c: lerp2(a.c, b.c, t),
        l: lerp2(a.l, b.l, t),
        r: lerp2(a.r, b.r, t),
      }
    }

    const laneTangent = (z, which) => {
      const dz = 1.2
      const p1 = interpAt(Math.max(Z_NEAR + 0.2, z - dz), 0, 0, 0)
      const p2 = interpAt(Math.min(Z_FAR - 0.2, z + dz), 0, 0, 0)
      const a = p1[which]
      const b = p2[which]
      let x = b[0] - a[0]
      let y = b[1] - a[1]
      const l = Math.hypot(x, y) || 1
      return [x / l, y / l] // points away from camera (up-screen)
    }

    /* ----- static scenery baked into an offscreen canvas ----- */
    const buildStatic = () => {
      const f = W * 1.1
      const cx = W / 2
      const cy = H * 0.4

      samples = []
      for (let i = 0; i <= N_SAMPLES; i++) samples.push(sampleAt(i, f, cx, cy))

      // offscreen canvas at full DPR, drawn in CSS-pixel space
      bg = document.createElement('canvas')
      bg.width = Math.max(1, Math.round(W * dpr))
      bg.height = Math.max(1, Math.round(H * dpr))
      const b = bg.getContext('2d')
      b.setTransform(dpr, 0, 0, dpr, 0, 0)

      const rng = mulberry32(20260803)

      /* --- sky --- */
      const sky = b.createLinearGradient(0, 0, 0, cy * 1.05)
      sky.addColorStop(0, PALETTE.night)
      sky.addColorStop(0.55, '#0b1424')
      sky.addColorStop(0.85, '#151f33')
      sky.addColorStop(0.93, '#2b2450') // lavender dusk band just above the horizon
      sky.addColorStop(1, '#1c2340')
      b.fillStyle = sky
      b.fillRect(0, 0, W, cy + 1)

      /* --- stars --- */
      for (let i = 0; i < 70; i++) {
        const x = rng() * W
        const y = rng() * Math.max(1, cy * 0.85)
        b.globalAlpha = 0.15 + rng() * 0.45
        b.fillStyle = '#e2e8f0'
        b.beginPath()
        b.arc(x, y, 0.4 + rng() * 1.1, 0, Math.PI * 2)
        b.fill()
      }
      b.globalAlpha = 1

      /* --- dusk sun (mostly sunk behind the horizon) --- */
      const sunX = W * 0.26
      const sunY = cy + H * 0.012
      const sunR = W * 0.042
      const halo = b.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3.2)
      halo.addColorStop(0, 'rgba(255,247,237,0.95)')
      halo.addColorStop(0.18, 'rgba(252,211,77,0.55)')
      halo.addColorStop(0.45, 'rgba(16,185,129,0.18)')
      halo.addColorStop(1, 'rgba(16,185,129,0)')
      b.fillStyle = halo
      b.beginPath()
      b.arc(sunX, sunY, sunR * 3.2, 0, Math.PI * 2)
      b.fill()
      b.fillStyle = 'rgba(255,247,237,0.95)'
      b.beginPath()
      b.arc(sunX, sunY, sunR, 0, Math.PI * 2)
      b.fill()
      b.fillStyle = '#fde68a'
      b.beginPath()
      b.arc(sunX, sunY, sunR * 0.55, 0, Math.PI * 2)
      b.fill()

      /* --- far hills behind the skyline --- */
      const hillLayer = (color, amp, baseY, seed) => {
        b.fillStyle = color
        b.beginPath()
        b.moveTo(0, baseY + 4)
        for (let x = 0; x <= W; x += 24) {
          const n =
            Math.sin(x * 0.006 + seed) * 0.5 +
            Math.sin(x * 0.013 + seed * 2.7) * 0.3 +
            Math.sin(x * 0.031 + seed * 1.3) * 0.2
          b.lineTo(x, baseY - amp * H * (0.35 + n))
        }
        b.lineTo(W, baseY + 4)
        b.closePath()
        b.fill()
      }
      hillLayer('#0a1424', 0.09, cy + 1, 1.3)
      hillLayer('#050c18', 0.055, cy + 1, 4.7)

      /* --- city glow rising from the horizon --- */
      const glow1 = b.createRadialGradient(cx, cy, 0, cx, cy, W * 0.42)
      glow1.addColorStop(0, 'rgba(52,211,153,0.22)')
      glow1.addColorStop(1, 'rgba(52,211,153,0)')
      b.fillStyle = glow1
      b.fillRect(cx - W * 0.42, cy - H * 0.3, W * 0.84, H * 0.32)
      const glow2 = b.createRadialGradient(cx, cy, 0, cx, cy, W * 0.3)
      glow2.addColorStop(0, 'rgba(252,211,77,0.13)')
      glow2.addColorStop(1, 'rgba(252,211,77,0)')
      b.fillStyle = glow2
      b.fillRect(cx - W * 0.3, cy - H * 0.26, W * 0.6, H * 0.28)

      /* --- city skyline --- */
      const buildings = []
      for (let i = 0; i < 16; i++) {
        const x = -21 + (42 * i) / 15 + (rng() - 0.5) * 7
        const z = 234 + rng() * 28
        const h = 8 + rng() * 39 // 8..47 world units (kept inside the frame)
        buildings.push({ x, z, h, w: 3.5 + rng() * 6.5, seed: rng() })
      }
      buildings.sort((a, bb) => bb.z - a.z) // far first

      const twinkles = []
      for (const bl of buildings) {
        const base = project(bl.x, 0, bl.z, f, cx, cy)
        const top = project(bl.x, bl.h, bl.z, f, cx, cy)
        if (!base || !top) continue
        const s = base[2]
        const bw = bl.w * s
        const bh = top[1] - base[1] // negative (top is above base)
        const x0 = base[0] - bw / 2
        const y0 = top[1]

        b.fillStyle = '#0a1526'
        b.fillRect(x0, y0, bw, -bh)

        // emerald rim light on the top edge (dusk light)
        b.fillStyle = 'rgba(52,211,153,0.35)'
        b.fillRect(x0, y0, bw, Math.max(1, 1.4 * s))

        // antenna on the tallest towers
        if (bl.h > 40) {
          b.strokeStyle = 'rgba(148,163,184,0.35)'
          b.lineWidth = Math.max(0.6, 0.35 * s)
          b.beginPath()
          b.moveTo(base[0], y0)
          b.lineTo(base[0], y0 - 8 * s)
          b.stroke()
        }

        // lit windows
        const cols = Math.max(1, Math.floor(bl.w / 1.1))
        const rows = Math.max(1, Math.floor(bl.h / 2.3))
        for (let cxi = 0; cxi < cols; cxi++) {
          for (let ryi = 0; ryi < rows; ryi++) {
            if (rng() > 0.3) continue
            const wx = x0 + (cxi + 0.35) * (bw / cols)
            const wy = y0 + 2.2 * s + ryi * ((bl.h - 2.6) / rows) * s
            const ww = Math.max(0.8, 0.75 * s)
            const wh = Math.max(1, 1.05 * s)
            const warm = rng() > 0.62
            b.fillStyle = warm ? 'rgba(252,211,77,0.85)' : 'rgba(52,211,153,0.8)'
            b.fillRect(wx, wy, ww, wh)
            if (twinkles.length < 230) {
              twinkles.push({
                x: wx,
                y: wy,
                w: ww,
                h: wh,
                seed: rng() * 100,
                warm,
              })
            }
          }
        }
      }
      st = { ...st, twinkles }

      /* --- ground plane --- */
      const ground = b.createLinearGradient(0, cy, 0, H)
      ground.addColorStop(0, '#0b1526')
      ground.addColorStop(0.18, 'rgba(16,185,129,0.10)')
      ground.addColorStop(0.4, '#081120')
      ground.addColorStop(1, '#03070f')
      b.fillStyle = ground
      b.fillRect(0, cy, W, H - cy + 1)

      // faint emerald haze just above the road end
      const haze = b.createLinearGradient(0, cy, 0, cy + H * 0.1)
      haze.addColorStop(0, 'rgba(52,211,153,0.10)')
      haze.addColorStop(1, 'rgba(52,211,153,0)')
      b.fillStyle = haze
      b.fillRect(0, cy, W, H * 0.1)

      /* --- road surface (perspective polygon) --- */
      const roadL = samples.map((s) => s.el)
      const roadR = samples.map((s) => s.er)
      b.fillStyle = PALETTE.asphalt
      b.beginPath()
      b.moveTo(roadL[0][0], roadL[0][1])
      for (let i = 1; i <= N_SAMPLES; i++) b.lineTo(roadL[i][0], roadL[i][1])
      b.lineTo(roadR[N_SAMPLES][0], roadR[N_SAMPLES][1])
      for (let i = N_SAMPLES - 1; i >= 0; i--) b.lineTo(roadR[i][0], roadR[i][1])
      b.closePath()
      b.fill()

      // subtle darker asphalt at the near end
      const roadShade = b.createLinearGradient(0, H, 0, cy)
      roadShade.addColorStop(0, 'rgba(0,0,0,0.28)')
      roadShade.addColorStop(1, 'rgba(0,0,0,0)')
      b.fillStyle = roadShade
      b.fillRect(0, cy, W, H - cy)

      /* --- edge lines (emerald glow band + bright core) --- */
      const edgeBand = (innerArr, outerArr, glowA) => {
        b.beginPath()
        b.moveTo(outerArr[0][0], outerArr[0][1])
        for (let i = 1; i <= N_SAMPLES; i++)
          b.lineTo(outerArr[i][0], outerArr[i][1])
        b.lineTo(innerArr[N_SAMPLES][0], innerArr[N_SAMPLES][1])
        for (let i = N_SAMPLES - 1; i >= 0; i--)
          b.lineTo(innerArr[i][0], innerArr[i][1])
        b.closePath()
        b.fillStyle = glowA
        b.fill()
      }
      const elIn = samples.map((s) => s.elIn)
      const elOut = samples.map((s) => s.elOut)
      const erIn = samples.map((s) => s.erIn)
      const erOut = samples.map((s) => s.erOut)
      const els = samples.map((s) => s.el)
      const ers = samples.map((s) => s.er)
      edgeBand(elIn, elOut, 'rgba(16,185,129,0.30)')
      edgeBand(erIn, erOut, 'rgba(16,185,129,0.30)')
      b.strokeStyle = 'rgba(209,250,229,0.95)'
      b.lineWidth = 1.2
      b.beginPath()
      for (let i = 0; i <= N_SAMPLES; i++) {
        const p = els[i]
        if (i === 0) b.moveTo(p[0], p[1])
        else b.lineTo(p[0], p[1])
      }
      b.stroke()
      b.beginPath()
      for (let i = 0; i <= N_SAMPLES; i++) {
        const p = ers[i]
        if (i === 0) b.moveTo(p[0], p[1])
        else b.lineTo(p[0], p[1])
      }
      b.stroke()

      /* --- street lamps: poles, lamp glows, light pools --- */
      for (let z = 16; z < Z_FAR - 6; z += 14) {
        for (const side of [-1, 1]) {
          const xc = roadCenterX(z)
          const base = project(xc + side * (ROAD_HALF + 0.9), 0, z, f, cx, cy)
          const head = project(xc + side * (ROAD_HALF + 0.9), 5.6, z, f, cx, cy)
          if (!base || !head) continue
          const s = base[2]
          // pole
          b.strokeStyle = 'rgba(10,21,38,0.9)'
          b.lineWidth = Math.max(0.8, 0.16 * s)
          b.beginPath()
          b.moveTo(base[0], base[1])
          b.lineTo(head[0], head[1])
          b.stroke()
          b.strokeStyle = 'rgba(52,211,153,0.18)'
          b.lineWidth = Math.max(0.5, 0.06 * s)
          b.beginPath()
          b.moveTo(base[0], base[1])
          b.lineTo(head[0], head[1])
          b.stroke()
          // lamp glow
          const lr = Math.max(1.6, 0.42 * s)
          if (lr > 1.5) {
            const lg = b.createRadialGradient(
              head[0], head[1], 0, head[0], head[1], lr * 3
            )
            lg.addColorStop(0, 'rgba(214,255,236,0.9)')
            lg.addColorStop(0.25, 'rgba(52,211,153,0.4)')
            lg.addColorStop(1, 'rgba(52,211,153,0)')
            b.fillStyle = lg
            b.beginPath()
            b.arc(head[0], head[1], lr * 3, 0, Math.PI * 2)
            b.fill()
            b.fillStyle = 'rgba(236,253,245,0.95)'
            b.beginPath()
            b.arc(head[0], head[1], Math.max(0.8, 0.12 * s), 0, Math.PI * 2)
            b.fill()
          }
          // light pool on the road
          const poolX = project(
            xc + side * (ROAD_HALF - 0.5), 0, z, f, cx, cy
          )
          if (poolX) {
            const pool = b.createRadialGradient(
              poolX[0], poolX[1], 0, poolX[0], poolX[1], 2.1 * s
            )
            pool.addColorStop(0, 'rgba(52,211,153,0.16)')
            pool.addColorStop(1, 'rgba(52,211,153,0)')
            b.fillStyle = pool
            b.save()
            b.translate(poolX[0], poolX[1])
            b.scale(1, 0.42)
            b.beginPath()
            b.arc(0, 0, 2.1 * s, 0, Math.PI * 2)
            b.fill()
            b.restore()
          }
        }
      }

      /* --- vignette + bottom fade (separate offscreen layer) --- */
      vg = document.createElement('canvas')
      vg.width = Math.max(1, Math.round(W * dpr))
      vg.height = Math.max(1, Math.round(H * dpr))
      const v = vg.getContext('2d')
      v.setTransform(dpr, 0, 0, dpr, 0, 0)
      const vig = v.createRadialGradient(
        cx, H * 0.45, H * 0.25, cx, H * 0.48, Math.max(W, H) * 0.78
      )
      vig.addColorStop(0, 'rgba(2,6,23,0)')
      vig.addColorStop(1, 'rgba(2,6,23,0.5)')
      v.fillStyle = vig
      v.fillRect(0, 0, W, H)
      const botFade = v.createLinearGradient(0, H * 0.72, 0, H)
      botFade.addColorStop(0, 'rgba(2,6,23,0)')
      botFade.addColorStop(1, 'rgba(2,6,23,0.92)')
      v.fillStyle = botFade
      v.fillRect(0, H * 0.72, W, H * 0.28)

      st = {
        ...st,
        f,
        cx,
        cy,
        sunX,
        sunY,
        sunR,
        traffic: buildTraffic(),
        palms: buildPalms(),
        twinkles: st ? st.twinkles : [],
        twinkleStars: buildTwinkleStars(),
      }
    }

    /* ----- dynamic entities ----- */
    const buildTraffic = () => {
      const rng = mulberry32(777)
      const mk = (n) =>
        Array.from({ length: n }, () => ({
          phase: rng(),
          speed: 20 + rng() * 14,
          off: (rng() - 0.5) * 0.6,
        }))
      return { toward: mk(6), away: mk(5) }
    }

    const buildPalms = () => {
      const rng = mulberry32(4242)
      const spots = [
        { x: -2.05, z: 4.6, h: 2.0 },
        { x: 2.5, z: 6.3, h: 1.9 },
        { x: 2.72, z: 8.6, h: 1.55 },
      ]
      return spots.map((sp, i) => ({
        ...sp,
        lean: -0.55 + rng() * 1.1,
        fronds: 5 + Math.floor(rng() * 2),
        seed: rng() * 10,
      }))
    }

    const buildTwinkleStars = () => {
      const rng = mulberry32(99)
      return Array.from({ length: 12 }, () => ({
        x: rng() * W,
        y: rng() * Math.max(1, H * 0.3),
        r: 0.5 + rng() * 1.1,
        seed: rng() * 100,
      }))
    }

    const drawPalm = (b, palm, t, f, cx, cy) => {
      const base = project(palm.x, 0, palm.z, f, cx, cy)
      if (!base) return
      const s = base[2]
      const topPt = project(palm.x, palm.h, palm.z, f, cx, cy)
      if (!topPt) return
      const sway = reduced ? 0 : Math.sin(t * 0.6 + palm.seed) * 0.03
      const tx = topPt[0] + palm.lean * palm.h * s
      const ty = topPt[1]
      const ctrlX = (base[0] + tx) / 2 + palm.lean * palm.h * s * 0.4
      const ctrlY = base[1] - palm.h * s * 0.55

      b.save()
      b.translate(base[0], base[1])
      b.rotate(sway)
      b.translate(-base[0], -base[1])

      b.strokeStyle = '#03070f'
      b.lineWidth = Math.max(1.2, 0.16 * s)
      b.lineCap = 'round'
      b.beginPath()
      b.moveTo(base[0], base[1])
      b.quadraticCurveTo(ctrlX, ctrlY, tx, ty)
      b.stroke()

      // fronds
      const frondLen = (1.15 + 0.35 * palm.seed) * s
      for (let k = 0; k < palm.fronds; k++) {
        const ang = -Math.PI / 2 + ((k - (palm.fronds - 1) / 2) * Math.PI) / (palm.fronds + 1)
        const fx = tx + Math.cos(ang) * frondLen
        const fy = ty + Math.sin(ang) * frondLen * 0.85
        b.strokeStyle = '#03070f'
        b.lineWidth = Math.max(1, 0.09 * s)
        b.beginPath()
        b.moveTo(tx, ty)
        b.quadraticCurveTo(
          tx + Math.cos(ang) * frondLen * 0.55,
          ty + Math.sin(ang) * frondLen * 0.55 + frondLen * 0.12,
          fx,
          fy
        )
        b.stroke()
      }
      b.restore()
    }

    const drawStreak = (b, p, fwd, s, len, glow, core) => {
      const hx = fwd[0] * (len * s * 0.5)
      const hy = fwd[1] * (len * s * 0.5)
      b.globalCompositeOperation = 'lighter'
      b.strokeStyle = glow.color
      b.globalAlpha = glow.a
      b.lineWidth = Math.max(2, 1.1 * s)
      b.lineCap = 'round'
      b.beginPath()
      b.moveTo(p[0] - hx, p[1] - hy)
      b.lineTo(p[0] + hx, p[1] + hy)
      b.stroke()
      b.globalAlpha = core.a
      b.strokeStyle = core.color
      b.lineWidth = Math.max(1, 0.24 * s)
      b.beginPath()
      b.moveTo(p[0] - hx, p[1] - hy)
      b.lineTo(p[0] + hx, p[1] + hy)
      b.stroke()
      // bright head/tail dot
      b.fillStyle = core.color
      b.beginPath()
      b.arc(p[0] + fwd[0] * (len * s * 0.5), p[1] + fwd[1] * (len * s * 0.5), Math.max(0.8, 0.3 * s), 0, Math.PI * 2)
      b.fill()
      b.globalAlpha = 1
      b.globalCompositeOperation = 'source-over'
    }

    const drawBus = (b, t, f, cx, cy) => {
      const span = Z_FAR - Z_NEAR
      // offset 150 puts the bus at a readable distance in the static frame
      const zb = Z_FAR - frac((t * 15 + 150) / span) * span
      const a = interpAt(zb, f, cx, cy)
      const p = a.r
      const s = a.s
      const tan = laneTangent(zb, 'r')
      // motion direction = toward camera = down-screen
      const fwd = [-tan[0], -tan[1]]
      const L = 1.15 * s
      const Hb = 0.9 * s

      // underglow
      b.globalCompositeOperation = 'lighter'
      const ug = b.createRadialGradient(p[0], p[1], 0, p[0], p[1], Math.max(2, 0.8 * s))
      ug.addColorStop(0, 'rgba(16,185,129,0.20)')
      ug.addColorStop(1, 'rgba(16,185,129,0)')
      b.fillStyle = ug
      b.save()
      b.translate(p[0], p[1])
      b.scale(1, 0.35)
      b.beginPath()
      b.arc(0, 0, 0.85 * s, 0, Math.PI * 2)
      b.fill()
      b.restore()
      b.globalCompositeOperation = 'source-over'

      b.save()
      b.translate(p[0], p[1])
      b.rotate(Math.atan2(fwd[1], fwd[0]))
      // local +x = direction of travel (toward camera)

      // headlight beams
      b.globalCompositeOperation = 'lighter'
      for (const hy of [-0.2, -0.62]) {
        const beam = b.createRadialGradient(
          L / 2 + 0.1 * s, hy * s, 0, L / 2 + 0.1 * s, hy * s, 1.1 * s
        )
        beam.addColorStop(0, 'rgba(236,253,245,0.22)')
        beam.addColorStop(1, 'rgba(236,253,245,0)')
        b.fillStyle = beam
        b.beginPath()
        b.arc(L / 2 + 0.1 * s, hy * s, 1.1 * s, 0, Math.PI * 2)
        b.fill()
      }
      b.globalCompositeOperation = 'source-over'

      // wheels
      b.fillStyle = '#02060d'
      for (const wx of [-L / 2 + 0.22 * s, L / 2 - 0.24 * s]) {
        b.beginPath()
        b.arc(wx, 0.06 * s, Math.max(0.8, 0.2 * s), 0, Math.PI * 2)
        b.fill()
      }

      // body (rounded, facing camera)
      b.fillStyle = '#0a1526'
      b.beginPath()
      const rad = Math.max(0.8, 0.13 * s)
      const x0 = -L / 2
      const x1 = L / 2
      const yTop = -Hb
      const yBot = 0
      b.moveTo(x0 + rad, yTop)
      b.lineTo(x1 - rad, yTop)
      b.quadraticCurveTo(x1, yTop, x1, yTop + rad)
      b.lineTo(x1, yBot)
      b.lineTo(x0, yBot)
      b.lineTo(x0, yTop + rad)
      b.quadraticCurveTo(x0, yTop, x0 + rad, yTop)
      b.closePath()
      b.fill()

      // emerald roof rim
      b.strokeStyle = 'rgba(52,211,153,0.35)'
      b.lineWidth = Math.max(0.6, 0.05 * s)
      b.beginPath()
      b.moveTo(x0 + rad, yTop)
      b.lineTo(x1 - rad, yTop)
      b.stroke()

      // side stripe
      b.strokeStyle = 'rgba(52,211,153,0.28)'
      b.lineWidth = Math.max(0.5, 0.045 * s)
      b.beginPath()
      b.moveTo(x0 + 0.06 * s, -Hb * 0.5)
      b.lineTo(x1 - 0.32 * s, -Hb * 0.5)
      b.stroke()

      // windshield
      b.fillStyle = 'rgba(236,253,245,0.26)'
      b.beginPath()
      b.moveTo(x1 - 0.28 * s, yTop + 0.05 * s)
      b.lineTo(x1 - 0.1 * s, yTop + 0.05 * s)
      b.lineTo(x1 - 0.06 * s, yTop + 0.38 * s)
      b.lineTo(x1 - 0.3 * s, yTop + 0.38 * s)
      b.closePath()
      b.fill()

      // glowing route board (VyGo destination board)
      b.globalCompositeOperation = 'lighter'
      b.fillStyle = `rgba(16,185,129,${0.6 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.6))})`
      b.fillRect(x1 - 0.36 * s, yTop + 0.06 * s, 0.26 * s, 0.1 * s)
      b.globalCompositeOperation = 'source-over'

      // headlights
      b.globalCompositeOperation = 'lighter'
      for (const hy of [-0.2, -0.62]) {
        b.fillStyle = 'rgba(255,255,255,0.95)'
        b.beginPath()
        b.arc(x1 - 0.03 * s, hy * s, Math.max(0.6, 0.07 * s), 0, Math.PI * 2)
        b.fill()
      }
      b.globalCompositeOperation = 'source-over'

      b.restore()
    }

    /* ----- main render ----- */
    const drawScene = (t) => {
      if (W < 2 || H < 2 || !bg) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(bg, 0, 0, W, H)

      const f = st.f
      const cx = st.cx
      const cy = st.cy

      // soft horizon emerald pulse
      if (!reduced) {
        const pulse = 0.03 + 0.025 * Math.sin(t * 0.55)
        ctx.globalCompositeOperation = 'lighter'
        const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.5)
        hg.addColorStop(0, `rgba(16,185,129,${pulse})`)
        hg.addColorStop(1, 'rgba(16,185,129,0)')
        ctx.fillStyle = hg
        ctx.fillRect(0, cy - H * 0.2, W, H * 0.3)
        ctx.globalCompositeOperation = 'source-over'
      }

      // flowing centre-line dashes (constant world-space spacing; the whole
      // pattern streams toward the camera over time)
      const span = Z_FAR - Z_NEAR
      const startZ = Z_FAR - frac((t * DASH_FLOW) / span) * span
      ctx.lineCap = 'round'
      for (let zk = startZ; zk >= Z_NEAR; zk -= DASH_PERIOD) {
        let zB = zk - DASH_LEN
        if (zB < Z_NEAR) zB = Z_NEAR
        const a1 = interpAt(zk, f, cx, cy)
        const a2 = interpAt(zB, f, cx, cy)
        const width = Math.min(7, Math.max(1, 0.26 * ((a1.s + a2.s) / 2)))
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = 'rgba(16,185,129,0.4)'
        ctx.lineWidth = width * 2.4
        ctx.beginPath()
        ctx.moveTo(a1.c[0], a1.c[1])
        ctx.lineTo(a2.c[0], a2.c[1])
        ctx.stroke()
        ctx.strokeStyle = 'rgba(209,250,229,0.95)'
        ctx.lineWidth = width
        ctx.beginPath()
        ctx.moveTo(a1.c[0], a1.c[1])
        ctx.lineTo(a2.c[0], a2.c[1])
        ctx.stroke()
        ctx.globalCompositeOperation = 'source-over'
      }

      // light streams — cars
      for (const car of st.traffic.toward) {
        const z = Z_FAR - frac(car.phase + (t * car.speed) / span) * span
        const a = interpAt(z, f, cx, cy)
        const p = [a.r[0] + car.off * a.s, a.r[1]]
        const tan = laneTangent(z, 'r')
        const fwd = [-tan[0], -tan[1]]
        drawStreak(ctx, p, fwd, a.s, 2.6, { color: 'rgba(52,211,153,0.30)', a: 1 }, { color: PALETTE.mint, a: 0.95 })
      }
      for (const car of st.traffic.away) {
        const z = Z_NEAR + frac(car.phase + (t * car.speed) / span) * span
        const a = interpAt(z, f, cx, cy)
        const p = [a.l[0] + car.off * a.s, a.l[1]]
        const tan = laneTangent(z, 'l')
        const fwd = [-tan[0], -tan[1]] // glow trails toward the camera
        drawStreak(ctx, p, fwd, a.s, 2.0, { color: 'rgba(251,191,36,0.28)', a: 1 }, { color: PALETTE.amberPale, a: 0.9 })
      }

      // the bus (subtle silhouette + glowing headlights)
      drawBus(ctx, t, f, cx, cy)

      // palm silhouettes (foreground, gently swaying)
      for (const palm of st.palms) drawPalm(ctx, palm, t, f, cx, cy)

      // twinkling city windows
      if (!reduced) {
        ctx.globalCompositeOperation = 'lighter'
        for (const tw of st.twinkles) {
          const flicker = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.1 + tw.seed))
          ctx.globalAlpha = tw.warm ? flicker * 0.7 : flicker * 0.8
          ctx.fillStyle = tw.warm ? PALETTE.amber : PALETTE.emeraldBright
          ctx.fillRect(tw.x, tw.y, tw.w, tw.h)
        }
        // twinkling stars
        for (const s of st.twinkleStars) {
          const flicker = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.7 + s.seed))
          ctx.globalAlpha = flicker * 0.6
          ctx.fillStyle = '#e2e8f0'
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
      }

      // vignette + bottom fade
      if (vg) ctx.drawImage(vg, 0, 0, W, H)
    }

    /* ----- resize ----- */
    const resize = () => {
      const w = Math.max(1, canvas.clientWidth)
      const h = Math.max(1, canvas.clientHeight)
      if (w === W && h === H && bg) return
      W = w
      H = h
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildStatic()
      drawScene(reduced ? 0 : (performance.now() - startTime) / 1000)
    }

    /* ----- loop ----- */
    const frame = (ts) => {
      rafId = requestAnimationFrame(frame)
      if (document.hidden) return // tab hidden: pause rendering
      drawScene((ts - startTime) / 1000)
    }

    /* ----- listeners ----- */
    let ro = null
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(resize)
      ro.observe(canvas)
    }
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', resize) // redraw on return

    resize()

    if (!reduced) {
      rafId = requestAnimationFrame(frame)
    }

    return () => {
      cancelAnimationFrame(rafId)
      if (ro) ro.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', resize)
      bg = null
      vg = null
      st = null
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      role="presentation"
      style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
    />
  )
}
