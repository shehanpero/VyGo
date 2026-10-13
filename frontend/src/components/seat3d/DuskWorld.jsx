import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useDeviceProfile } from './deviceProfile'

/* ─────────────────────────────────────────────────────────────────────
 * DuskWorld — the cinematic "expressway at dusk" stage that surrounds
 * the bus in the seat-select 3D view (and behind the boarding intro).
 *
 * One procedural backdrop replaces the flat void: gradient sky with a
 * lavender dusk band, a sunk amber/emerald sun, a distant expressway
 * bridge with twinkling lights, horizon haze — the same palette
 * language as the SVG hero (night #020617 · emerald #10b981 · amber
 * #fcd34d · lavender dusk). Below it: an asphalt ground disc that
 * receives the key-light shadow (the bus casts a real soft shadow on
 * the stage), plus a wet-asphalt additive sheen.
 *
 * A procedural PMREM environment map (CanvasTexture → PMREMGenerator,
 * zero network, zero new deps) gives the shell chrome / glass / seat
 * clearcoat something real to reflect; an amber rim light keys the
 * dusk sun from behind-left of the settle camera so the bus reads
 * back-lit during the turntable intro.
 *
 * Tier rules (deviceProfile, respected via the orchestrator's
 * effectiveTier cap):
 *   high — env map, rim light, horizon pulse, bridge twinkles
 *   mid  — env map + rim light + static haze (no pulse/twinkles)
 *   low  — backdrop + ground + faint pool only (flat-shader safe)
 * `reducedMotion` additionally freezes the twinkles/pulse.
 * ───────────────────────────────────────────────────────────────────── */

/** Deterministic PRNG so the baked textures look the same every load. */
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
 * Procedural textures — built once, shared module-scope (the same
 * pattern ContactShadowBlob uses in tieredEffects.jsx). The backdrop
 * canvas is laid out so the horizon sits at ~96% height: the plane's
 * bottom edge (v = 0) is the world ground line, the sky fills the top.
 * ------------------------------------------------------------------ */

let skyTexture = null

function getSkyTexture() {
  if (skyTexture) return skyTexture
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const g = c.getContext('2d')
  const H = 491 // horizon line — bottom ~4% is the far-ground strip

  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0.0, '#020617') // night — matches the clear color, seamless edge
  grad.addColorStop(0.45, '#0b1424')
  grad.addColorStop(0.7, '#141d33')
  grad.addColorStop(0.84, '#1d2440')
  grad.addColorStop(0.92, '#33294f') // lavender dusk band
  grad.addColorStop(0.965, '#1f443e') // emerald haze kiss at the horizon
  grad.addColorStop(1.0, '#18323a')
  g.fillStyle = grad
  g.fillRect(0, 0, 1024, H)

  // stars — upper half of the sky only (above the dusk band)
  const rng = mulberry32(20260807)
  for (let i = 0; i < 90; i++) {
    const x = rng() * 1024
    const y = rng() * 220
    g.globalAlpha = 0.15 + rng() * 0.5
    g.fillStyle = '#e2e8f0'
    g.beginPath()
    g.arc(x, y, 0.4 + rng() * 1.1, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1

  // dusk sun — sunk just at the horizon, azimuth ~225° (behind-left of
  // the settle camera, aligned with the rim light)
  const sunX = 148
  const sunY = 487
  const sunR = 40
  const halo = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3.1)
  halo.addColorStop(0, 'rgba(255,247,237,0.95)')
  halo.addColorStop(0.18, 'rgba(252,211,77,0.5)')
  halo.addColorStop(0.45, 'rgba(16,185,129,0.16)')
  halo.addColorStop(1, 'rgba(16,185,129,0)')
  g.fillStyle = halo
  g.beginPath()
  g.arc(sunX, sunY, sunR * 3.1, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,247,237,0.95)'
  g.beginPath()
  g.arc(sunX, sunY, sunR, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#fde68a'
  g.beginPath()
  g.arc(sunX, sunY, sunR * 0.55, 0, Math.PI * 2)
  g.fill()

  // distant expressway bridge — deck, cable, pillars, lit dots (static
  // base; the high-tier BridgeTwinkles layer adds the moving sparkle)
  g.fillStyle = 'rgba(10,21,38,0.9)'
  g.fillRect(420, 486, 520, 3) // deck along the horizon
  g.fillStyle = 'rgba(148,163,184,0.14)'
  g.fillRect(420, 480, 520, 1) // upper cable hint
  g.fillStyle = 'rgba(10,21,38,0.8)'
  for (let i = 0; i < 6; i++) {
    const px = 470 + i * 90
    g.fillRect(px, 478, 3, 12) // pillars, sinking into the haze
  }
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12
    const bx = 440 + t * 480
    const by = 480 - Math.sin(t * Math.PI) * 4
    g.fillStyle = i % 3 ? 'rgba(252,211,77,0.8)' : 'rgba(52,211,153,0.75)'
    g.beginPath()
    g.arc(bx, by, 2, 0, Math.PI * 2)
    g.fill()
  }

  // horizon haze — emerald lift fading up into the lavender band
  const haze = g.createLinearGradient(0, 460, 0, 492)
  haze.addColorStop(0, 'rgba(52,211,153,0.12)')
  haze.addColorStop(0.55, 'rgba(148,120,200,0.10)')
  haze.addColorStop(1, 'rgba(52,211,153,0)')
  g.fillStyle = haze
  g.fillRect(0, 458, 1024, 34)

  // far-ground strip below the horizon (visible past the disc edge)
  const ground = g.createLinearGradient(0, H, 0, 512)
  ground.addColorStop(0, '#0a1322')
  ground.addColorStop(0.4, '#060c17')
  ground.addColorStop(1, '#03070f')
  g.fillStyle = ground
  g.fillRect(0, H, 1024, 512 - H)

  skyTexture = new THREE.CanvasTexture(c)
  skyTexture.needsUpdate = true
  return skyTexture
}

