import { Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * RedirectWrapper — wraps <Routes> in an <AnimatePresence> keyed by the
 * current pathname so every navigation cross-fades + slides like a premium
 * SPA. Children must be the app's <Routes> element.
 */
export default function RedirectWrapper({ children }) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <Suspense fallback={null}>{children}</Suspense>
      </motion.div>
    </AnimatePresence>
  )
}