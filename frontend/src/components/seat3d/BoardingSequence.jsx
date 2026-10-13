import { useEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import { useThree } from '@react-three/fiber'
import { playDoorHiss } from './Sound'

const glassPanelStyle = {
  backdropFilter: 'blur(14px)',
  background: 'rgba(15, 23, 42, 0.55)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 20,
  boxShadow: '0 24px 60px -12px rgba(2, 6, 23, 0.85)',
}

export default function BoardingSequence({ phase = 1, onSkip, reducedMotion = false, variant = null }) {
  const showPanel = phase >= 1 && phase <= 4
  const isNormal = variant?.serviceClass === 'normal'
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
      <style>{`@keyframes seat3dShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }`}</style>
      {showPanel && (
        <div
          className="pointer-events-auto glow-border w-full max-w-sm p-6 text-center text-slate-100"
          style={glassPanelStyle}
          role="status"
          aria-live="polite"
        >
          <div className="mb-3 text-3xl">🚌</div>
          <h2 className="font-display text-lg font-bold text-white">
            <span className={reducedMotion ? 'text-nexus-300' : 'gradient-text'}>
              {isNormal ? 'Boarding your coach' : 'Preparing luxury coach'}
            </span>
          </h2>
          <div className="scan-divider mx-auto mt-2 w-2/3" aria-hidden="true" />
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-nexus-400 to-transparent"
              style={reducedMotion ? { width: '50%', background: '#10b981', borderRadius: '9999px' } : { animation: 'seat3dShimmer 1.4s ease-in-out infinite' }}
            />
          </div>
          {phase >= 2 && (
            <p className="mt-3 text-sm text-slate-300">
              {isNormal ? 'Step aboard your coach' : 'Step aboard the luxury coach'}
            </p>
          )}
          {!reducedMotion && (
            <button type="button" onClick={onSkip} autoFocus className="btn-secondary mt-5 w-full">
              Skip intro
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Spatial review (docs/ue-scene-composition.md §7): the old settle left
// the right third of the frame as exterior void and framed the seat-backs
// below center. Pulled to x 3.2 / z 7.2 so the coach fills the frame, and
// the target raised to cushion height (ty 1.25) so seat-back faces sit
// just below frame center with the dusk world readable above the roof.
const SETTLE_CAM = { x: 3.2, y: 7.4, z: 7.2, tx: 0, ty: 1.25, tz: 0.3 }

export function IntroRig({ onComplete, onPhase, busAnim, skipSignal = 0, variant = null }) {
  const { camera } = useThree()
  const tlRef = useRef(null)

  const cam = useMemo(
    () => ({ x: 11, y: 5.5, z: 10, tx: 0, ty: 1.6, tz: 0 }),
    []
  )

  // Aisle pass differs per service class: the 2+3 Viking's aisle is ~0.29 m
  // wide (vs 0.58 for the 2+2 Express), so Normal hugs the aisle centerline
  // (tighter X) and aims at a nearer, slightly higher point so the 5-across
  // seat backs never clip the frame. Default (missing variant) = Express.
  const isNormal = variant?.serviceClass === 'normal'

  useEffect(() => {
    camera.position.set(cam.x, cam.y, cam.z)
    camera.lookAt(cam.tx, cam.ty, cam.tz)

    const apply = () => {
      camera.position.set(cam.x, cam.y, cam.z)
      camera.lookAt(cam.tx, cam.ty, cam.tz)
    }

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onUpdate: apply,
      onComplete: () => onComplete?.(),
    })
    tlRef.current = tl

    const phase = (n, at) => tl.call(() => onPhase?.(n), [], at)

    // Total ≤ 9s (Game Designer review): yaw 4.2s, door 0.9s, aisle pass 2.0s,
    // settle 1.0s → 0.2 + 8.5 ≈ 8.7s.
    tl.to(busAnim.current, { yaw: Math.PI * 2, duration: 4.2, ease: 'power1.inOut' }, 0.2)
    phase(2, 0.6)
    tl.to(cam, { x: 5.2, y: 2.4, z: -5.4, tx: 1.3, ty: 1.3, tz: -4.9, duration: 1.1 }, 0.7)
    phase(3, 1.7)
    // Label the door-open phase so the pneumatic hiss stays locked to the
    // door tween even if the timeline is retimed later.
    tl.addLabel('doorOpen', 1.8)
    tl.to(busAnim.current, { door: 1, duration: 0.9, ease: 'power2.out' }, 'doorOpen')
    tl.call(() => playDoorHiss(), [], 'doorOpen')
    phase(4, 2.7)
    tl.to(cam, { x: 0.7, y: 1.6, z: -4.1, tx: 0, ty: 1.2, tz: -2.0, duration: 1.2 }, 2.8)
    tl.to(busAnim.current, { shell: 0, duration: 1.1, ease: 'power1.inOut' }, 2.9)
    phase(5, 4.0)
    tl.to(
      cam,
      isNormal
        ? { x: 0.06, y: 1.68, z: 1.6, tx: 0.02, ty: 1.5, tz: -1.55, duration: 2.0, ease: 'power1.inOut' }
        : { x: 0, y: 1.65, z: 1.6, tx: 0, ty: 1.35, tz: -2.2, duration: 2.0, ease: 'power1.inOut' },
      4.1
    )
    phase(6, 6.1)
    tl.to(cam, { x: 0.5, y: 3.6, z: 3.8, tx: 0, ty: 1.2, tz: -0.4, duration: 1.0 }, 6.2)
    phase(7, 7.2)
    tl.to(
      cam,
      { x: SETTLE_CAM.x, y: SETTLE_CAM.y, z: SETTLE_CAM.z, tx: SETTLE_CAM.tx, ty: SETTLE_CAM.ty, tz: SETTLE_CAM.tz, duration: 1.0, ease: 'power2.inOut' },
      7.3
    )

    return () => {
      tl.kill()
      tlRef.current = null
      gsap.killTweensOf([cam, busAnim.current])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Skip blend ≤ 0.35s (Game Designer review): killing the timeline on unmount
  // snapped the camera straight to SETTLE_CAM with no transition. When the skip
  // button fires, kill the intro timeline and glide to the settle camera over
  // 0.35s, then complete exactly like a natural intro finish.
  useEffect(() => {
    if (skipSignal === 0) return
    const tl = tlRef.current
    if (tl) {
      tl.kill()
      tlRef.current = null
    }
    gsap.killTweensOf([cam, busAnim.current])
    const apply = () => {
      camera.position.set(cam.x, cam.y, cam.z)
      camera.lookAt(cam.tx, cam.ty, cam.tz)
    }
    const blend = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onUpdate: apply,
      onComplete: () => onComplete?.(),
    })
    blend.to(busAnim.current, { shell: 0, duration: 0.35, ease: 'power1.out' }, 0)
    blend.to(
      cam,
      { x: SETTLE_CAM.x, y: SETTLE_CAM.y, z: SETTLE_CAM.z, tx: SETTLE_CAM.tx, ty: SETTLE_CAM.ty, tz: SETTLE_CAM.tz, duration: 0.35 },
      0
    )
    return () => {
      blend.kill()
      gsap.killTweensOf([cam, busAnim.current])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipSignal])

  return null
}

export { SETTLE_CAM }
