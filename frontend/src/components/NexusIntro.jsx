import { useEffect, useState } from 'react'
import { BrandIcon } from './Brand'

export default function NexusIntro({ onDone }) {
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setGone(true), 2100)
    const t2 = setTimeout(() => onDone?.(), 2650)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div className={`intro-stage ${gone ? 'intro-gone' : ''}`} aria-hidden="true">
      <div className="intro-blob intro-blob-1" />
      <div className="intro-blob intro-blob-2" />
      <div className="relative grid place-items-center">
        <div className="intro-burst" />
        <div className="intro-icon">
          <BrandIcon size={96} className="shadow-2xl shadow-nexus-500/20 ring-2 ring-cyan-400/30" alt="" />
        </div>
      </div>
      <div className="intro-title absolute bottom-[16%] w-full text-center">
        <div className="font-display text-2xl font-extrabold tracking-[0.22em] text-white">VyGo</div>
        <div className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.4em] text-nexus-400">
          Sri Lanka Bus Booking
        </div>
      </div>
      <div className="intro-scan" />
    </div>
  )
}