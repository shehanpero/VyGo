import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FaSync } from 'react-icons/fa'

// Pull-to-refresh for touch devices (Capacitor WebView). Listens at the window
// level so it works with whatever element actually scrolls the page, and only
// arms when the page is scrolled to the very top. Honors the app-wide
// reduced-motion toggle through MotionConfig.
const THRESHOLD = 56
const MAX_PULL = 90

export default function PullToRefresh({ onRefresh, children, className }) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const pullRef = useRef(0)

  useEffect(() => {
    const atTop = () =>
      (window.scrollY || document.documentElement.scrollTop || 0) <= 0

    const onStart = (e) => {
      if (!atTop() || refreshing) {
        startY.current = null
        return
      }
      startY.current = e.touches ? e.touches[0].clientY : null
    }
    const onMove = (e) => {
      if (startY.current == null) return
      const y = e.touches ? e.touches[0].clientY : null
      if (y == null) return
      const delta = y - startY.current
      if (delta <= 0) {
        pullRef.current = 0
        setPull(0)
        return
      }
      const next = Math.min(delta * 0.5, MAX_PULL)
      pullRef.current = next
      setPull(next)
    }
    const onEnd = async () => {
      if (startY.current == null) return
      startY.current = null
      if (pullRef.current > THRESHOLD) {
        setRefreshing(true)
        setPull(40)
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
          setPull(0)
          pullRef.current = 0
        }
      } else {
        setPull(0)
        pullRef.current = 0
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [onRefresh, refreshing])

  return (
    <div className={className}>
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden text-nexus-400"
        style={{ height: pull }}
        aria-hidden="true"
      >
        <motion.div
          className="text-lg"
          animate={{ rotate: refreshing ? 360 : 0 }}
          transition={
            refreshing
              ? { repeat: Infinity, duration: 0.8, ease: 'linear' }
              : { duration: 0.2 }
          }
        >
          <FaSync />
        </motion.div>
      </div>
      {children}
    </div>
  )
}
