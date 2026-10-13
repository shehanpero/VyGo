import { useMemo } from 'react'
import * as THREE from 'three'
import { Bloom, SSAO, DepthOfField, Vignette } from '@react-three/postprocessing'
import { useDeviceProfile } from './deviceProfile'

// Re-export the variant tier-cap helper so the Frontend agent can cap the
// EffectComposer passes in SeatSelect3D with the SAME helper the scene
// materials use — one source of truth for the capped tier.
export { effectiveTier } from './deviceProfile'

/**
 * tieredEffects.jsx — tier-aware rendering helpers.
 *
 * 1. POST_PROCESSING_PRESETS: which passes each tier may instantiate.
 * 2. TieredEffectPasses: a drop-in fragment intended for the orchestrator's
 *    <EffectComposer> (SeatSelect3D.jsx owns that composer and currently keeps
 *    its own Bloom + gated DepthOfField — this component is the ready-to-wire
 *    tiered alternative; it instantiates nothing unless mounted).
 * 3. ContactShadowBlob: a cheap, shared-texture radial "contact shadow" placed
 *    ONLY under the hovered/selected seat (see Task 5). We deliberately avoid
 *    drei <ContactShadows> per seat: each instance re-renders the ENTIRE scene
 *    into its own 512×512 FBO every frame, so 6 selected + 1 hovered seats
 *    would mean 7 full-scene depth passes per frame.
 */

export const POST_PROCESSING_PRESETS = {
  high: { bloom: true, ssao: true, dof: true },
  mid: { bloom: true, ssao: false, dof: false },
  low: { bloom: false, ssao: false, dof: false },
}

/**
 * Render the EffectComposer children that match the current device tier.
 * Place inside the orchestrator's <EffectComposer>:
 *
 *   <EffectComposer enableNormalPass={profile.tier === 'high'}>
 *     <TieredEffectPasses />
 *   </EffectComposer>
 *
 * NOTE: SSAO requires `enableNormalPass` on the parent EffectComposer.
 */
export function TieredEffectPasses({ profile: profileProp }) {
  const profile = profileProp || useDeviceProfile()
  const { bloom, ssao, dof } =
    POST_PROCESSING_PRESETS[profile.tier] || POST_PROCESSING_PRESETS.low
  if (!bloom && !ssao && !dof) return null
  return (
    <>
      {bloom && <Bloom luminanceThreshold={0.72} intensity={0.55} mipmapBlur radius={0.72} />}
      {ssao && (
        <SSAO
          samples={12}
          rings={3}
          distanceThreshold={0.9}
          distanceFalloff={0.03}
          rangeThreshold={0.5}
          rangeFalloff={0.1}
          luminanceInfluence={0.7}
          radius={0.45}
          bias={0.4}
          intensity={3}
        />
      )}
      {dof && <DepthOfField focusDistance={0.02} focalLength={0.08} bokehScale={2} />}
      {/* Cinematic vignette — darkens the frame edges so the glowing cabin and
          seat highlights read as the hero of the scene. Only on high tier. */}
      {bloom && <Vignette offset={0.28} darkness={0.62} />}
    </>
  )
}

/* ------------------------------------------------------------------ *
 * ContactShadowBlob — cheap "contact shadow" for the hovered/selected seat
 * ------------------------------------------------------------------ */

let blobTexture = null

function getBlobTexture() {
  if (blobTexture) return blobTexture
  if (typeof document === 'undefined') return null
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.08,
      size / 2,
      size / 2,
      size / 2
    )
    g.addColorStop(0, 'rgba(2, 6, 23, 0.9)')
    g.addColorStop(0.45, 'rgba(2, 6, 23, 0.5)')
    g.addColorStop(1, 'rgba(2, 6, 23, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  blobTexture = new THREE.CanvasTexture(canvas)
  blobTexture.needsUpdate = true
  return blobTexture
}

/**
 * A soft radial darkening on the floor under ONE seat. Uses a single shared
 * CanvasTexture (created once, module-scope) so the per-frame cost is one
 * transparent draw call. It lives OUTSIDE the animated seat group so it does
 * not lift/scale with the seat's hover/select animation.
 */
export function ContactShadowBlob({
  opacity = 0.55,
  radius = 0.55,
  y = 0.006,
  offsetZ = 0.06,
}) {
  const texture = useMemo(getBlobTexture, [])
  if (!texture) return null
  return (
    <mesh position={[0, y, offsetZ]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
