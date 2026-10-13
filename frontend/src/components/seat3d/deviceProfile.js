import { useSyncExternalStore } from 'react'

/**
 * deviceProfile.js — one-time per-session device tier detection.
 *
 * Combines three signals:
 *   1. WebGL renderer string (sync, cheap)
 *   2. navigator.hardwareConcurrency (+ optional deviceMemory when present)
 *   3. a ~300ms raw-WebGL GPU benchmark (async, readback-stalled so it
 *      reflects real rasterization throughput)
 *
 * Result is cached at module scope so the benchmark runs exactly once per
 * session (SPA lifetime), and is exposed to every Seat3D/BusInterior3D via a
 * tiny external store + `useSyncExternalStore` — no context provider needed,
 * no prop drilling, and no per-frame work.
 *
 * Tiers:
 *   high — Bloom + SSAO + DOF, PCFSoft soft shadows, smooth shading
 *   mid  — Bloom only, PCF shadow map (baked-style look), smooth shading
 *   low  — flat-shaded, NO post-processing (composer passes inert / skipped),
 *          no per-seat shadow casting, dimmed interior light emissive
 */

export const DEVICE_TIERS = {
  HIGH: 'high',
  MID: 'mid',
  LOW: 'low',
}

/**
 * Emissive scale that keeps the orchestrator's always-mounted Bloom pass
 * (luminanceThreshold 0.9) inert for interior lights. Mirrors what the LOW
 * device tier already applies to lightMats so a mid-capped variant (Normal
 * bus, no premium trim to showcase) dims the same way on any device.
 */
export const BLOOM_SAFE_LIGHT_SCALE = 0.3

/**
 * effectiveTier(deviceTier, cap) — cap a device tier at a variant's effects
 * cap ('high' | 'mid'). Returns min(deviceTier, cap):
 *   - a 'low' device stays 'low' regardless of cap;
 *   - a 'high' device rendering a 'mid'-capped variant (Normal bus) behaves
 *     like 'mid' (no SSAO/DOF, smooth shading), and interior light emissive
 *     is additionally kept below the Bloom threshold via BLOOM_SAFE_LIGHT_SCALE.
 * The Frontend agent uses this same helper to cap the EffectComposer passes
 * in SeatSelect3D so the composer and the materials stay in lockstep.
 */
const TIER_ORDER = { low: 0, mid: 1, high: 2 }

export function effectiveTier(deviceTier, cap) {
  const d = TIER_ORDER[deviceTier]
  const c = TIER_ORDER[cap]
  if (d == null || c == null) return deviceTier
  return d <= c ? deviceTier : cap
}

const PRESETS = {
  high: {
    flatShading: false,
    softShadows: true,
    shadowMapType: 'soft',
    contactShadow: true,
    bloom: true,
    ssao: true,
    dof: true,
    lightEmissiveScale: 1,
  },
  mid: {
    flatShading: false,
    softShadows: false,
    shadowMapType: 'basic',
    contactShadow: true,
    bloom: true,
    ssao: false,
    dof: false,
    lightEmissiveScale: 1,
  },
  low: {
    flatShading: true,
    softShadows: false,
    shadowMapType: 'basic',
    contactShadow: true,
    bloom: false,
    ssao: false,
    dof: false,
    // Keep interior lights dim enough that the (always-mounted, orchestrator
    // owned) Bloom pass with luminanceThreshold 0.9 stays inert on low tier.
    lightEmissiveScale: BLOOM_SAFE_LIGHT_SCALE,
  },
}

function makePendingProfile() {
  return {
    tier: DEVICE_TIERS.LOW,
    pending: true,
    renderer: 'unknown',
    vendor: 'unknown',
    hardwareConcurrency: 0,
    deviceMemory: null,
    benchmark: null,
    ...PRESETS.low,
  }
}

let current = makePendingProfile()
let started = false
const subscribers = new Set()

function setProfile(next) {
  current = next
  subscribers.forEach((fn) => fn())
}

function subscribe(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

function getSnapshot() {
  return current
}

/* ------------------------------------------------------------------ *
 * Sync signals
 * ------------------------------------------------------------------ */

function detectRendererInfo() {
  if (typeof document === 'undefined') {
    return { ok: false, renderer: 'unknown', vendor: 'unknown' }
  }
  try {
    const canvas = document.createElement('canvas')
    const attrs = { failIfMajorPerformanceCaveat: false }
    const gl =
      canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs)
    if (!gl) return { ok: false, renderer: 'unknown', vendor: 'unknown' }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '')
    const vendor = ext ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '') : ''
    return { ok: true, renderer, vendor }
  } catch {
    return { ok: false, renderer: 'unknown', vendor: 'unknown' }
  }
}

