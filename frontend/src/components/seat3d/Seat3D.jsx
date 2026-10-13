import { memo, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { getSeatGeometry } from './seatGeometry'
import { seatGlyphFor, SEAT_CATEGORY_LABELS, SEAT_COLORS } from './seatMeta'
import { playError, hapticDeny } from './Sound'
import { useDeviceProfile, effectiveTier } from './deviceProfile'
import { ContactShadowBlob } from './tieredEffects'

/* Exact seat-state colors (spec). Backend statuses: AVAILABLE/SELECTED/
 * BOOKED/LOCKED. 'locked'/'reserved' share #F97316; a backend 'SELECTED' seat
 * (held by someone else) is treated as reserved + non-clickable, matching
 * SeatSelect3D's `status !== 'AVAILABLE'` guard. Values are shared with the
 * HUD legend via SEAT_COLORS (seatMeta) so render and legend never drift. */

function unavailableStatusKey(status) {
  if (status === 'BOOKED') return 'booked'
  if (status === 'LOCKED' || status === 'RESERVED' || status === 'SELECTED') {
    return 'reserved'
  }
  return null
}

/* Interaction timing (spec): hover emissive ×1.15 @150ms; select = 300ms color
 * lerp + lift +0.08 + transient scale pulse 1 → 1.06 → 1 + continuous ~2s
 * emissive sine. Deselect reverses via the same lerps; the sine stops. */
const HOVER_RATE = 1 / 0.15 // 150ms hover ease
const SELECT_RATE = 1 / 0.3 // 300ms select lerp
const HOVER_SCALE = 1.05
const HOVER_LIFT = 0.04
const HOVER_EMISSIVE_BASE = 0.22
const HOVER_EMISSIVE_MULT = 1.15
const SELECT_EMISSIVE = 0.35
const SPECIAL_EMISSIVE = 0.14
const SELECT_LIFT = 0.08
const SELECT_PULSE_AMP = 0.06
const SELECT_PULSE_MS = 300
const SOFT_PULSE_BASE = 0.12
const SOFT_PULSE_AMP = 0.12

function Seat3D({
  seat,
  category = 'standard',
  selected = false,
  focused = false,
  maxSelection = 6,
  onSelect,
  position = [0, 0, 0],
  reducedMotion = false,
  // Variant look (Fleet Variant Upgrade): Express = recliner/leather premium,
  // Normal = upright bench/vinyl standard. Defaults keep existing callers on
  // the Express look. effectsTierCap lets Normal cap the device tier at 'mid'.
  serviceClass = 'express',
  materialPreset = 'premium',
  effectsTierCap = 'high',
}) {
  const groupRef = useRef(null)
  const matRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const pulseMsRef = useRef(0) // transient select scale-pulse timer (ms)
  const pulsePhaseRef = useRef(0) // continuous emissive pulse phase (s)

  const profile = useDeviceProfile()
  const { tier, contactShadow } = profile
  // Cap the device tier at the variant's effects cap ('mid' for Normal). This
  // keeps flat shading / emissive / shadow casting in lockstep with the
  // composer cap the Frontend agent wires in SeatSelect3D via the same helper.
  const effTier = effectiveTier(tier, effectsTierCap)
  const flatShading = effTier === 'low'

  const statusKey = unavailableStatusKey(seat.status)
  const locked = statusKey != null
  const isHovered = !locked && (hovered || focused)

  /* Static targets — recomputed only when state actually changes. */
  const targets = useMemo(() => {
    const color = new THREE.Color()
    const emissive = new THREE.Color('#000000')
    let emissiveIntensity = 0
    let scale = 1
    let lift = 0

    if (locked) {
      color.set(SEAT_COLORS[statusKey] || SEAT_COLORS.reserved)
    } else if (selected) {
      color.set(SEAT_COLORS.selected)
      emissive.set(SEAT_COLORS.selected)
      emissiveIntensity = SELECT_EMISSIVE
      lift = SELECT_LIFT
    } else {
      color.set(SEAT_COLORS[category] || SEAT_COLORS.available)
      if (category !== 'standard') {
        emissive.set(color)
        emissiveIntensity = SPECIAL_EMISSIVE
      }
    }

    if (isHovered && !selected) {
      scale = HOVER_SCALE
      lift = Math.max(lift, HOVER_LIFT)
      emissive.set(color)
      emissiveIntensity =
        Math.max(emissiveIntensity, HOVER_EMISSIVE_BASE) * HOVER_EMISSIVE_MULT
    }
    // SELECTED outranks HOVER (Game Designer review): a hovered-and-selected
    // seat keeps its selected scale (1 + transient pulse) and lift instead of
    // growing to the hover size, so the selected identity is never lost.

    // Low tier = flat-shaded, no glow — the orchestrator's fixed Bloom pass
    // (luminanceThreshold 0.9) then has nothing to pick up from seats.
    if (effTier === 'low') emissiveIntensity = 0

    return { color, emissive, emissiveIntensity, scale, lift }
  }, [locked, statusKey, selected, category, isHovered, effTier])

  /* Animated state — mutated in-place each frame, zero allocations. */
  const state = useMemo(
    () => ({
      color: new THREE.Color(SEAT_COLORS.available),
      emissive: new THREE.Color('#000000'),
      emissiveIntensity: 0,
      scale: 1,
      lift: 0,
    }),
    []
  )

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const snap = reducedMotion
    const kColor = snap ? 1 : 1 - Math.exp(-dt * SELECT_RATE)
    const kQuick = snap ? 1 : 1 - Math.exp(-dt * HOVER_RATE)

    state.color.lerp(targets.color, kColor)
    state.emissive.lerp(targets.emissive, kColor)
    state.emissiveIntensity += (targets.emissiveIntensity - state.emissiveIntensity) * kQuick
    state.scale += (targets.scale - state.scale) * kQuick
    state.lift += (targets.lift - state.lift) * kQuick

    /* Transient select pulse 1 → 1.06 → 1 (only while selected). */
    let pulse = 0
    if (selected && !snap) {
      pulseMsRef.current = Math.min(pulseMsRef.current + dt * 1000, SELECT_PULSE_MS)
      pulsePhaseRef.current += dt
      pulse =
        Math.sin(Math.PI * (pulseMsRef.current / SELECT_PULSE_MS)) * SELECT_PULSE_AMP
    } else {
      pulseMsRef.current = 0
      pulsePhaseRef.current = 0
    }

    const mat = matRef.current
    if (mat) {
      mat.color.copy(state.color)
      mat.emissive.copy(state.emissive)
      let ei = state.emissiveIntensity
      if (selected && !snap) {
        // Continuous soft pulse, ~2s period (phase accumulates in seconds).
        ei += SOFT_PULSE_BASE + Math.sin(Math.PI * pulsePhaseRef.current) * SOFT_PULSE_AMP
      }
      mat.emissiveIntensity = ei
    }

    const g = groupRef.current
    if (g) {
      g.position.y = state.lift
      const s = state.scale + pulse
      g.scale.set(s, s, s)
    }
  })

  const setCursor = (c) => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.cursor = c
    }
  }

  useEffect(() => () => setCursor(''), [])

  const handleClick = (e) => {
    e.stopPropagation()
    if (locked) {
      playError()
      hapticDeny()
      return
    }
    onSelect?.(seat)
  }

  const handleOver = (e) => {
    e.stopPropagation()
    if (locked) {
      setCursor('not-allowed')
      return
    }
    setHovered(true)
    setCursor('pointer')
  }

  const handleOut = () => {
    setHovered(false)
    setCursor('')
  }

  const labelClass = selected
    ? 'rounded-full bg-[#22c55e] px-2 py-0.5 text-xs font-bold text-slate-950 shadow-lg shadow-[#22c55e]/40'
    : 'rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-slate-900 shadow-lg'

  // Non-color state cue: glyph chip for unavailable and special seats
  // (WCAG 1.4.1) — mirror of the previous implementation.
  const glyph = seatGlyphFor(category, seat.status, selected)
  const showGlyph = !selected && !focused && Boolean(glyph)
  const showBlob = (isHovered || selected) && contactShadow

  // Hover tooltip (Game Designer review): surface seat number + category + fare
  // on hover so sighted users get the same info SR users get. Hidden for
  // selected/focused seats (their label already shows the number).
  const fare = Number(seat.price)
  const showTooltip = hovered && !focused && !selected
  const tooltipLines = [
    `Seat ${seat.seatNumber}`,
    category !== 'standard' && SEAT_CATEGORY_LABELS[category],
    locked ? seat.status : Number.isFinite(fare) && fare > 0 ? `LKR ${fare.toLocaleString()}` : '',
  ].filter(Boolean)

  return (
    <group position={position}>
      <group ref={groupRef}>
        <mesh
          geometry={getSeatGeometry(serviceClass)}
          castShadow={(isHovered || selected) && effTier !== 'low'}
          receiveShadow
          onClick={handleClick}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
          userData={{ seatNumber: seat.seatNumber, status: seat.status, category, selected }}
        >
          {/* Premium = leather-look (clearcoat sheen + soft velvet-ish roughness);
              standard = simpler cloth/vinyl. A physical material gives the premium
              Express seats a crisp specular highlight that reads as polished hide
              without any external environment map (kept asset/network-free). */}
          <meshPhysicalMaterial
            ref={matRef}
            roughness={materialPreset === 'standard' ? 0.72 : 0.42}
            metalness={materialPreset === 'standard' ? 0.05 : 0.08}
            clearcoat={materialPreset === 'premium' ? 0.55 : 0}
            clearcoatRoughness={materialPreset === 'premium' ? 0.22 : 1}
            reflectivity={materialPreset === 'premium' ? 0.5 : 0}
            flatShading={flatShading}
            // DuskWorld's PMREM env map catches the horizon in the premium
            // clearcoat — a soft amber/emerald sheen across the leather.
            // Standard vinyl barely responds (no premium showcase on Normal).
            envMapIntensity={materialPreset === 'premium' ? 0.45 : 0.2}
          />
        </mesh>
        {(selected || focused) && (
          <Html position={[0, 1.22, -0.04]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
            <div className={labelClass} aria-hidden="true">
              {selected && glyph ? `${glyph} ${seat.seatNumber}` : seat.seatNumber}
            </div>
          </Html>
        )}
        {showGlyph && (
          <Html position={[0, 1.22, -0.04]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
            <div
              className="rounded-full border border-white/30 bg-slate-950/85 px-1.5 py-0.5 text-sm leading-none"
              aria-hidden="true"
            >
              {glyph}
            </div>
          </Html>
        )}
        {showTooltip && (
          <Html position={[0, 1.35, -0.04]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
            <div
              className="whitespace-nowrap rounded-md border border-white/15 bg-slate-950/90 px-2 py-1 text-xs leading-relaxed text-slate-100 shadow-xl backdrop-blur"
              aria-hidden="true"
            >
              {tooltipLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </Html>
        )}
      </group>
      {/* Contact shadow ONLY under the hovered/selected seat — sits outside the
          animated group so it stays planted on the floor. */}
      {showBlob && <ContactShadowBlob opacity={effTier === 'low' ? 0.45 : 0.55} />}
    </group>
  )
}

/* Memoize: ~54 seats re-render only when their OWN state changes. `selected`
 * changes in BusInterior3D re-run the `placed` map, which rebuilds the
 * `position` arrays — compare element-wise so unaffected seats skip. The
 * variant look props are scalars, so a variant switch re-renders every seat
 * exactly once (geometry/material swap), never again per frame. */
function arePropsEqual(prev, next) {
  return (
    prev.seat === next.seat &&
    prev.category === next.category &&
    prev.selected === next.selected &&
    prev.focused === next.focused &&
    prev.maxSelection === next.maxSelection &&
    prev.onSelect === next.onSelect &&
    prev.reducedMotion === next.reducedMotion &&
    prev.serviceClass === next.serviceClass &&
    prev.materialPreset === next.materialPreset &&
    prev.effectsTierCap === next.effectsTierCap &&
    prev.position[0] === next.position[0] &&
    prev.position[1] === next.position[1] &&
    prev.position[2] === next.position[2]
  )
}

export default memo(Seat3D, arePropsEqual)
