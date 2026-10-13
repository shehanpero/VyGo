import { useState, useRef, useEffect } from 'react'
import { FaSun, FaMoon, FaCircleHalfStroke, FaWind, FaPause, FaGlobe } from 'react-icons/fa6'
import { useTheme } from '../context/ThemeContext'
import { useI18n } from '../i18n'

function IconToggle({ label, title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      title={title}
      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700/70 bg-slate-800/50 text-slate-300 transition-colors hover:border-nexus-400/60 hover:text-nexus-300"
    >
      {children}
    </button>
  )
}

export default function SettingsControls({ className = '' }) {
  const { theme, motion, setTheme, setMotion } = useTheme()
  const { lang, setLang, t, langs, langLabels } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const next = (current, opts) => opts[(opts.indexOf(current) + 1) % opts.length]

  const themeIcon = theme === 'light' ? <FaSun /> : theme === 'dark' ? <FaMoon /> : <FaCircleHalfStroke />
  const themeTitle = `${t('settings.theme')}: ${
    theme === 'light' ? t('settings.theme.light') : theme === 'dark' ? t('settings.theme.dark') : t('settings.theme.system')
  }`

  const motionIcon = motion === 'reduced' ? <FaPause /> : motion === 'system' ? <FaCircleHalfStroke /> : <FaWind />
  const motionTitle = `${t('settings.motion')}: ${
    motion === 'reduced' ? t('settings.motion.reduced') : motion === 'system' ? t('settings.motion.system') : t('settings.motion.full')
  }`

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <IconToggle label="theme" title={themeTitle} onClick={() => setTheme(next(theme, ['dark', 'light', 'system']))}>
        {themeIcon}
      </IconToggle>

      <IconToggle label="motion" title={motionTitle} onClick={() => setMotion(next(motion, ['full', 'reduced', 'system']))}>
        {motionIcon}
      </IconToggle>

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={t('settings.language')}
          title={t('settings.language')}
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700/70 bg-slate-800/50 text-slate-300 transition-colors hover:border-nexus-400/60 hover:text-nexus-300"
        >
          <FaGlobe />
        </button>
        {open && (
          <div className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/95 p-1 shadow-xl backdrop-blur-xl">
            {langs.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLang(l)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  lang === l ? 'bg-nexus-500/15 text-nexus-300' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {langLabels[l]}
                {lang === l && <span className="text-nexus-400">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
