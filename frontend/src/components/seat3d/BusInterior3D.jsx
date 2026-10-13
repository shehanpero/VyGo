import { memo, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, useGLTF } from '@react-three/drei'
import Seat3D from './Seat3D'
import { computeLayout, getSeatCategory, seatPositionFor } from './seatMeta'
import { useDeviceProfile, effectiveTier, BLOOM_SAFE_LIGHT_SCALE } from './deviceProfile'

const INTERIOR_COLORS = {
  panel: '#26324a',
  floor: '#1b2536',
  aisle: '#0f1826',
  ceiling: '#1b2536',
  metal: '#94a3b8',
  curtain: '#5b3345',
  glass: '#a8c6e8',
  dark: '#0b101c',
  accent: '#2a3854',
}

/* Shared variant contract (Fleet Variant Upgrade). The Frontend agent passes
 * a `variant` object shaped like DEFAULT_VARIANT; a missing `variant` defaults
 * to Express so existing callers (e.g. SeatSelect3D before wiring) are
 * untouched. Placement math is NOT duplicated here — seatMeta.computeLayout
 * stays the single source of truth (busType 'NORMAL' already yields 2+3).
 *
 * Fields consumed:
 *   serviceClass    'express' | 'normal'   -> Seat3D geometry (recliner/bench)
 *   layout          '2+2' | '2+3'          -> informational; aisle strip width
 *   materialPreset  'premium' | 'standard' -> interior trim + seat material
 *   effectsTierCap  'high' | 'mid'         -> caps device tier at 'mid' for
 *                                             Normal (no bloom/DOF showcase)
 *   interiorWidth   number (default 2.34)  -> floor/ceiling/panel widths
 *   modelScale      number (default 1)     -> GLB scale (shipped GLBs are
 *                                             pre-baked to meters/pose)
 *   modelRotation   [x,y,z] (default 0)    -> GLB Euler rotation override
 *   modelPosition   [x,y,z] (default 0)    -> GLB translation override
 */
export const DEFAULT_VARIANT = {
  serviceClass: 'express',
  layout: '2+2',
  materialPreset: 'premium',
  effectsTierCap: 'high',
  interiorWidth: 2.34,
  modelScale: 1,
  modelRotation: [0, 0, 0],
  modelPosition: [0, 0, 0],
}

// Base emissive intensities for the interior lights (scaled per device tier).
const LIGHT_BASE = { ceiling: 2.2, exit: 1.6, doorSign: 1.4, accent: 1.5, aisle: 1.15 }

const FALLBACK_ANIM = { shell: 1, door: 0, yaw: 0 }

/* Wheel material hoisted to module scope — shared by all 4 Wheel meshes and
 * avoids creating a new meshStandardMaterial per Wheel per render. The
 * envMapIntensity lets the DuskWorld env map read the dusk sky in the tire
 * shoulders (0.5 keeps it subtle on the near-black rubber). */
const WHEEL_MAT = new THREE.MeshStandardMaterial({
  color: '#0a0a0a',
  roughness: 0.9,
  metalness: 0,
  envMapIntensity: 0.5,
})

/* Shared procedural geometries. R3F's <XGeometry args={...}> JSX instantiates a
 * fresh THREE geometry object for every mesh that uses it, so the wheels
 * (4×), hub caps (4×) and vertical grab poles (≤8×) were uploading duplicate
 * vertex buffers to the GPU. Hoisting them to module scope lets all instances
 * share one geometry each — fewer allocations, less upload, zero visual
 * change. Like WHEEL_MAT they live for the module lifetime (cheap, reused). */
const WHEEL_GEOM = new THREE.CylinderGeometry(0.52, 0.52, 0.3, 20)
const HUB_GEOM = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24)
const POLE_GEOM = new THREE.CylinderGeometry(0.025, 0.025, 2.0, 10)

/* Stage light pool — shared radial CanvasTexture (module scope, same
 * pattern as ContactShadowBlob in tieredEffects.jsx). An additive
 * emerald/amber ellipse painted under the bus on the DuskWorld ground:
 * reads as the dusk light spilling under the chassis + a subtle fake
 * ground reflection. One transparent draw call, zero per-frame cost. */
let stagePoolTexture = null

function getStagePoolTexture() {
  if (stagePoolTexture) return stagePoolTexture
  if (typeof document === 'undefined') return null
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const rg = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  rg.addColorStop(0, 'rgba(16,185,129,0.34)')
  rg.addColorStop(0.35, 'rgba(52,211,153,0.16)')
  rg.addColorStop(0.6, 'rgba(252,211,77,0.07)')
  rg.addColorStop(1, 'rgba(16,185,129,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, size, size)
  stagePoolTexture = new THREE.CanvasTexture(c)
  stagePoolTexture.needsUpdate = true
  return stagePoolTexture
}

function Wheel({ x, z }) {
  return (
    <mesh geometry={WHEEL_GEOM} position={[x, 0.52, z]} rotation={[0, 0, Math.PI / 2]} castShadow material={WHEEL_MAT} />
  )
}

/**
 * LoadedBusModel — Renders a GLB bus model instead of the procedural shell.
 * The scene is cloned once and all mesh materials are set to transparent so the
 * parent's useFrame shell-opacity animation works identically to the
 * procedural path. Shadows are enabled on all meshes.
 *
 * @param {string} glbPath  - Path to the .glb file (served from /assets/, the
 *                            root-level assets folder)
 * @param {React.RefObject<number>} shellOpacityRef - Ref whose .current holds
 *   the live shell opacity (0–1) driven by busAnim. Read every frame via
 *   useFrame so the value is never stale.
 * @param {number} scale    - Uniform scale factor (model-unit → scene-unit)
 * @param {[number,number,number]} rotation - Euler rotation [x,y,z]
 * @param {[number,number,number]} position - Translation offset [x,y,z]
 */
function LoadedBusModel({
  glbPath,
  shellOpacityRef,
  scale = 1,
  rotation = [0, 0, 0],
  position = [0, 0, 0],
}) {
  const { scene } = useGLTF(glbPath, true)

  // Clone once so we own the material references for per-frame updates.
  // Also cache the flat mesh list so useFrame avoids traverse() every frame.
  //
  // IMPORTANT — environment geometry strip. Some shipped .glb files (notably
  // viking.glb) are NOT bus-only: the coach was exported sitting *inside* a
  // large authoring "stage" — a giant surrounding box (viking's node#0 is
  // ≈189.8 × 185.5 × 819 authoring units), oversized backdrop planes, light-rig
  // cylinders and scaled collider boxes. Unfiltered, that stage renders as a
  // huge dark slab beside/in front of the bus. We keep only meshes whose
  // world-space size matches the bus cluster and dispose every outsized
  // environment piece. The cut-off is relative to the model's own median mesh
  // size (bus parts ≈ median; stage ≈ 1.5x+), so it is invariant to the
  // uniform group scale/rotation applied below and works for any loaded model:
  //   - yutong-c12.glb = one clean 7.5-unit bus mesh  → always kept
  //   - viking.glb     = body/wheels (≤ ~137 units)   → kept
  //                      stage/planes/colliders (161 → 861) → dropped
  const { cloned, meshes } = useMemo(() => {
    const s = scene.clone(true)

    // Bounds helpers reused per mesh (avoid allocating during traverse).
    const _box = new THREE.Box3()
    const _size = new THREE.Vector3()
    const worldDiag = (mesh) => {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
      _box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld)
      _box.getSize(_size)
      return _size.length()
    }

    // World matrices come from the GLB hierarchy itself (the bus is a sibling
    // of the stage geometry, never a child of it) so stripping is safe even if
    // we detach nodes mid-scene.
    s.updateWorldMatrix(true, true)

    const entries = []
    s.traverse((child) => {
      if (child.isMesh) entries.push({ child, d: worldDiag(child) })
    })

    // Keep meshes up to 1.5x the median world diagonal — the bus cluster — and
    // treat anything far larger as environment/collision/backdrop debris.
    const sorted = entries.map((e) => e.d).sort((a, b) => a - b)
    const median = entries.length ? sorted[Math.floor(sorted.length / 2)] : 0
    const keepBelow = Math.max(entries.length ? median * 1.5 : 0, 8)

    for (const { child, d } of entries) {
      if (d <= keepBelow) continue
      if (child.geometry) child.geometry.dispose()
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      for (const m of mats) m.dispose()
      child.removeFromParent()
    }

    // Configure the surviving bus meshes: transparent-ready for the opacity
    // anim, DoubleSide for inward-facing panels, and shadow-ready.
    const meshList = []
    for (const { child } of entries) {
      if (child.parent === null) continue // was stripped as environment
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      for (const m of mats) {
        if (!m.transparent) m.transparent = true
        m.side = THREE.DoubleSide
        m.needsUpdate = true
      }
      child.castShadow = true
      child.receiveShadow = true
      meshList.push(child)
    }
    return { cloned: s, meshes: meshList }
  }, [scene])

  // Dispose the cloned scene on unmount to avoid GPU memory leak.
  useEffect(() => {
    return () => {
      cloned.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose()
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          for (const m of mats) m.dispose()
        }
      })
    }
  }, [cloned])

  // Drive per-material opacity from the parent's ref every frame.
  // Using a ref (not a prop) avoids the stale-closure problem — .current
  // is always the latest shell value written by the parent's useFrame.
  useFrame(() => {
    const opacity = Math.max(0, Math.min(1, shellOpacityRef?.current ?? 1))
    for (let i = 0; i < meshes.length; i++) {
      const mats = meshes[i].material
      if (Array.isArray(mats)) {
        for (let j = 0; j < mats.length; j++) mats[j].opacity = opacity
      } else {
        mats.opacity = opacity
      }
    }
  })

  return (
    <group scale={scale} rotation={rotation} position={position}>
      <primitive object={cloned} />
    </group>
  )
}

