import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

/**
 * InteractiveCursor — Luxury Cyber Magnetic Cursor
 * Dual-stage cursor with precision laser dot and trailing elastic glow halo.
 * Reacts magnetically to interactive controls (buttons, links, inputs, cards).
 * Automatically disabled on touch screens and prefers-reduced-motion.
 */
export default function InteractiveCursor() {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  // Silky elastic spring physics for trailing halo
  const springConfig = { stiffness: 400, damping: 28, mass: 0.2 }
  const haloX = useSpring(mouseX, springConfig)
  const haloY = useSpring(mouseY, springConfig)

  useEffect(() => {
    // Only enable on desktop pointer devices
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (!fine.matches || reduceMotion) return

    const onMouseMove = (e) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      if (!visible) setVisible(true)
    }

    const onMouseDown = () => setActive(true)
    const onMouseUp = () => setActive(false)

    const onMouseLeave = () => setVisible(false)
    const onMouseEnter = () => setVisible(true)

    const onPointerOver = (e) => {
      const target = e.target
      if (!target || !(target instanceof HTMLElement)) return
      const interactive = target.closest(
        'button, a, [role="button"], input, select, textarea, .trip-card, .btn-nexus, .btn-holo, .btn-primary, .btn-secondary, .clickable'
      )
      setHovered(Boolean(interactive))
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mousedown', onMouseDown, { passive: true })
    window.addEventListener('mouseup', onMouseUp, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mouseenter', onMouseEnter)
    document.addEventListener('mouseover', onPointerOver, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseenter', onMouseEnter)
      document.removeEventListener('mouseover', onPointerOver)
    }
  }, [mouseX, mouseY, visible, reduceMotion])

  if (reduceMotion) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
      {/* Outer elastic halo */}
      <motion.div
        style={{
          x: haloX,
          y: haloY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          opacity: visible ? 1 : 0,
          scale: active ? 0.75 : hovered ? 1.6 : 1,
          borderColor: hovered ? 'rgba(34, 211, 238, 0.9)' : 'rgba(34, 211, 238, 0.4)',
          backgroundColor: hovered ? 'rgba(34, 211, 238, 0.12)' : 'rgba(34, 211, 238, 0.02)',
          boxShadow: hovered
            ? '0 0 20px 2px rgba(34, 211, 238, 0.5), inset 0 0 10px rgba(34, 211, 238, 0.2)'
            : '0 0 10px rgba(34, 211, 238, 0.2)',
        }}
        transition={{
          scale: { type: 'spring', stiffness: 450, damping: 25 },
          opacity: { duration: 0.15 },
          borderColor: { duration: 0.2 },
          backgroundColor: { duration: 0.2 },
        }}
        className="fixed top-0 left-0 h-9 w-9 rounded-full border border-cyan-400/40 backdrop-blur-[1px]"
      />

      {/* Center precision laser dot */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          opacity: visible ? 1 : 0,
          scale: active ? 0.6 : hovered ? 0.8 : 1,
        }}
        transition={{
          scale: { type: 'spring', stiffness: 500, damping: 28 },
          opacity: { duration: 0.1 },
        }}
        className="fixed top-0 left-0 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(34,211,238,0.9)]"
      />
    </div>
  )
}
