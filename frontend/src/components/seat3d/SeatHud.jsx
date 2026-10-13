import { useMemo, useRef } from 'react'
import { AnimatePresence, motion, useTransform } from 'framer-motion'
import { FaArrowRight, FaBus, FaSyncAlt, FaSearchPlus, FaSearchMinus, FaArrowsAlt, FaUndo, FaVolumeUp, FaVolumeMute, FaChair, FaTimes, FaWifi, FaUsb, FaCouch, FaColumns, FaBolt, FaSnowflake, FaTint } from 'react-icons/fa'
import { SEAT_COLORS } from './seatMeta'
import { SERVICE_CLASS, serviceClassFor, getFleetVariant } from './fleetVariants'
import { useCountUp } from './useCountUp'

const glassStyle = {
  backdropFilter: 'blur(14px)',
  background: 'rgba(15, 23, 42, 0.55)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 20,
  boxShadow: '0 24px 60px -12px rgba(2, 6, 23, 0.85)',
}

// The HUD shows exactly what the backend seats payload carries — seat prices
// and amenity list come straight from SeatMapResponse, so the panel never
// invents line items (the lock-seats `totalFare` is the authoritative total).
const LEGEND = [
  { color: SEAT_COLORS.available, label: 'Available', glyph: '' },
  { color: SEAT_COLORS.selected, label: 'Selected', glyph: '✓' },
  { color: SEAT_COLORS.vip, label: 'VIP', glyph: '👑' },
  { color: SEAT_COLORS.ladies, label: 'Ladies', glyph: '◆' },
  { color: SEAT_COLORS.accessible, label: 'Accessible', glyph: '♿' },
  { color: SEAT_COLORS.locked, label: 'Locked', glyph: '⏳' },
  { color: SEAT_COLORS.booked, label: 'Booked', glyph: '🔒' },
]

// Icon map for amenity strings the backend actually returns (Bus.amenities →
// SeatMapResponse.amenities). Unknown strings fall back to a neutral bullet.
const AMENITY_ICONS = {
  WiFi: FaWifi,
  USB: FaUsb,
  Charging: FaBolt,
  AC: FaSnowflake,
  'Reclining Seats': FaCouch,
  Water: FaTint,
  Curtains: FaColumns,
}

