import { useEffect } from 'react'
import { animate, useMotionValue } from 'framer-motion'

/**
 * Tween a number to `target` with framer-motion's `animate`, instead of a
 * hard number swap. Returns a MotionValue<number>; render it directly as a
 * `<motion.span>` child or pipe it through `useTransform` for formatting:
 *
 *   const total = useCountUp(amount, { duration: 0.55 })
 *   const display = useTransform(total, (v) => `LKR ${Math.round(v).toLocaleString()}`)
 *   <motion.span aria-hidden="true">{display}</motion.span>
 *
 * Respects `prefers-reduced-motion` by jumping straight to the target when the
 * caller passes `duration: 0`.
 */
export function useCountUp(target, { duration = 0.55, ease = 'easeOut' } = {}) {
  const motionValue = useMotionValue(0)

  useEffect(() => {
    const controls = animate(motionValue, target, { duration, ease })
    return () => controls.stop()
  }, [target, duration, ease, motionValue])

  return motionValue
}
