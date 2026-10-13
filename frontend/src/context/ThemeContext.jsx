import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { MotionConfig } from 'framer-motion'

const STORAGE_THEME = 'vygo-theme' // 'dark' | 'light' | 'system'
const STORAGE_MOTION = 'vygo-motion' // 'full' | 'reduced'

const ThemeContext = createContext(null)

function systemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function systemPrefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function resolveTheme(theme) {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return theme
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = resolveTheme(theme)
}

function applyMotion(motion) {
  if (typeof document === 'undefined') return
  const reduced = motion === 'reduced' || (motion === 'system' && systemPrefersReducedMotion())
  document.documentElement.classList.toggle('reduce-motion', reduced)
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem(STORAGE_THEME) || 'system'
  })
  const [motion, setMotionState] = useState(() => {
    if (typeof window === 'undefined') return 'system'
    return localStorage.getItem(STORAGE_MOTION) || 'system'
  })

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_THEME, theme)
  }, [theme])

  useEffect(() => {
    applyMotion(motion)
    localStorage.setItem(STORAGE_MOTION, motion)
  }, [motion])

  // React to OS theme / motion changes when in "system" mode.
  useEffect(() => {
    if (!window.matchMedia) return
    const onTheme = () => theme === 'system' && applyTheme('system')
    const onMotion = () => motion === 'system' && applyMotion('system')
    const themeMq = window.matchMedia('(prefers-color-scheme: dark)')
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    themeMq.addEventListener?.('change', onTheme)
    motionMq.addEventListener?.('change', onMotion)
    return () => {
      themeMq.removeEventListener?.('change', onTheme)
      motionMq.removeEventListener?.('change', onMotion)
    }
  }, [theme, motion])

  const setTheme = useCallback((t) => setThemeState(t), [])
  const setMotion = useCallback((m) => setMotionState(m), [])

  const value = {
    theme,
    motion,
    resolvedTheme: resolveTheme(theme),
    reducedMotion: motion === 'reduced' || (motion === 'system' && systemPrefersReducedMotion()),
    setTheme,
    setMotion,
  }

  return (
    <ThemeContext.Provider value={value}>
      {/* In-app "Reduced motion" toggle → 'always'; otherwise honour the OS pref.
          This makes every framer-motion animation (page transitions, seat-snap)
          respect the same setting as the CSS-layer animations. */}
      <MotionConfig reducedMotion={value.reducedMotion ? 'always' : 'user'}>{children}</MotionConfig>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Safe defaults when used outside a provider (e.g. ConnectScreen pre-boot).
    return {
      theme: 'system',
      motion: 'system',
      resolvedTheme: 'dark',
      reducedMotion: false,
      setTheme: () => {},
      setMotion: () => {},
    }
  }
  return ctx
}
