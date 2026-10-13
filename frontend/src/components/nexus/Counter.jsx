import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

/**
 * Counter — animates a number from a start value to a target when scrolled
 * into view. Uses requestAnimationFrame with an ease-out curve.
 */
export default function Counter({
  to,
  from = 0,
  duration = 1600,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  format,
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [val, setVal] = useState(from)

  useEffect(() => {
    if (!inView) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, from, duration])

  const render =
    typeof format === 'function'
      ? format(val)
      : val.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {render}
      {suffix}
    </span>
  )
}