function isSoftwareRenderer(renderer) {
  return /swiftshader|llvmpipe|software|microsoft basic render|basic render driver|angle \(microsoft/i.test(
    String(renderer || '')
  )
}

/* ------------------------------------------------------------------ *
 * ~300ms GPU benchmark (raw WebGL, readback-stalled)
 * ------------------------------------------------------------------ */

function runGpuBenchmark(maxMs = 300) {
  if (typeof document === 'undefined') {
    return Promise.resolve({ fps: 0, frames: 0, ms: 0 })
  }
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 320
      const attrs = {
        antialias: false,
        depth: false,
        stencil: false,
        alpha: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      }
      const gl =
        canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs)
      if (!gl) {
        resolve({ fps: 0, frames: 0, ms: 0 })
        return
      }

      const vs = [
        'attribute vec2 aPos;',
        'attribute vec3 aCol;',
        'uniform float uTime;',
        'varying vec3 vCol;',
        'void main() {',
        '  vec2 p = aPos;',
        '  p.x += sin(uTime * 2.0 + p.y * 8.0) * 0.35;',
        '  p.y += cos(uTime * 1.7 + p.x * 8.0) * 0.35;',
        '  gl_Position = vec4(p, 0.0, 1.0);',
        '  vCol = aCol;',
        '}',
      ].join('\n')
      const fs = [
        'precision mediump float;',
        'varying vec3 vCol;',
        'void main() { gl_FragColor = vec4(vCol, 1.0); }',
      ].join('\n')

      const compile = (type, src) => {
        const s = gl.createShader(type)
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          throw new Error('benchmark shader compile failed')
        }
        return s
      }
      const program = gl.createProgram()
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vs))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('benchmark program link failed')
      }
      gl.useProgram(program)

      const TRI = 20000 // 20k triangles => 60k vertices
      const verts = new Float32Array(TRI * 3 * 2)
      const cols = new Float32Array(TRI * 3 * 3)
      for (let i = 0; i < TRI * 3; i++) {
        verts[i * 2] = Math.random() * 2 - 1
        verts[i * 2 + 1] = Math.random() * 2 - 1
        cols[i * 3] = 0.2 + 0.8 * Math.random()
        cols[i * 3 + 1] = 0.2 + 0.8 * Math.random()
        cols[i * 3 + 2] = 0.2 + 0.8 * Math.random()
      }
      const vb = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, vb)
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
      const cb = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, cb)
      gl.bufferData(gl.ARRAY_BUFFER, cols, gl.STATIC_DRAW)

      const locPos = gl.getAttribLocation(program, 'aPos')
      const locCol = gl.getAttribLocation(program, 'aCol')
      const locTime = gl.getUniformLocation(program, 'uTime')
      gl.bindBuffer(gl.ARRAY_BUFFER, vb)
      gl.enableVertexAttribArray(locPos)
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, cb)
      gl.enableVertexAttribArray(locCol)
      gl.vertexAttribPointer(locCol, 3, gl.FLOAT, false, 0, 0)

      // readPixels stalls the pipeline so the frame counter reflects actual
      // rasterization throughput (not just CPU-side draw submission).
      const px = new Uint8Array(4)
      const t0 = performance.now()
      let frames = 0
      while (performance.now() - t0 < maxMs && frames < 1000) {
        gl.uniform1f(locTime, t0 * 0.001 + frames * 0.016)
        gl.drawArrays(gl.TRIANGLES, 0, TRI * 3)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
        frames++
      }
      const ms = performance.now() - t0
      const fps = frames / (ms / 1000)
      resolve({ fps: Math.round(fps * 10) / 10, frames, ms: Math.round(ms) })
    } catch {
      resolve({ fps: 0, frames: 0, ms: 0 })
    }
  })
}

/* ------------------------------------------------------------------ *
 * Tier combination
 * ------------------------------------------------------------------ */

function computeTier(info, bench) {
  if (!info.ok || isSoftwareRenderer(info.renderer)) return DEVICE_TIERS.LOW

  let score = 0
  if (info.hardwareConcurrency >= 8) score += 2
  else if (info.hardwareConcurrency >= 4) score += 1

  if (info.deviceMemory != null) {
    if (info.deviceMemory >= 8) score += 1
    else if (info.deviceMemory < 2) score -= 1
  }

  if (bench && bench.frames > 0) {
    if (bench.fps >= 45) score += 2
    else if (bench.fps >= 20) score += 1
    else score -= 2
  }

  if (score >= 5) return DEVICE_TIERS.HIGH
  if (score >= 3) return DEVICE_TIERS.MID
  return DEVICE_TIERS.LOW
}

function buildProfile(tier, info, bench) {
  return {
    tier,
    pending: false,
    renderer: info.renderer,
    vendor: info.vendor,
    hardwareConcurrency: info.hardwareConcurrency,
    deviceMemory: info.deviceMemory,
    benchmark: bench,
    ...PRESETS[tier],
  }
}

async function runDetection() {
  const info = {
    ...detectRendererInfo(),
    hardwareConcurrency:
      (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 0,
    deviceMemory:
      typeof navigator !== 'undefined' && navigator.deviceMemory != null
        ? navigator.deviceMemory
        : null,
  }
  const bench = await runGpuBenchmark()
  const tier = computeTier(info, bench)
  setProfile(buildProfile(tier, info, bench))
}

/** Kick off detection once per session. Idempotent — safe to call from render. */
export function ensureDeviceProfile() {
  if (started) return
  started = true
  runDetection()
}

/** Sync getter — returns the current (possibly pending) profile object. */
export function getDeviceProfile() {
  return current
}

/**
 * React hook. Returns the device profile, initially the conservative LOW
 * default, upgrading once the ~300ms benchmark resolves (all subscribers
 * re-render in a single batch).
 */
export function useDeviceProfile() {
  ensureDeviceProfile()
  return useSyncExternalStore(subscribe, getSnapshot)
}