let groundTexture = null

/** Asphalt disc map — dark base with a faint emerald/amber center glow
 *  so the stage reads "lit asphalt under the dusk sky". */
function getGroundTexture() {
  if (groundTexture) return groundTexture
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')
  g.fillStyle = '#070d1a'
  g.fillRect(0, 0, 512, 512)
  const rg = g.createRadialGradient(256, 256, 8, 256, 256, 250)
  rg.addColorStop(0, 'rgba(16,185,129,0.10)')
  rg.addColorStop(0.4, 'rgba(16,185,129,0.05)')
  rg.addColorStop(0.7, 'rgba(252,211,77,0.03)')
  rg.addColorStop(1, 'rgba(16,185,129,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, 512, 512)
  groundTexture = new THREE.CanvasTexture(c)
  groundTexture.needsUpdate = true
  return groundTexture
}

let horizonGlowTexture = null

/** getHorizonGlowTexture — additive haze wall used by HorizonPulse and
 *  the wet-asphalt sheen. Bright emerald at the bottom (world far edge
 *  after the plane is laid flat), lavender lift above. */
function getHorizonGlowTexture() {
  if (horizonGlowTexture) return horizonGlowTexture
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')
  const vg = g.createLinearGradient(0, 128, 0, 0)
  vg.addColorStop(0, 'rgba(52,211,153,0.34)')
  vg.addColorStop(0.45, 'rgba(148,120,200,0.16)')
  vg.addColorStop(1, 'rgba(52,211,153,0)')
  g.fillStyle = vg
  g.fillRect(0, 0, 512, 128)
  horizonGlowTexture = new THREE.CanvasTexture(c)
  horizonGlowTexture.needsUpdate = true
  return horizonGlowTexture
}

let dotTexture = null

/** getDotTexture — tiny radial dot for the Points twinkle layers. */
function getDotTexture() {
  if (dotTexture) return dotTexture
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const g = c.getContext('2d')
  const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  rg.addColorStop(0, 'rgba(255,255,255,1)')
  rg.addColorStop(0.4, 'rgba(255,255,255,0.55)')
  rg.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, 32, 32)
  dotTexture = new THREE.CanvasTexture(c)
  dotTexture.needsUpdate = true
  return dotTexture
}

let envTexture = null

/** getEnvTexture — a tiny procedural equirectangular sky (256×128) used
 *  as the PMREM environment map. Amber + emerald horizon glows and a row
 *  of bright dots become the "light booth" reflections on the shell
 *  chrome, glass and premium seat clearcoat. */
function getEnvTexture() {
  if (envTexture) return envTexture
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, '#020617')
  grad.addColorStop(0.4, '#0b1424')
  grad.addColorStop(0.66, '#1a2340')
  grad.addColorStop(0.78, '#332a55')
  grad.addColorStop(0.84, '#1c4a40')
  grad.addColorStop(0.9, '#0d2f2a')
  grad.addColorStop(1, '#050b16')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 128)
  // soft horizon glows — the specular "light booth" reflections
  let e = g.createRadialGradient(52, 104, 0, 52, 104, 40)
  e.addColorStop(0, 'rgba(52,211,153,0.5)')
  e.addColorStop(1, 'rgba(52,211,153,0)')
  g.fillStyle = e
  g.fillRect(0, 64, 128, 64)
  e = g.createRadialGradient(204, 104, 0, 204, 104, 44)
  e.addColorStop(0, 'rgba(252,211,77,0.42)')
  e.addColorStop(1, 'rgba(252,211,77,0)')
  g.fillStyle = e
  g.fillRect(128, 64, 128, 64)
  // tiny bright dots for the chrome sparkle
  for (let i = 0; i < 14; i++) {
    const x = 8 + i * 18
    g.fillStyle = i % 2 ? 'rgba(252,211,77,0.9)' : 'rgba(52,211,153,0.85)'
    g.beginPath()
    g.arc(x, 104 + (i % 3) * 3, 1.6, 0, Math.PI * 2)
    g.fill()
  }
  envTexture = new THREE.CanvasTexture(c)
  envTexture.colorSpace = THREE.SRGBColorSpace
  envTexture.mapping = THREE.EquirectangularReflectionMapping
  envTexture.needsUpdate = true
  return envTexture
}

