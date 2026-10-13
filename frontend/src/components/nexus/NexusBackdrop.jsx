import { useEffect, useRef } from 'react'

/**
 * NexusBackdrop — fixed, site-wide cinematic atmosphere:
 *  - animated aurora blobs (::before/::after in CSS)
 *  - cursor-following spotlight
 *  - scroll progress bar
 * Renders no visible layout; everything is pointer-events:none.
 */
export default function NexusBackdrop() {
  const screenRef = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const updateMouse = (e) => {
      const s = screenRef.current
      if (!s) return
      s.style.setProperty('--mx', `${e.clientX}px`)
      s.style.setProperty('--my', `${e.clientY}px`)
    }
    const toggle = (on) => () => {
      const s = screenRef.current
      if (s) s.classList.toggle('is-on', on)
    }
    const onEnter = toggle(true)
    const onLeave = toggle(false)
    if (fine.matches) {
      window.addEventListener('mousemove', updateMouse)
      window.addEventListener('mouseover', onEnter)
      window.addEventListener('mouseout', onLeave)
    }

    const onScroll = () => {
      const el = document.querySelector('.scroll-progress')
      if (!el) return
      const total = document.documentElement.scrollHeight - window.innerHeight
      const p = total > 0 ? window.scrollY / total : 0
      el.style.transform = `scaleX(${p})`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener('mousemove', updateMouse)
      window.removeEventListener('mouseover', onEnter)
      window.removeEventListener('mouseout', onLeave)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div ref={screenRef}>
      <div className="aurora" aria-hidden="true" />
      <div className="spotlight" aria-hidden="true" />
      <div className="scroll-progress" aria-hidden="true" />
    </div>
  )
}