function CamButton({ label, onClick, children, disabled }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 transition hover:border-nexus-500/60 hover:text-nexus-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-nexus-400 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export default function SeatHud({
  trip,
  seatsData,
  serviceClass: serviceClassProp,
  variant: variantProp,
  viewMode = '3d',
  amenities = [],
  model,
  selected = [],
  boardingPointId,
  dropoffPointId,
  onBoardingChange,
  onDropoffChange,
  onBookNow,
  onRemoveSeat,
  locking = false,
  maxSelection = 6,
  muted = false,
  onToggleMute,
  onRotate,
  onZoomIn,
  onZoomOut,
  onPan,
  onReset,
  open = false,
  onClose,
}) {
  const panelRef = useRef(null)
  const bookBtnRef = useRef(null)

  // Fleet-variant theming (spec Section 3). The orchestrator passes the
  // authoritative serviceClass/variant; fall back to the busType derivation so
  // the HUD stays correct even if mounted standalone.
  const serviceClass = serviceClassProp || serviceClassFor(trip?.busType)
  const variant = variantProp || getFleetVariant(serviceClass)
  const isExpress = serviceClass === SERVICE_CLASS.EXPRESS
  const accentHex = variant?.panelAccent || (isExpress ? '#d4af37' : '#3b82f6')
  // Vehicle identity for the panel header: the fleet label wins ("Yutong C12
  // Pro" / "Ashok Leyland Viking"), then the backend's `model` stamp, then
  // nothing — the layout doesn't depend on it, so a missing label is safe.
  const vehicleName = variant?.vehicleName || model || ''
  const theme = {
    accentText: isExpress ? 'text-amber-300' : 'text-blue-300',
    border: isExpress ? `1px solid ${accentHex}66` : '1px solid rgba(255, 255, 255, 0.12)',
    shadow: isExpress
      ? `0 24px 60px -12px rgba(2, 6, 23, 0.85), 0 0 0 1px ${accentHex}24`
      : '0 24px 60px -12px rgba(2, 6, 23, 0.85)',
  }
  const panelStyle = { ...glassStyle, border: theme.border, boxShadow: theme.shadow }

  const fare = seatsData?.farePerSeat ?? trip?.fare ?? 0

  const baseTotal = fare * selected.length
  const total = baseTotal

  // Normal buses carry no VIP trim and no Ladies seats (Ladies only exists on
  // 4-across buses) — drop both legend entries so the panel never advertises a
  // seat type that can't appear on this bus.
  const legend = useMemo(
    () => (isExpress ? LEGEND : LEGEND.filter((l) => l.label !== 'VIP' && l.label !== 'Ladies')),
    [isExpress]
  )

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const totalMv = useCountUp(total, { duration: reducedMotion ? 0 : 0.55 })
  const totalDisplay = useTransform(totalMv, (v) => `LKR ${Math.round(v).toLocaleString()}`)

  const handleRemove = (n) => {
    const idx = selected.indexOf(n)
    onRemoveSeat?.(n)
    // Keep keyboard/screen-reader focus visible: land on the next remaining
    // chip, the previous one, or the Book Now button.
    requestAnimationFrame(() => {
      const chips = panelRef.current?.querySelectorAll('[data-seat-chip]')
      const next = chips?.[idx] ?? chips?.[idx - 1] ?? bookBtnRef.current
      next?.focus()
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="seat-hud"
          id="seatselect-hud"
          ref={panelRef}
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-3 bottom-3 z-30 mx-auto max-h-[calc(100%-1.5rem)] w-auto max-w-[440px] overflow-y-auto rounded-2xl p-4 text-slate-200"
          style={{ ...panelStyle, transformOrigin: 'bottom center' }}
          role="dialog"
          aria-label="Booking panel"
        >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <span>{trip?.departureTime}</span>
            <FaArrowRight className="text-nexus-400" />
            <span>{trip?.arrivalTime}</span>
          </div>
          <div className="mt-0.5 text-sm text-slate-300">
            {trip?.from} → {trip?.to}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            Route {trip?.routeNumber} · {trip?.busType}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                isExpress ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-700/60 text-slate-200'
              }`}
            >
              {variant.label}
            </span>
            {vehicleName && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-200">
                <FaBus className="text-[11px] text-nexus-400" aria-hidden="true" />
                {vehicleName}
              </span>
            )}
          </div>
          {amenities.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
              <span className="sr-only">Amenities:</span>
              {amenities.map((a) => {
                const Icon = AMENITY_ICONS[a]
                return (
                  <span key={a} className="flex items-center gap-1">
                    {Icon ? <Icon aria-hidden="true" /> : <span aria-hidden="true">•</span>}
                    {a}
                  </span>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex items-start gap-2">
          <div className="text-right text-xs text-slate-400">
            <div className="font-semibold text-slate-200">{trip?.operator}</div>
            {/* Backend `model` only repeats the fleet label when it carries extra
                detail — otherwise the header's vehicle identity says it already. */}
            <div>{trip?.busReg}{model && model !== vehicleName ? ` · ${model}` : ''}</div>
            {isExpress && (
              <div className="mt-1 tabular-nums">
                <span className={`font-bold ${theme.accentText}`}>LKR {fare.toLocaleString()}</span>
                <span className="text-slate-400"> / seat</span>
              </div>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close booking panel"
              title="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-700/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-nexus-400"
            >
              <FaTimes aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <label className="label" htmlFor="seatselect-boarding">Boarding point</label>
          <select
            id="seatselect-boarding"
            className="input"
            value={boardingPointId}
            onChange={(e) => onBoardingChange?.(e.target.value)}
            disabled={locking}
          >
            {(trip?.boardingPoints || []).map((bp) => (
              <option key={bp.id} value={bp.id}>
                {bp.name} · {bp.city} · {bp.time}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="seatselect-dropoff">Drop-off point</label>
          <select
            id="seatselect-dropoff"
            className="input"
            value={dropoffPointId}
            onChange={(e) => onDropoffChange?.(e.target.value)}
            disabled={locking}
          >
            {(trip?.dropoffPoints || []).map((dp) => (
              <option key={dp.id} value={dp.id}>
                {dp.name} · {dp.city} · {dp.time}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-700/60 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Selected seats</span>
          <span className="font-semibold text-white tabular-nums">{selected.length}</span>
        </div>
        {selected.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.map((n) => (
              <button
                key={n}
                type="button"
                data-seat-chip
                aria-label={`Remove seat ${n} from selection`}
                title={`Remove seat ${n}`}
                onClick={() => handleRemove(n)}
                className="group inline-flex items-center gap-1 rounded-full bg-nexus-500/20 py-0.5 pl-2.5 pr-1.5 text-xs font-semibold text-nexus-300 tabular-nums transition hover:bg-nexus-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-nexus-400"
              >
                {n}
                <span
                  className="grid h-4 w-4 place-items-center rounded-full bg-nexus-500/30 text-[10px] text-nexus-300 transition group-hover:bg-nexus-500/50"
                  aria-hidden="true"
                >
                  <FaTimes />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-300">Tap a seat to select it (max {maxSelection})</p>
        )}
        {/* Fare breakdown: Express shows per-seat price up-front (price always
            visible); Normal reveals it only once a seat is tapped (price on
            tap/hover — the Seat3D hover tooltip covers hover). */}
        {(isExpress || selected.length > 0) && (
          <div className="mt-3 space-y-1.5 border-t border-slate-700/60 pt-2.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="tabular-nums">
                <FaChair className={`mr-1 inline ${theme.accentText}`} />
                {selected.length} × LKR {fare.toLocaleString()}
              </span>
              <span className="tabular-nums text-slate-300">LKR {baseTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-700/60 pt-1.5">
              <span className="text-sm font-semibold text-slate-200">Total</span>
              <span className={`text-lg font-extrabold tabular-nums ${theme.accentText}`}>
                <motion.span aria-hidden="true">{totalDisplay}</motion.span>
                <span className="sr-only">LKR {total.toLocaleString()}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 sm:grid-cols-4">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 shrink-0 rounded-sm border border-white/40"
              style={{ background: l.color }}
              aria-hidden="true"
            />
            {l.glyph && (
              <span className="shrink-0 text-[11px] leading-none" aria-hidden="true">
                {l.glyph}
              </span>
            )}
            {l.label}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {viewMode === '3d' && (
          <CamButton label="Rotate camera" onClick={onRotate} disabled={locking}>
            <FaSyncAlt />
          </CamButton>
        )}
        <CamButton label="Zoom in" onClick={onZoomIn} disabled={locking}>
          <FaSearchPlus />
        </CamButton>
        <CamButton label="Zoom out" onClick={onZoomOut} disabled={locking}>
          <FaSearchMinus />
        </CamButton>
        {viewMode === '3d' && (
          <CamButton label="Pan camera" onClick={onPan} disabled={locking}>
            <FaArrowsAlt />
          </CamButton>
        )}
        <CamButton label="Reset view" onClick={onReset} disabled={locking}>
          <FaUndo />
        </CamButton>
        <button
          type="button"
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          aria-pressed={muted}
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
          onClick={onToggleMute}
          className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 transition hover:border-nexus-500/60 hover:text-nexus-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-nexus-400"
        >
          {muted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
      </div>

      <button
        ref={bookBtnRef}
        id="seatselect-book-now"
        type="button"
        className="btn-nexus mt-4 w-full tabular-nums"
        disabled={selected.length === 0 || locking}
        aria-busy={locking}
        onClick={onBookNow}
      >
        {locking ? 'Locking seats…' : `Book Now · LKR ${total.toLocaleString()}`}
      </button>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