/* ------------------------------------------------------------------ *
 * Components
 * ------------------------------------------------------------------ */

/** ProceduralEnvironment — builds a PMREM env map from the tiny
 *  equirect canvas once. One-time cost at mount; `scene.environment` is
 *  restored to null on unmount so low-tier remounts stay flat. */
function ProceduralEnvironment({ enabled }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    if (!enabled) return
    const tex = getEnvTexture()
    if (!tex) return
    const pmrem = new THREE.PMREMGenerator(gl)
    const rt = pmrem.fromEquirectangular(tex)
    pmrem.dispose()
    scene.environment = rt.texture
    return () => {
      scene.environment = null
      rt.texture.dispose()
    }
  }, [gl, scene, enabled])
  return null
}

/** BridgeTwinkles — distant expressway light dots (one additive Points
 *  draw call) that breathe at a slow phase. Rendered twice with offset
 *  phases so the bridge feels alive without per-point shaders. */
function BridgeTwinkles({ phase = 0, seed = 7, x = 0, y = 0.9, z = -31.6, count = 18, width = 46 }) {
  const { geometry, material } = useMemo(() => {
    const rng = mulberry32(seed)
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rng() * 2 - 1) * (width / 2)
      pos[i * 3 + 1] = 0.35 + rng() * 1.5
      pos[i * 3 + 2] = 0
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const material = new THREE.PointsMaterial({
      color: seed % 2 ? '#fcd34d' : '#34d399',
      size: 0.42,
      map: getDotTexture(),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    return { geometry, material }
  }, [count, width, seed])
  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])
  useFrame(({ clock }) => {
    material.opacity = 0.5 + 0.35 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 1.15 + phase))
  })
  return <points geometry={geometry} material={material} position={[x, y, z]} />
}

/** HorizonPulse — additive haze wall above the ground line, slowly
 *  breathing so the stage feels like the hero's dawn (high tier only). */
function HorizonPulse() {
  const matRef = useRef()
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.5 + 0.16 * Math.sin(clock.elapsedTime * 0.55)
    }
  })
  return (
    <mesh position={[0, 1.7, -30.6]}>
      <planeGeometry args={[84, 7]} />
      <meshBasicMaterial
        ref={matRef}
        map={getHorizonGlowTexture()}
        transparent
        opacity={0.62}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/**
 * DuskWorld — mount inside the seat-select <Canvas>. `tier` is the
 * orchestrator's effectiveTier (already variant-capped); it falls back
 * to the raw device profile when omitted.
 */
export default function DuskWorld({ tier, reducedMotion = false }) {
  const profile = useDeviceProfile()
  const effTier = tier || profile.tier
  const high = effTier === 'high'
  const midUp = effTier !== 'low'
  const rimI = high ? 0.85 : midUp ? 0.6 : 0.35
  return (
    <group>
      <ProceduralEnvironment enabled={midUp} />

      {/* Sky backdrop — one crisp draw call. Fog is disabled so the dusk
          gradient never washes out; the top stop (#020617) matches the
          canvas clear color, so the plane edge is seamless. */}
      <mesh position={[0, 13, -32]}>
        <planeGeometry args={[90, 26]} />
        <meshBasicMaterial map={getSkyTexture()} fog={false} toneMapped={false} />
      </mesh>

      {/* Horizon haze wall (mid+); bridge twinkles (high, not reduced). */}
      {midUp && <HorizonPulse />}
      {high && !reducedMotion && <BridgeTwinkles phase={0} seed={7} x={14} y={1.7} z={-31.6} />}
      {high && !reducedMotion && <BridgeTwinkles phase={2.1} seed={13} x={14} y={1.7} z={-31.5} />}

      {/* Asphalt ground disc — receives the key-light shadow so the bus
          casts a real soft shadow onto the stage. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial
          map={getGroundTexture()}
          roughness={0.92}
          metalness={0}
          envMapIntensity={0.25}
        />
      </mesh>

      {/* Wet-asphalt sheen (high tier) — additive echo of the horizon
          glow pooling at the far edge, reads as a lit, dew-wet surface. */}
      {high && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 0]}>
          <circleGeometry args={[26, 48]} />
          <meshBasicMaterial
            map={getHorizonGlowTexture()}
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Amber rim light — the dusk sun behind-left keys the shell edges
          and the GLB's body creases during the 360° intro turntable. */}
      <directionalLight position={[-7, 6, -8]} intensity={rimI} color="#ffdcb0" />
    </group>
  )
}