export default memo(function BusInterior3D({
  seats = [],
  capacity = 40,
  busType = 'LUXURY',
  selected = [],
  focusedNumber = null,
  maxSelection = 6,
  onSeatSelect,
  busAnim,
  showShell = false,
  reducedMotion = false,
  variant = null,
}) {
  const shellGroupRef = useRef(null)
  const interiorGroupRef = useRef(null)
  const doorLeafFrontRef = useRef(null)
  const doorLeafRearRef = useRef(null)
  // Live shell opacity value — read by LoadedBusModel's useFrame.
  const shellOpacityRef = useRef(1)

  const profile = useDeviceProfile()
  const gl = useThree((s) => s.gl)

  // Resolve the variant object; a missing/partial `variant` falls back to
  // Express (current behavior). Only the scalar fields below are consumed, so
  // the memo deps stay stable regardless of the object's identity.
  const variantObj = useMemo(
    () => (variant ? { ...DEFAULT_VARIANT, ...variant } : DEFAULT_VARIANT),
    [variant]
  )
  const isNormal = variantObj.serviceClass === 'normal'
  const materialPreset = variantObj.materialPreset === 'standard' ? 'standard' : 'premium'
  const effectsTierCap = variantObj.effectsTierCap === 'mid' ? 'mid' : 'high'
  // Whether we have a real 3D model to render as the bus shell.
  const hasModel = Boolean(variantObj.glbPath)
  const interiorW =
    Number.isFinite(variantObj.interiorWidth) && variantObj.interiorWidth > 0
      ? variantObj.interiorWidth
      : DEFAULT_VARIANT.interiorWidth
  const halfW = interiorW / 2
  // Presentation-only aisle strip width per layout (seatMeta owns the real
  // layout math; this just matches the strip visual to the 2+2 vs 2+3 aisle).
  const aisleW = variantObj.layout === '2+3' || isNormal ? 0.3 : 0.6

  // ── Per-variant shell dimensions ──────────────────────────────────────────
  // Express (Yutong C12 Pro): 12 000 × 2 550 × 3 840 mm
  // Normal (Ashok Leyland Viking): ~11.2 × 2.5 × 3.1 m (proportional, no
  // official L/W/H published — flagged assumption).
  const shellW = 2.55
  const shellH = isNormal ? 3.1 : 3.84
  const shellL = isNormal ? 11.2 : 12.0
  const shellHalfL = shellL / 2
  const shellBodyY = shellH / 2
  const roofH = 0.35
  const roofY = shellH + roofH / 2

  // Wheelbase + overhangs (real C12: WB 6050 mm, OH 2620/3330 mm; Viking ~5600 WB)
  const frontAxleZ = isNormal ? -2.8 : -3.0
  const rearAxleZ = isNormal ? 2.8 : 3.0
  const frontBumperZ = isNormal ? -4.5 : -5.6
  const rearBumperZ = isNormal ? 5.5 : 6.4

  // Door position: Express = behind front axle (coach mid-door),
  // Normal = ahead of front axle (front-engine Viking trait).
  const doorBaseFrontZ = isNormal ? -3.6 : -2.3
  const doorBaseRearZ = isNormal ? -3.15 : -1.85
  const doorFrameBaseZ = isNormal ? -3.38 : -2.08

  // Windshield: Express = raked two-piece coach; Normal = near-vertical mask.
  const windshieldZ = isNormal ? -4.45 : -5.55
  const windshieldAngle = isNormal ? 0.08 : 0.22

  // Interior span derived from seat positions (ROW_START_Z = -4.15, pitch 0.85)
  const firstSeatZ = -4.15
  const interiorSpan = isNormal ? 10.4 : 12.1
  const interiorCenterZ = firstSeatZ + interiorSpan / 2

  // Window Zs — 6 evenly across the body, clamped inside the shell
  const windowZs = useMemo(() => {
    const start = firstSeatZ - 0.1
    // Clamp end inside shell body (Express shell rear = 6.0, Normal = 5.6)
    // minus half window length (0.7) to prevent windows floating outside body.
    const end = isNormal ? 4.9 : 5.3
    const count = isNormal ? 6 : 8
    return Array.from({ length: count }, (_, i) => start + (i / (count - 1)) * (end - start))
  }, [isNormal])

  // Effective tier after the variant's effects cap ('mid' for Normal). Keeps
  // the shadow map, flat shading and light emissive in lockstep with the
  // composer cap the Frontend agent wires in SeatSelect3D (same helper).
  const effTier = effectiveTier(profile.tier, effectsTierCap)
  const softShadows = effTier === 'high'

  // Tiered shadow map: soft PCFSoft on high, cheaper PCF elsewhere (baked-style
  // look). The orchestrator's <Canvas shadows> already enables the shadow map.
  useEffect(() => {
    const type = softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap
    if (gl.shadowMap.type !== type) {
      gl.shadowMap.type = type
      gl.shadowMap.needsUpdate = true
    }
  }, [softShadows, gl])

  // Interior light materials, hoisted so the tier's lightEmissiveScale can be
  // applied every frame without re-creating materials. Low tier dims these
  // below the composer Bloom's 0.9 luminance threshold (Bloom stays inert).
  // Normal gets a flatter, whiter ceiling strip (no premium ombre tint); its
  // emissive is still capped below Bloom by effectsTierCap in useFrame.
  const lightMats = useMemo(() => {
    const premium = materialPreset === 'premium'
    const ceiling = new THREE.MeshStandardMaterial({
      color: premium ? '#e0f2fe' : '#f8fafc',
      emissive: premium ? '#dbeafe' : '#f1f5f9',
      emissiveIntensity: LIGHT_BASE.ceiling,
    })
    const exit = new THREE.MeshStandardMaterial({ color: '#052e16', emissive: '#4ade80', emissiveIntensity: LIGHT_BASE.exit })
    const doorSign = new THREE.MeshStandardMaterial({ color: '#0e7490', emissive: '#22d3ee', emissiveIntensity: LIGHT_BASE.doorSign })
    // Warm aisle edge LED — dusk-cabin mood light along the aisle floor
    // (the "warm aisle" beat of the interior world-build). Scaled with the
    // shared lightScale so low tiers stay below the Bloom threshold; on
    // high tier it blooms softly like a real cabin aisle strip.
    const warmAisle = new THREE.MeshStandardMaterial({
      color: '#fff7ed',
      emissive: '#fde68a',
      emissiveIntensity: LIGHT_BASE.aisle,
      envMapIntensity: 0.3,
    })
    // Choreographed NEXUS accent glows — cyan / violet / magenta strips that
    // drift in useFrame, matching the app palette exactly. These
    // re-use the shared lightScale so a 'mid'-capped variant (Normal bus) keeps
    // them below the Bloom threshold — the NEXUS treatment belongs to premium
    // Express trim, never flat-coach lighting.
    const accentBase = {
      cyan: new THREE.MeshStandardMaterial({ color: '#062a34', emissive: '#22d3ee', emissiveIntensity: LIGHT_BASE.accent }),
      violet: new THREE.MeshStandardMaterial({ color: '#191331', emissive: '#a78bfa', emissiveIntensity: LIGHT_BASE.accent }),
      magenta: new THREE.MeshStandardMaterial({ color: '#2a0d26', emissive: '#e879f9', emissiveIntensity: LIGHT_BASE.accent }),
    }
    return { ceiling, exit, doorSign, accent: accentBase, warmAisle }
  }, [materialPreset])

  useEffect(() => {
    return () => {
      lightMats.ceiling.dispose()
      lightMats.exit.dispose()
      lightMats.doorSign.dispose()
      lightMats.warmAisle.dispose()
      Object.values(lightMats.accent ?? {}).forEach((m) => m.dispose())
    }
  }, [lightMats])

  // Variant interior trim: Express = premium dark-slate panels + brushed-metal
  // rails; Normal = simpler vinyl/gray trim (roughness ~0.75, metalness ~0.05)
  // with NO gold/warm accent. Hoisted + disposed like the other material sets.
  const trimMats = useMemo(() => {
    const premium = materialPreset === 'premium'
    const panel = new THREE.MeshStandardMaterial({
      color: premium ? '#26324a' : '#3a4254',
      roughness: premium ? 1 : 0.75,
      metalness: premium ? 0 : 0.05,
      envMapIntensity: 0.3,
    })
    const floor = new THREE.MeshStandardMaterial({
      color: premium ? '#1b2536' : '#20293a',
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.15,
    })
    const aisle = new THREE.MeshStandardMaterial({
      color: premium ? '#0f1826' : '#141b28',
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.2,
    })
    const ceiling = new THREE.MeshStandardMaterial({
      color: premium ? '#1b2536' : '#2b3345',
      roughness: 0.7,
      metalness: 0,
      envMapIntensity: 0.3,
    })
    // Cabin trim strips tinted by the variant's panelAccent (gold for Express,
    // blue for Normal) so the interior matches the HUD identity. Fallbacks keep
    // a partial/missing variant from ever producing an undefined color.
    const accent = new THREE.MeshStandardMaterial({
      color: variantObj.panelAccent || (premium ? '#2a3854' : '#39435a'),
      roughness: 0.6,
      metalness: premium ? 0.1 : 0.05,
      envMapIntensity: 0.5,
    })
    // Poles/grab rails. Express = brushed metal; Normal = matte vinyl.
    const metal = new THREE.MeshStandardMaterial({
      color: premium ? '#94a3b8' : '#8d97a6',
      roughness: premium ? 0.35 : 0.75,
      metalness: premium ? 0.65 : 0.05,
      envMapIntensity: 0.9,
    })
    // Shared interior materials (curtains, dark trim) — hoisted to avoid
    // implicit per-mesh materials from material-color JSX shorthand.
    const curtain = new THREE.MeshStandardMaterial({
      color: '#5b3345',
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.2,
    })
    const darkInterior = new THREE.MeshStandardMaterial({
      color: '#0b101c',
      roughness: 0.6,
      metalness: 0.2,
      envMapIntensity: 0.35,
    })
    return { panel, floor, aisle, ceiling, accent, metal, curtain, darkInterior }
  }, [materialPreset, variantObj.panelAccent])

  useEffect(() => {
    return () => {
      Object.values(trimMats).forEach((m) => m.dispose())
    }
  }, [trimMats])

  const shellMats = useMemo(() => {
    // envMapIntensity across the shell: DuskWorld's procedural PMREM map
    // (mid/high tier) is what makes the painted body read as glossy coach
    // paint and the chrome as real chrome — without any external HDR asset.
    const body = new THREE.MeshStandardMaterial({ color: '#1c2a4a', roughness: 0.4, metalness: 0.35, transparent: true, envMapIntensity: 0.6 })
    const roof = new THREE.MeshStandardMaterial({ color: '#24345e', roughness: 0.5, metalness: 0.25, transparent: true, envMapIntensity: 0.5 })
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#0e1a2e',
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.9,
      envMapIntensity: 1.2,
    })
    const dark = new THREE.MeshStandardMaterial({ color: '#0a0f1c', roughness: 0.6, metalness: 0.2, transparent: true, envMapIntensity: 0.4 })
    const head = new THREE.MeshStandardMaterial({ color: '#fef3c7', emissive: '#fde68a', emissiveIntensity: 2.6, transparent: true, envMapIntensity: 0.3 })
    const tail = new THREE.MeshStandardMaterial({ color: '#7f1d1d', emissive: '#f87171', emissiveIntensity: 2.0, transparent: true, envMapIntensity: 0.3 })
    // Express-only — chrome grille, polished wheel covers, LED strips. High
    // envMapIntensity here is what sells "polished" under the dusk sky.
    const chrome = new THREE.MeshStandardMaterial({ color: '#d1d5db', roughness: 0.15, metalness: 0.92, transparent: true, envMapIntensity: 1.0 })
    const polished = new THREE.MeshStandardMaterial({ color: '#c8ccd4', roughness: 0.12, metalness: 0.95, transparent: true, envMapIntensity: 1.0 })
    const led = new THREE.MeshStandardMaterial({ color: '#fef9c3', emissive: '#fef08a', emissiveIntensity: 3.2, transparent: true, envMapIntensity: 0.3 })
    const ledTail = new THREE.MeshStandardMaterial({ color: '#dc2626', emissive: '#ef4444', emissiveIntensity: 2.8, transparent: true, envMapIntensity: 0.3 })
    const amber = new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#fb923c', emissiveIntensity: 1.8, transparent: true, envMapIntensity: 0.3 })
    // Express structural trim (A-pillars, window frames, body lines, AC pod)
    const expressTrim = new THREE.MeshStandardMaterial({ color: '#1a2240', roughness: 0.5, metalness: 0.35, transparent: true, envMapIntensity: 0.5 })
    const expressBody = new THREE.MeshStandardMaterial({ color: '#1e2d4d', roughness: 0.5, metalness: 0.3, transparent: true, envMapIntensity: 0.6 })
    const expressLine = new THREE.MeshStandardMaterial({ color: '#2a3d66', roughness: 0.35, metalness: 0.45, transparent: true, envMapIntensity: 0.8 })
    const expressLower = new THREE.MeshStandardMaterial({ color: '#22304e', roughness: 0.4, metalness: 0.3, transparent: true, envMapIntensity: 0.6 })
    const mirrorHousing = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.3, metalness: 0.4, transparent: true, envMapIntensity: 0.7 })
    const mirrorArm = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.4, metalness: 0.5, transparent: true, envMapIntensity: 0.8 })
    const badge = new THREE.MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.2, metalness: 0.85, transparent: true, envMapIntensity: 1.0 })
    const reverseLight = new THREE.MeshStandardMaterial({ color: '#e5e7eb', emissive: '#d1d5db', emissiveIntensity: 1.5, transparent: true, envMapIntensity: 0.3 })
    const plate = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6, metalness: 0.2, transparent: true, envMapIntensity: 0.4 })
    const mirrorGlass = new THREE.MeshPhysicalMaterial({ color: '#8899aa', roughness: 0.05, metalness: 0.95, transparent: true, opacity: 0.85, envMapIntensity: 1.2 })
    return { body, roof, glass, dark, head, tail, chrome, polished, led, ledTail, amber, expressTrim, expressBody, expressLine, expressLower, mirrorHousing, mirrorArm, badge, reverseLight, plate, mirrorGlass }
  }, [])

  useEffect(() => {
    return () => {
      Object.values(shellMats).forEach((m) => m.dispose())
    }
  }, [shellMats])

  // Precomputed array so useFrame doesn't allocate via Object.values per frame.
  const shellMatArray = useMemo(() => Object.values(shellMats), [shellMats])

  // Viking (Normal)-specific materials — hoisted out of JSX to avoid creating
  // new Three.js material objects on every render cycle. Only used inside
  // `isNormal &&` conditional blocks but allocated unconditionally so the
  // cleanup effect can dispose them reliably.
  const normalMats = useMemo(() => {
    const windshieldDivider = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.5, metalness: 0.4, envMapIntensity: 0.5 })
    const chromeGrille = new THREE.MeshStandardMaterial({ color: '#c0c0c0', roughness: 0.3, metalness: 0.8, envMapIntensity: 1.0 })
    const turnIndicator = new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#fb923c', emissiveIntensity: 1.2, transparent: true, envMapIntensity: 0.3 })
    const darkBumper = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.6, metalness: 0.3, envMapIntensity: 0.4 })
    const darkMirror = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.5, metalness: 0.3, envMapIntensity: 0.5 })
    const hoodTop = new THREE.MeshStandardMaterial({ color: '#2a3854', roughness: 0.4, metalness: 0.3, envMapIntensity: 0.6 })
    const engineGrilleSide = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.5, metalness: 0.4, envMapIntensity: 0.5 })
    const dashboard = new THREE.MeshStandardMaterial({ color: '#3a3a4a', roughness: 0.7, metalness: 0.1, envMapIntensity: 0.4 })
    const instrumentCluster = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.3, metalness: 0.2, envMapIntensity: 0.4 })
    const gaugeDark = new THREE.MeshStandardMaterial({ color: '#0a0a1a', roughness: 0.2, metalness: 0.3, envMapIntensity: 0.3 })
    const engineCover = new THREE.MeshStandardMaterial({ color: '#2a2a3a', roughness: 0.6, metalness: 0.15, envMapIntensity: 0.4 })
    const engineCoverTop = new THREE.MeshStandardMaterial({ color: '#3a3a4a', roughness: 0.5, metalness: 0.1, envMapIntensity: 0.5 })
    return { windshieldDivider, chromeGrille, turnIndicator, darkBumper, darkMirror, hoodTop, engineGrilleSide, dashboard, instrumentCluster, gaugeDark, engineCover, engineCoverTop }
  }, [])

  useEffect(() => {
    return () => { Object.values(normalMats).forEach((m) => m.dispose()) }
  }, [normalMats])

  // Interior window glass — shared by both side panes. Hoisted to avoid
  // creating a new meshPhysicalMaterial per render. envMapIntensity picks
  // up the dusk sky through the panes (subtle window sheen).
  const interiorGlassMat = useMemo(() =>
    new THREE.MeshPhysicalMaterial({
      color: INTERIOR_COLORS.glass,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      envMapIntensity: 1.0,
    }),
  [])

  useEffect(() => {
    return () => { interiorGlassMat.dispose() }
  }, [interiorGlassMat])

  // The scene obeys the same single source of truth as the orchestrator and
  // the HUD: the authoritative serviceClass wins, busType only as fallback.
  const layout = useMemo(
    () => computeLayout(capacity, busType, variantObj.serviceClass),
    [capacity, busType, variantObj.serviceClass]
  )

  const seatsByNumber = useMemo(() => {
    const m = new Map()
    for (const s of seats) m.set(Number(s.seatNumber), s)
    return m
  }, [seats])

  const placed = useMemo(() => {
    const list = []
    const sel = new Set(selected.map((n) => Number(n)))
    for (let n = 1; n <= capacity; n++) {
      const seat = seatsByNumber.get(n)
      if (!seat) continue
      const [x, , z] = seatPositionFor(n, layout)
      list.push({ seat, x, z, category: getSeatCategory(n, layout), isSelected: sel.has(n) })
    }
    return list
  }, [capacity, seatsByNumber, layout, selected])

  // Interior fixture Zs — span the interior for the variant
  const interiorStart = firstSeatZ - 0.3
  const interiorEnd = isNormal ? 6.5 : 7.2
  const poleZs = useMemo(() => {
    const count = isNormal ? 3 : 4
    return Array.from({ length: count }, (_, i) => interiorStart + ((i + 0.5) / count) * (interiorEnd - interiorStart))
  }, [isNormal])
  const lightZs = useMemo(() => {
    const count = isNormal ? 3 : 4
    return Array.from({ length: count }, (_, i) => interiorStart + ((i + 0.5) / count) * (interiorEnd - interiorStart))
  }, [isNormal])

  useFrame((state) => {
    const anim = busAnim ? busAnim.current : FALLBACK_ANIM
    const shell = anim.shell
    const door = anim.door
    // Store the live opacity so the LoadedBusModel can read it in its own useFrame.
    shellOpacityRef.current = shell
    if (shellGroupRef.current) {
      shellGroupRef.current.visible = shell > 0.03
      shellGroupRef.current.rotation.y = anim.yaw || 0
    }
    // Animate procedural shell materials (only matters when hasModel === false).
    for (let i = 0; i < shellMatArray.length; i++) {
      shellMatArray[i].opacity = Math.max(0, Math.min(1, shell))
    }
    if (doorLeafFrontRef.current) doorLeafFrontRef.current.position.z = doorBaseFrontZ - door * 0.5
    if (doorLeafRearRef.current) doorLeafRearRef.current.position.z = doorBaseRearZ + door * 0.5
    if (interiorGroupRef.current) {
      interiorGroupRef.current.visible = !showShell ? true : shell < 0.6
    }
    // Tiered interior light emissive (low tier stays below Bloom threshold).
    // Variants capped at 'mid' (Normal) get the same BLOOM_SAFE_LIGHT_SCALE
    // dimming on ANY device so the flat cabin lighting never blooms — there is
    // no premium trim to showcase, and the composer is capped at mid anyway.
    const lightScale = Math.min(
      profile.lightEmissiveScale,
      effectsTierCap === 'mid' ? BLOOM_SAFE_LIGHT_SCALE : 1
    )
    // Choreographed NEXUS accent drift: three glow strips (cyan/violet/magenta)
    // breathe on slightly offset sine waves so the cabin feels alive but calm.
    // `reducedMotion` freezes them at a steady mid-glint (no pulsing).
    const t = reducedMotion ? 0 : state.clock.elapsedTime
    lightMats.ceiling.emissiveIntensity = LIGHT_BASE.ceiling * lightScale
    lightMats.exit.emissiveIntensity = LIGHT_BASE.exit * lightScale
    lightMats.doorSign.emissiveIntensity = LIGHT_BASE.doorSign * lightScale
    // Warm aisle strips breathe gently (~0.8 Hz); frozen at a steady mid
    // glow when reduced motion is on (same freeze the NEXUS accents use).
    lightMats.warmAisle.emissiveIntensity =
      LIGHT_BASE.aisle * lightScale * (reducedMotion ? 0.9 : 0.8 + 0.2 * Math.sin(t * 0.8))
    const accentScale = lightScale * (reducedMotion ? 0.85 : 1)
    lightMats.accent.cyan.emissiveIntensity = LIGHT_BASE.accent * accentScale * (0.75 + 0.25 * Math.sin(t * 0.9))
    lightMats.accent.violet.emissiveIntensity = LIGHT_BASE.accent * accentScale * (0.7 + 0.3 * Math.sin(t * 0.7 + Math.PI * 0.66))
    lightMats.accent.magenta.emissiveIntensity = LIGHT_BASE.accent * accentScale * (0.8 + 0.2 * Math.sin(t * 1.1 + Math.PI * 1.33))
  })

  return (
    <group>
      {showShell && (
        <ContactShadows position={[0, 0.02, 0]} opacity={0.55} scale={14} blur={2.4} far={9} color="#020617" />
      )}

      {/* Stage light pool — additive emerald/amber glow painted on the
          DuskWorld ground under the bus (fake ground reflection + chassis
          light spill). Sits OUTSIDE the yawing shell group so it stays
          planted while the bus turns on the intro turntable. */}
      <mesh position={[0, -0.012, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15, 5.2]} />
        <meshBasicMaterial
          map={getStagePoolTexture()}
          transparent
          opacity={effTier === 'low' ? 0.26 : 0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <group ref={shellGroupRef}>
        {hasModel ? (
          /* ── Real 3D model shell (GLB) ────────────────────────────────────
           * The GLB model replaces ALL procedural shell geometry: body, roof,
           * windows, wheels, lights, doors, etc. The shipped models are baked
           * to scene units (meters, floor Y = 0, front = −Z, centered on X),
           * so the default transform is identity; per-variant overrides come
           * from fleetVariants for non-normalized swaps. The shellOpacityRef
           * drives the per-material opacity animation in the LoadedBusModel
           * useFrame. */
          <LoadedBusModel
            glbPath={variantObj.glbPath}
            shellOpacityRef={shellOpacityRef}
            scale={variantObj.modelScale ?? 1}
            rotation={variantObj.modelRotation ?? [0, 0, 0]}
            position={variantObj.modelPosition ?? [0, 0, 0]}
          />
        ) : (
        <>
        {/* ── Body shell (procedural fallback) ── */}
        <mesh position={[0, shellBodyY, 0]} material={shellMats.body} castShadow>
          <boxGeometry args={[shellW, shellH, shellL]} />
        </mesh>
        <mesh position={[0, roofY, 0]} material={shellMats.roof} castShadow>
          <boxGeometry args={[shellW - 0.2, roofH, shellL]} />
        </mesh>

        {/* ── Express roof-mounted AC pod (distinctive C12 Pro feature) ── */}
        {!isNormal && (
          <>
            {/* AC pod main body */}
            <mesh position={[0, roofY + roofH / 2 + 0.18, -0.3]} material={shellMats.expressBody}>
              <boxGeometry args={[1.2, 0.28, 4.2]} />
            </mesh>
            {/* AC pod top cover (rounded look) */}
            <mesh position={[0, roofY + roofH / 2 + 0.34, -0.3]} material={shellMats.roof}>
              <boxGeometry args={[1.05, 0.06, 3.9]} />
            </mesh>
            {/* AC pod intake grille front */}
            <mesh position={[0, roofY + roofH / 2 + 0.18, -2.35]} material={shellMats.dark}>
              <boxGeometry args={[1.0, 0.18, 0.04]} />
            </mesh>
            {/* AC pod exhaust rear */}
            <mesh position={[0, roofY + roofH / 2 + 0.18, 1.75]} material={shellMats.dark}>
              <boxGeometry args={[1.0, 0.18, 0.04]} />
            </mesh>
            {/* AC pod side trim strips */}
            <mesh position={[-0.62, roofY + roofH / 2 + 0.18, -0.3]} material={shellMats.expressLine}>
              <boxGeometry args={[0.04, 0.22, 4.0]} />
            </mesh>
            <mesh position={[0.62, roofY + roofH / 2 + 0.18, -0.3]} material={shellMats.expressLine}>
              <boxGeometry args={[0.04, 0.22, 4.0]} />
            </mesh>
          </>
        )}

        {/* ── Express side body character lines (C12 Pro crease) ── */}
        {!isNormal && (
          <>
            {/* Upper character line — runs full length */}
            <mesh position={[1.26, 1.35, 0]} material={shellMats.expressLine}>
              <boxGeometry args={[0.03, 0.03, shellL - 0.4]} />
            </mesh>
            <mesh position={[-1.26, 1.35, 0]} material={shellMats.expressLine}>
              <boxGeometry args={[0.03, 0.03, shellL - 0.4]} />
            </mesh>
            {/* Lower character line */}
            <mesh position={[1.26, 0.55, 0]} material={shellMats.expressLower}>
              <boxGeometry args={[0.02, 0.02, shellL - 0.8]} />
            </mesh>
            <mesh position={[-1.26, 0.55, 0]} material={shellMats.expressLower}>
              <boxGeometry args={[0.02, 0.02, shellL - 0.8]} />
            </mesh>
          </>
        )}

        {/* ── Windows (variant count via windowZs) ── */}
        {windowZs.map((z) => (
          <group key={`win-${z}`}>
            {/* Panoramic side windows — taller and wider for Express */}
            <mesh position={[1.26, 1.9, z]} material={shellMats.glass}>
              <boxGeometry args={[0.06, isNormal ? 0.78 : 0.95, isNormal ? 1.4 : 1.3]} />
            </mesh>
            <mesh position={[-1.26, 1.9, z]} material={shellMats.glass}>
              <boxGeometry args={[0.06, isNormal ? 0.78 : 0.95, isNormal ? 1.4 : 1.3]} />
            </mesh>
          </group>
        ))}
        {/* ── Express window frame pillars (visible between windows) ── */}
        {!isNormal && windowZs.map((z, i) => {
          if (i >= windowZs.length - 1) return null
          const nextZ = windowZs[i + 1]
          const midZ = (z + nextZ) / 2
          return (
            <group key={`wfp-${z}`}>
              <mesh position={[1.27, 1.9, midZ]} material={shellMats.expressTrim}>
                <boxGeometry args={[0.05, 1.0, 0.1]} />
              </mesh>
              <mesh position={[-1.27, 1.9, midZ]} material={shellMats.expressTrim}>
                <boxGeometry args={[0.05, 1.0, 0.1]} />
              </mesh>
            </group>
          )
        })}

        {/* ── Windshield: Express = raked two-piece coach; Normal = large single-piece ── */}
        {isNormal ? (
          <>
            {/* Viking: large single-piece windshield, slightly raked */}
            <mesh position={[0, 1.65, windshieldZ]} rotation={[windshieldAngle, 0, 0]} material={shellMats.glass}>
              <boxGeometry args={[2.2, 1.35, 0.06]} />
            </mesh>
            {/* Windshield divider (center pillar) */}
            <mesh position={[0, 1.65, windshieldZ + 0.02]} material={normalMats.windshieldDivider}>
              <boxGeometry args={[0.06, 1.35, 0.08]} />
            </mesh>
          </>
        ) : (
          <>
            {/* Express: wider, more aggressively raked two-piece windshield */}
            <mesh position={[-0.58, 2.05, windshieldZ]} rotation={[windshieldAngle, 0, 0.05]} material={shellMats.glass}>
              <boxGeometry args={[1.05, 1.35, 0.05]} />
            </mesh>
            <mesh position={[0.58, 2.05, windshieldZ]} rotation={[windshieldAngle, 0, -0.05]} material={shellMats.glass}>
              <boxGeometry args={[1.05, 1.35, 0.05]} />
            </mesh>
            {/* Windshield center divider pillar */}
            <mesh position={[0, 2.05, windshieldZ + 0.02]} material={shellMats.expressTrim}>
              <boxGeometry args={[0.06, 1.35, 0.07]} />
            </mesh>
            {/* Windshield top trim bar */}
            <mesh position={[0, 2.76, windshieldZ + 0.04]} material={shellMats.dark}>
              <boxGeometry args={[2.1, 0.06, 0.06]} />
            </mesh>
          </>
        )}

        {/* ── Viking front face (Normal only): chrome grille + low headlights ── */}
        {isNormal && (
          <>
            {/* Chrome grille between headlights */}
            <mesh position={[0, 0.65, frontBumperZ - 0.02]} material={normalMats.chromeGrille}>
              <boxGeometry args={[1.2, 0.35, 0.06]} />
            </mesh>
            {/* Headlights (low, near bumper — Viking trait) */}
            <mesh position={[-0.75, 0.55, frontBumperZ]} material={shellMats.head}>
              <boxGeometry args={[0.35, 0.18, 0.08]} />
            </mesh>
            <mesh position={[0.75, 0.55, frontBumperZ]} material={shellMats.head}>
              <boxGeometry args={[0.35, 0.18, 0.08]} />
            </mesh>
            {/* Turn indicators (above headlights) */}
            <mesh position={[-0.75, 0.82, frontBumperZ]} material={normalMats.turnIndicator}>
              <boxGeometry args={[0.35, 0.1, 0.08]} />
            </mesh>
            <mesh position={[0.75, 0.82, frontBumperZ]} material={normalMats.turnIndicator}>
              <boxGeometry args={[0.35, 0.1, 0.08]} />
            </mesh>
            {/* Front bumper */}
            <mesh position={[0, 0.18, frontBumperZ + 0.08]} material={normalMats.darkBumper}>
              <boxGeometry args={[2.4, 0.22, 0.12]} />
            </mesh>
            {/* Side mirrors */}
            <mesh position={[-1.35, 1.4, frontBumperZ + 0.3]} material={normalMats.darkMirror}>
              <boxGeometry args={[0.18, 0.22, 0.12]} />
            </mesh>
            <mesh position={[1.35, 1.4, frontBumperZ + 0.3]} material={normalMats.darkMirror}>
              <boxGeometry args={[0.18, 0.22, 0.12]} />
            </mesh>
          </>
        )}

        {/* ── Express front face (swept-back clusters, grille, bumper, A-pillars) ── */}
        {!isNormal && (
          <>
            {/* Front bumper — aerodynamic, wider than body */}
            <mesh position={[0, 0.22, frontBumperZ + 0.1]} material={shellMats.dark}>
              <boxGeometry args={[2.5, 0.3, 0.18]} />
            </mesh>
            {/* Bumper lower lip */}
            <mesh position={[0, 0.08, frontBumperZ + 0.15]} material={shellMats.dark}>
              <boxGeometry args={[2.3, 0.08, 0.1]} />
            </mesh>
            {/* Front grille — wide chrome bar with Yutong logo recess */}
            <mesh position={[0, 0.68, frontBumperZ - 0.01]} material={shellMats.chrome}>
              <boxGeometry args={[1.6, 0.32, 0.05]} />
            </mesh>
            {/* Grille horizontal slats */}
            <mesh position={[0, 0.58, frontBumperZ - 0.03]} material={shellMats.dark}>
              <boxGeometry args={[1.5, 0.04, 0.04]} />
            </mesh>
            <mesh position={[0, 0.78, frontBumperZ - 0.03]} material={shellMats.dark}>
              <boxGeometry args={[1.5, 0.04, 0.04]} />
            </mesh>
            {/* Yutong logo area (center badge) */}
            <mesh position={[0, 0.68, frontBumperZ + 0.03]} material={shellMats.badge}>
              <boxGeometry args={[0.35, 0.12, 0.04]} />
            </mesh>
            {/* Swept-back headlight cluster LEFT */}
            <mesh position={[-0.72, 0.95, frontBumperZ + 0.05]} rotation={[0, -0.12, 0]} material={shellMats.head}>
              <boxGeometry args={[0.55, 0.2, 0.1]} />
            </mesh>
            {/* Headlight inner LED strip LEFT */}
            <mesh position={[-0.72, 0.95, frontBumperZ + 0.12]} rotation={[0, -0.12, 0]} material={shellMats.led}>
              <boxGeometry args={[0.45, 0.06, 0.03]} />
            </mesh>
            {/* Swept-back headlight cluster RIGHT */}
            <mesh position={[0.72, 0.95, frontBumperZ + 0.05]} rotation={[0, 0.12, 0]} material={shellMats.head}>
              <boxGeometry args={[0.55, 0.2, 0.1]} />
            </mesh>
            {/* Headlight inner LED strip RIGHT */}
            <mesh position={[0.72, 0.95, frontBumperZ + 0.12]} rotation={[0, 0.12, 0]} material={shellMats.led}>
              <boxGeometry args={[0.45, 0.06, 0.03]} />
            </mesh>
            {/* Turn indicators (amber, outer edge of headlight cluster) */}
            <mesh position={[-0.95, 0.95, frontBumperZ + 0.06]} rotation={[0, -0.15, 0]} material={shellMats.amber}>
              <boxGeometry args={[0.12, 0.14, 0.06]} />
            </mesh>
            <mesh position={[0.95, 0.95, frontBumperZ + 0.06]} rotation={[0, 0.15, 0]} material={shellMats.amber}>
              <boxGeometry args={[0.12, 0.14, 0.06]} />
            </mesh>
            {/* Lower fog lights */}
            <mesh position={[-0.6, 0.32, frontBumperZ + 0.08]} material={shellMats.head}>
              <boxGeometry args={[0.18, 0.1, 0.05]} />
            </mesh>
            <mesh position={[0.6, 0.32, frontBumperZ + 0.08]} material={shellMats.head}>
              <boxGeometry args={[0.18, 0.1, 0.05]} />
            </mesh>
            {/* A-pillar LEFT (windshield support) */}
            <mesh position={[-1.12, 2.1, windshieldZ + 0.3]} rotation={[0.22, 0, 0.12]} material={shellMats.expressTrim}>
              <boxGeometry args={[0.08, 1.6, 0.08]} />
            </mesh>
            {/* A-pillar RIGHT */}
            <mesh position={[1.12, 2.1, windshieldZ + 0.3]} rotation={[0.22, 0, -0.12]} material={shellMats.expressTrim}>
              <boxGeometry args={[0.08, 1.6, 0.08]} />
            </mesh>
            {/* Coach-style "bunny ear" mirrors LEFT */}
            <group position={[-1.35, 2.0, frontBumperZ + 0.6]}>
              {/* Mirror arm */}
              <mesh position={[0, 0.15, -0.15]} rotation={[0, 0, 0.3]} material={shellMats.mirrorArm}>
                <cylinderGeometry args={[0.02, 0.025, 0.55, 8]} />
              </mesh>
              {/* Mirror head */}
              <mesh position={[-0.12, 0.38, -0.05]} material={shellMats.mirrorHousing}>
                <boxGeometry args={[0.22, 0.18, 0.06]} />
              </mesh>
              {/* Mirror glass */}
              <mesh position={[-0.12, 0.38, -0.02]} material={shellMats.mirrorGlass}>
                <boxGeometry args={[0.17, 0.13, 0.01]} />
              </mesh>
            </group>
            {/* Coach-style "bunny ear" mirrors RIGHT */}
            <group position={[1.35, 2.0, frontBumperZ + 0.6]}>
              {/* Mirror arm */}
              <mesh position={[0, 0.15, -0.15]} rotation={[0, 0, -0.3]} material={shellMats.mirrorArm}>
                <cylinderGeometry args={[0.02, 0.025, 0.55, 8]} />
              </mesh>
              {/* Mirror head */}
              <mesh position={[0.12, 0.38, -0.05]} material={shellMats.mirrorHousing}>
                <boxGeometry args={[0.22, 0.18, 0.06]} />
              </mesh>
              {/* Mirror glass */}
              <mesh position={[0.12, 0.38, -0.02]} material={shellMats.mirrorGlass}>
                <boxGeometry args={[0.17, 0.13, 0.01]} />
              </mesh>
            </group>
          </>
        )}

        {/* ── Tail lights (Viking: vertical at rear corners; Express: horizontal) ── */}
        {isNormal ? (
          <>
            <mesh position={[-1.05, 0.9, rearBumperZ]} material={shellMats.tail}>
              <boxGeometry args={[0.18, 0.45, 0.08]} />
            </mesh>
            <mesh position={[1.05, 0.9, rearBumperZ]} material={shellMats.tail}>
              <boxGeometry args={[0.18, 0.45, 0.08]} />
            </mesh>
            {/* Rear bumper */}
            <mesh position={[0, 0.18, rearBumperZ + 0.08]} material={normalMats.darkBumper}>
              <boxGeometry args={[2.2, 0.2, 0.1]} />
            </mesh>
          </>
        ) : (
          <>
            {/* Express: modern horizontal LED tail lights */}
            {/* Left tail light bar */}
            <mesh position={[-0.65, 1.05, rearBumperZ]} material={shellMats.ledTail}>
              <boxGeometry args={[0.55, 0.08, 0.06]} />
            </mesh>
            <mesh position={[-0.65, 1.18, rearBumperZ]} material={shellMats.ledTail}>
              <boxGeometry args={[0.45, 0.05, 0.06]} />
            </mesh>
            {/* Right tail light bar */}
            <mesh position={[0.65, 1.05, rearBumperZ]} material={shellMats.ledTail}>
              <boxGeometry args={[0.55, 0.08, 0.06]} />
            </mesh>
            <mesh position={[0.65, 1.18, rearBumperZ]} material={shellMats.ledTail}>
              <boxGeometry args={[0.45, 0.05, 0.06]} />
            </mesh>
            {/* Center tail light connecting strip */}
            <mesh position={[0, 1.05, rearBumperZ]} material={shellMats.ledTail}>
              <boxGeometry args={[0.4, 0.05, 0.05]} />
            </mesh>
            {/* Reverse lights (white) */}
            <mesh position={[-0.5, 0.92, rearBumperZ]} material={shellMats.reverseLight}>
              <boxGeometry args={[0.15, 0.06, 0.05]} />
            </mesh>
            <mesh position={[0.5, 0.92, rearBumperZ]} material={shellMats.reverseLight}>
              <boxGeometry args={[0.15, 0.06, 0.05]} />
            </mesh>
            {/* Rear bumper */}
            <mesh position={[0, 0.22, rearBumperZ + 0.1]} material={shellMats.dark}>
              <boxGeometry args={[2.4, 0.26, 0.16]} />
            </mesh>
            {/* Rear engine deck panel */}
            <mesh position={[0, 0.55, rearBumperZ - 0.3]} material={shellMats.dark}>
              <boxGeometry args={[2.2, 0.5, 0.5]} />
            </mesh>
            {/* Engine ventilation grille — horizontal slats */}
            <mesh position={[0, 0.42, rearBumperZ - 0.06]} material={shellMats.chrome}>
              <boxGeometry args={[1.8, 0.02, 0.04]} />
            </mesh>
            <mesh position={[0, 0.5, rearBumperZ - 0.06]} material={shellMats.chrome}>
              <boxGeometry args={[1.8, 0.02, 0.04]} />
            </mesh>
            <mesh position={[0, 0.58, rearBumperZ - 0.06]} material={shellMats.chrome}>
              <boxGeometry args={[1.8, 0.02, 0.04]} />
            </mesh>
            <mesh position={[0, 0.66, rearBumperZ - 0.06]} material={shellMats.chrome}>
              <boxGeometry args={[1.8, 0.02, 0.04]} />
            </mesh>
            {/* Rear license plate area */}
            <mesh position={[0, 0.38, rearBumperZ + 0.08]} material={shellMats.plate}>
              <boxGeometry args={[0.55, 0.14, 0.02]} />
            </mesh>
          </>
        )}

        {/* ── Wheels (variant positions) ── */}
        <Wheel x={-1.32} z={frontAxleZ} />
        <Wheel x={1.32} z={frontAxleZ} />
        <Wheel x={-1.32} z={rearAxleZ} />
        <Wheel x={1.32} z={rearAxleZ} />

        {/* ── Express wheel covers (polished aluminum hubcaps) ── */}
        {!isNormal && (
          <>
            {/* Front left hubcap */}
            <mesh geometry={HUB_GEOM} position={[-1.48, 0.52, frontAxleZ]} rotation={[0, 0, Math.PI / 2]} material={shellMats.polished} />
            {/* Front right hubcap */}
            <mesh geometry={HUB_GEOM} position={[1.48, 0.52, frontAxleZ]} rotation={[0, 0, Math.PI / 2]} material={shellMats.polished} />
            {/* Rear left hubcap */}
            <mesh geometry={HUB_GEOM} position={[-1.48, 0.52, rearAxleZ]} rotation={[0, 0, Math.PI / 2]} material={shellMats.polished} />
            {/* Rear right hubcap */}
            <mesh geometry={HUB_GEOM} position={[1.48, 0.52, rearAxleZ]} rotation={[0, 0, Math.PI / 2]} material={shellMats.polished} />
          </>
        )}

        {/* ── Door (variant z-positions) ── */}
        <mesh position={[1.24, 1.0, doorFrameBaseZ]} material={shellMats.dark}>
          <boxGeometry args={[0.06, 2.0, 0.86]} />
        </mesh>
        <mesh ref={doorLeafFrontRef} position={[1.27, 1.0, doorBaseFrontZ]} material={shellMats.body}>
          <boxGeometry args={[0.06, 2.0, 0.42]} />
        </mesh>
        <mesh ref={doorLeafRearRef} position={[1.27, 1.0, doorBaseRearZ]} material={shellMats.body}>
          <boxGeometry args={[0.06, 2.0, 0.42]} />
        </mesh>

        {/* ── Viking front-engine hood (Normal only) ── */}
        {isNormal && (
          <>
            {/* Main hood body */}
            <mesh position={[0, 0.55, (frontBumperZ + frontAxleZ) / 2]} material={shellMats.body}>
              <boxGeometry args={[1.8, 0.7, Math.abs(frontBumperZ - frontAxleZ) + 0.3]} />
            </mesh>
            {/* Hood top panel (slightly narrower) */}
            <mesh position={[0, 0.92, (frontBumperZ + frontAxleZ) / 2]} material={normalMats.hoodTop}>
              <boxGeometry args={[1.5, 0.06, Math.abs(frontBumperZ - frontAxleZ) + 0.1]} />
            </mesh>
            {/* Engine ventilation grille (side) */}
            <mesh position={[-0.92, 0.55, (frontBumperZ + frontAxleZ) / 2]} material={normalMats.engineGrilleSide}>
              <boxGeometry args={[0.06, 0.4, Math.abs(frontBumperZ - frontAxleZ) * 0.6]} />
            </mesh>
            <mesh position={[0.92, 0.55, (frontBumperZ + frontAxleZ) / 2]} material={normalMats.engineGrilleSide}>
              <boxGeometry args={[0.06, 0.4, Math.abs(frontBumperZ - frontAxleZ) * 0.6]} />
            </mesh>
          </>
        )}

        {/* ── Express rear engine deck (detailed, Express only) ── */}
        {!isNormal && (
          <>
            {/* Upper engine vent grille */}
            <mesh position={[0, 1.2, rearBumperZ - 0.2]} material={shellMats.dark}>
              <boxGeometry args={[2.0, 0.4, 0.06]} />
            </mesh>
            {/* Upper grille horizontal slats */}
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh key={`eng-slat-${i}`} position={[0, 1.08 + i * 0.08, rearBumperZ - 0.16]} material={shellMats.chrome}>
                <boxGeometry args={[1.8, 0.015, 0.03]} />
              </mesh>
            ))}
            {/* Lower engine access panel */}
            <mesh position={[0, 0.35, rearBumperZ - 0.25]} material={shellMats.dark}>
              <boxGeometry args={[1.8, 0.5, 0.06]} />
            </mesh>
          </>
        )}
        </>
        )}
      </group>

      <group ref={interiorGroupRef}>
        {/* ── Floor ── */}
        <mesh position={[0, -0.03, interiorCenterZ]} material={trimMats.floor} receiveShadow>
          <boxGeometry args={[interiorW, 0.06, interiorSpan]} />
        </mesh>
        <mesh position={[0, 0.012, interiorCenterZ]} material={trimMats.aisle}>
          <boxGeometry args={[aisleW, 0.005, interiorSpan - 0.8]} />
        </mesh>
        {/* Warm aisle LED strips — the "warm aisle" mood light of the
            dusk-cabin world-build: thin emissive rails along both edges of
            the aisle, breathing via lightMats.warmAisle in useFrame. */}
        <mesh position={[-aisleW / 2 - 0.035, 0.035, interiorCenterZ]} material={lightMats.warmAisle}>
          <boxGeometry args={[0.015, 0.015, interiorSpan - 1.2]} />
        </mesh>
        <mesh position={[aisleW / 2 + 0.035, 0.035, interiorCenterZ]} material={lightMats.warmAisle}>
          <boxGeometry args={[0.015, 0.015, interiorSpan - 1.2]} />
        </mesh>
        {/* Warm cabin wash — a real point light at the ceiling line (high
            tier only; two-point-light cost). Warms the aisle and seat
            cushions from inside once the shell fades during the intro. */}
        {effTier === 'high' && (
          <pointLight position={[0, 2.02, interiorCenterZ - 0.8]} intensity={2.6} distance={9} decay={2} color="#ffe3b3" />
        )}

        {/* ── Side panels ── */}
        <mesh position={[-halfW, 1.05, interiorCenterZ]} material={trimMats.panel}>
          <boxGeometry args={[0.08, 2.1, interiorSpan]} />
        </mesh>
        {/* Right panel: split around the door */}
        <mesh position={[halfW, 1.05, interiorCenterZ + interiorSpan / 2 - 0.4]} material={trimMats.panel}>
          <boxGeometry args={[0.08, 2.1, interiorSpan - 1.0]} />
        </mesh>

        {/* ── Rear wall ── */}
        <mesh position={[0, 1.05, interiorEnd - 0.1]} material={trimMats.panel}>
          <boxGeometry args={[interiorW, 2.1, 0.08]} />
        </mesh>
        {/* Rear monitor (Express only) */}
        {!isNormal && (
          <mesh position={[0, 1.15, interiorEnd - 0.15]} material={trimMats.accent}>
            <boxGeometry args={[1.0, 1.9, 0.03]} />
          </mesh>
        )}
        <mesh position={[0, 1.85, interiorEnd - 0.18]} material={lightMats.exit}>
          <boxGeometry args={[0.42, 0.14, 0.04]} />
        </mesh>

        {/* ── Interior window glass panes ── */}
        {/* Glass panes offset inward (X ±1.12) to avoid co-planar z-fighting
            with side panels (panel inner face at ±1.13). */}
        <mesh position={[-1.12, 1.3, interiorCenterZ]} material={interiorGlassMat}>
          <boxGeometry args={[0.03, 0.72, interiorSpan - 0.8]} />
        </mesh>
        <mesh position={[1.12, 1.3, interiorCenterZ]} material={interiorGlassMat}>
          <boxGeometry args={[0.03, 0.72, interiorSpan - 0.8]} />
        </mesh>

        {/* ── Curtains (Express only — Viking has no curtains) ── */}
        {!isNormal && (
          <>
            <mesh position={[-1.14, 1.82, interiorCenterZ]} material={trimMats.curtain}>
              <boxGeometry args={[0.03, 0.3, interiorSpan - 0.8]} />
            </mesh>
            <mesh position={[1.14, 1.82, interiorCenterZ]} material={trimMats.curtain}>
              <boxGeometry args={[0.03, 0.3, interiorSpan - 0.8]} />
            </mesh>
          </>
        )}

        {/* ── Ceiling ── */}
        <mesh position={[0, 2.03, interiorCenterZ]} material={trimMats.ceiling}>
          <boxGeometry args={[interiorW, 0.06, interiorSpan]} />
        </mesh>
        {lightZs.map((z) => (
          <mesh key={`light-${z}`} position={[0, 2.0, z]} material={lightMats.ceiling}>
            <boxGeometry args={[isNormal ? 0.26 : 0.16, 0.02, isNormal ? 2.3 : 2.2]} />
          </mesh>
        ))}

        {/* ── NEXUS choreographed accent glow strips (Express premium trim).
            Cyan along the left sill, magenta along the right, violet across the
            rear — driven (emissive drift) in useFrame. Keep them flats so the
            Bloom pass picks them up; Normal caps them below threshold via
            effectsTierCap, so this stays a premium-Express-only treatment. */}
        {!isNormal && (
          <>
            <mesh position={[-halfW + 0.09, 0.24, interiorCenterZ]} material={lightMats.accent.cyan}>
              <boxGeometry args={[0.02, 0.02, interiorSpan - 1.4]} />
            </mesh>
            <mesh position={[halfW - 0.09, 0.3, interiorCenterZ]} material={lightMats.accent.magenta}>
              <boxGeometry args={[0.02, 0.02, interiorSpan - 1.4]} />
            </mesh>
            <mesh position={[0, 1.9, interiorEnd - 0.18]} material={lightMats.accent.violet}>
              <boxGeometry args={[1.4, 0.02, 0.02]} />
            </mesh>
          </>
        )}

        {/* ── Luggage rack accent strips (Express only — coach overhead racks) ── */}
        {!isNormal && (
          <>
            <mesh position={[-0.98, 1.78, interiorCenterZ]} material={trimMats.accent}>
              <boxGeometry args={[0.4, 0.12, interiorSpan - 1.6]} />
            </mesh>
            <mesh position={[0.98, 1.78, interiorCenterZ]} material={trimMats.accent}>
              <boxGeometry args={[0.4, 0.12, interiorSpan - 1.6]} />
            </mesh>
          </>
        )}

        {/* ── Grab poles (vertical) ── */}
        {poleZs.map((z) => (
          <group key={`pole-${z}`}>
            <mesh geometry={POLE_GEOM} position={[-0.32, 1.0, z]} material={trimMats.metal} />
            <mesh geometry={POLE_GEOM} position={[0.32, 1.0, z]} material={trimMats.metal} />
          </group>
        ))}
        {/* Horizontal grab rails (span interior) */}
        <mesh position={[-0.32, 1.98, interiorCenterZ]} rotation={[Math.PI / 2, 0, 0]} material={trimMats.metal}>
          <cylinderGeometry args={[0.018, 0.018, interiorSpan - 0.6, 8]} />
        </mesh>
        <mesh position={[0.32, 1.98, interiorCenterZ]} rotation={[Math.PI / 2, 0, 0]} material={trimMats.metal}>
          <cylinderGeometry args={[0.018, 0.018, interiorSpan - 0.6, 8]} />
        </mesh>

        {/* ── Driver area (left side, front) ── */}
        <mesh position={[-0.65, 0.05, doorBaseFrontZ + 0.3]} material={trimMats.accent}>
          <boxGeometry args={[0.5, 0.1, 0.5]} />
        </mesh>
        <mesh position={[-0.65, 0.2, doorBaseFrontZ + 0.35]} material={trimMats.panel}>
          <boxGeometry args={[0.5, 0.1, 0.5]} />
        </mesh>
        <mesh position={[-0.65, 0.55, doorBaseFrontZ + 0.5]} material={trimMats.panel}>
          <boxGeometry args={[0.5, 0.7, 0.12]} />
        </mesh>
        <mesh position={[-0.62, 1.05, doorBaseFrontZ - 0.1]} rotation={[0.15, 0, 0]} material={trimMats.metal}>
          <torusGeometry args={[0.28, 0.035, 16, 24]} />
        </mesh>
        <mesh position={[-0.6, 0.95, doorBaseFrontZ - 0.25]} material={trimMats.darkInterior}>
          <boxGeometry args={[1.0, 0.5, 0.25]} />
        </mesh>
        <mesh position={[-0.78, 1.14, doorBaseFrontZ - 0.35]} material={lightMats.doorSign}>
          <boxGeometry args={[0.42, 0.22, 0.03]} />
        </mesh>

        {/* ── Viking dashboard details (Normal only) ── */}
        {isNormal && (
          <>
            {/* Dashboard panel (wider, utilitarian) */}
            <mesh position={[-0.55, 0.75, doorBaseFrontZ - 0.45]} material={normalMats.dashboard}>
              <boxGeometry args={[0.9, 0.35, 0.6]} />
            </mesh>
            {/* Instrument cluster (gauges) */}
            <mesh position={[-0.55, 0.88, doorBaseFrontZ - 0.72]} material={normalMats.instrumentCluster}>
              <boxGeometry args={[0.6, 0.22, 0.04]} />
            </mesh>
            {/* Speedometer circle */}
            <mesh position={[-0.65, 0.88, doorBaseFrontZ - 0.69]} rotation={[0, 0, 0]} material={normalMats.gaugeDark}>
              <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
            </mesh>
            {/* Tachometer circle */}
            <mesh position={[-0.45, 0.88, doorBaseFrontZ - 0.69]} rotation={[0, 0, 0]} material={normalMats.gaugeDark}>
              <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
            </mesh>
            {/* Steering column */}
            <mesh position={[-0.55, 0.65, doorBaseFrontZ - 0.55]} rotation={[0.3, 0, 0]} material={trimMats.metal}>
              <cylinderGeometry args={[0.025, 0.025, 0.35, 8]} />
            </mesh>
            {/* Engine cover (front-engine Viking trait) */}
            <mesh position={[0.0, 0.35, doorBaseFrontZ + 0.8]} material={normalMats.engineCover}>
              <boxGeometry args={[0.8, 0.45, 1.2]} />
            </mesh>
            {/* Engine cover top panel */}
            <mesh position={[0.0, 0.58, doorBaseFrontZ + 0.8]} material={normalMats.engineCoverTop}>
              <boxGeometry args={[0.7, 0.04, 1.0]} />
            </mesh>
          </>
        )}

        {/* ── Door interior glass panel (right side) ── */}
        <mesh position={[1.14, 1.0, doorFrameBaseZ]} material={trimMats.darkInterior}>
          <boxGeometry args={[0.05, 2.0, 0.86]} />
        </mesh>
        <mesh position={[1.05, 0.09, doorFrameBaseZ]} material={trimMats.accent}>
          <boxGeometry args={[0.6, 0.18, 0.7]} />
        </mesh>

        {placed.map(({ seat, x, z, category, isSelected }) => (
          <Seat3D
            key={seat.seatNumber}
            seat={seat}
            category={category}
            selected={isSelected}
            focused={focusedNumber != null && Number(focusedNumber) === Number(seat.seatNumber)}
            maxSelection={maxSelection}
            onSelect={onSeatSelect}
            position={[x, 0, z]}
            reducedMotion={reducedMotion}
            serviceClass={variantObj.serviceClass}
            materialPreset={materialPreset}
            effectsTierCap={effectsTierCap}
          />
        ))}
      </group>
    </group>
  )
})
