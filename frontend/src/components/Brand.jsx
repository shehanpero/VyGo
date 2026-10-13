import { Link } from 'react-router-dom'

export function BrandIcon({ size = 40, className = '', alt = 'VyGo' }) {
  return (
    <img
      src="/vygoicon.png"
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover shadow-lg shadow-black/30 ring-1 ring-white/15 ${className}`}
    />
  )
}

export function Logo({ size = 36, showText = true, link = true }) {
  const content = (
    <>
      <BrandIcon size={size} />
      {showText && (
        <span className="flex flex-col leading-tight">
          <span className="text-lg font-extrabold tracking-tight text-white">VyGo</span>
          <span className="hidden text-[11px] font-medium text-slate-400 sm:block">Sri Lanka Bus Booking</span>
        </span>
      )}
    </>
  )
  if (!link) {
    return <span className="flex items-center gap-2.5">{content}</span>
  }
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="VyGo home">
      {content}
    </Link>
  )
}
