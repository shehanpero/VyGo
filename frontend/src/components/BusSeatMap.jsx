import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { FaCheckCircle, FaDoorOpen, FaLock, FaTachometerAlt } from 'react-icons/fa'

const isNormal = (busType) => String(busType || '').toUpperCase() === 'NORMAL'

const SEAT_SIZES = {
  sm: 'h-9 w-9 rounded-md text-xs',
  md: 'h-11 w-11 rounded-lg text-sm',
}

const BLANK_SIZES = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
}

export default function BusSeatMap({ seats = [], capacity = 0, busType = '', selected = [], onToggle, size = 'md' }) {
  const byNumber = useMemo(() => {
    const map = new Map()
    for (const s of seats) map.set(String(s.seatNumber), s)
    return map
  }, [seats])

  const layout = useMemo(() => {
    const left = isNormal(busType) ? 3 : 2
    const right = 2
    const perRow = left + right
    const fullRows = Math.floor(capacity / perRow)
    const remainder = capacity % perRow
    return { left, right, perRow, fullRows, remainder }
  }, [capacity, busType])

  const { left, right, perRow, fullRows, remainder } = layout
  const seatSize = SEAT_SIZES[size] ?? SEAT_SIZES.md
  const blankSize = BLANK_SIZES[size] ?? BLANK_SIZES.md

  const seatAt = (number) => byNumber.get(String(number))

  const seatBtn = (seat, key) => {
    if (!seat) {
      return <div key={key} className={`${blankSize} border border-transparent`} aria-hidden="true" />
    }
    const isSelected = selected.includes(seat.seatNumber)
    const unavailable = seat.status === 'BOOKED' || seat.status === 'LOCKED'
    const cls =
      seat.status === 'BOOKED'
        ? 'bg-red-500/20 text-red-400 border-red-500/60'
        : seat.status === 'LOCKED'
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/60'
          : isSelected
            ? 'bg-nexus-500 text-slate-950 border-nexus-400 shadow-lg shadow-nexus-500/25'
            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-nexus-500 hover:bg-slate-700'
    return (
      <motion.button
        key={key}
        type="button"
        disabled={unavailable}
        aria-pressed={unavailable ? undefined : isSelected}
        title={
          seat.status === 'LOCKED'
            ? `Seat ${seat.seatNumber} — locked${seat.lockExpiresAt ? ` until ${new Date(seat.lockExpiresAt).toLocaleString()}` : ''}`
            : seat.status === 'BOOKED'
              ? `Seat ${seat.seatNumber} — booked${seat.passengerName ? ` · ${seat.passengerName}` : ''}`
              : `Seat ${seat.seatNumber}`
        }
        onClick={() => {
          if (!unavailable && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12)
          onToggle?.(seat)
        }}
        whileTap={unavailable ? undefined : { scale: 0.9 }}
        animate={isSelected ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: 'transform' }}
        className={`relative grid place-items-center border font-bold transition-colors ${seatSize} ${cls} ${unavailable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {seat.status === 'LOCKED' ? (
          <FaLock className={size === 'sm' ? 'text-[10px]' : 'text-xs'} />
        ) : (
          seat.seatNumber
        )}
        {isSelected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className={`absolute -right-1.5 -top-1.5 ${size === 'sm' ? 'text-[10px]' : 'text-xs'} text-nexus-300`}
          >
            <FaCheckCircle />
          </motion.span>
        )}
      </motion.button>
    )
  }

  const leftRows = []
  const rightRows = []
  for (let r = 0; r < fullRows; r++) {
    leftRows.push(
      <div key={r} className="flex justify-start gap-2">
        {Array.from({ length: left }, (_, p) => {
          const n = r * perRow + p + 1
          return seatBtn(seatAt(n), `l-${n}`)
        })}
      </div>
    )
    rightRows.push(
      <div key={r} className="flex justify-end gap-2">
        {Array.from({ length: right }, (_, p) => {
          const n = r * perRow + left + p + 1
          return seatBtn(seatAt(n), `r-${n}`)
        })}
      </div>
    )
  }

  const bench = []
  if (remainder > 0) {
    const start = fullRows * perRow + 1
    const leftPad = Math.floor((perRow - remainder) / 2)
    const rightPad = perRow - remainder - leftPad
    for (let i = 0; i < leftPad; i++) bench.push(<div key={`bp-${i}`} className={blankSize} aria-hidden="true" />)
    for (let i = 0; i < remainder; i++) bench.push(seatBtn(seatAt(start + i), `bench-${start + i}`))
    for (let i = 0; i < rightPad; i++) bench.push(<div key={`rp-${i}`} className={blankSize} aria-hidden="true" />)
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="mb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          ▲ Front of bus
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800/60 py-2.5">
            <FaTachometerAlt className="text-slate-400" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Driver</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-700 py-2.5">
            <FaDoorOpen className="text-slate-400" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Entrance</span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <div className="space-y-2">{leftRows}</div>
          <div className="flex w-6 flex-col items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-700" />
            <span className="w-px flex-1 bg-slate-700" />
            <span className="h-2 w-2 rounded-full bg-slate-700" />
          </div>
          <div className="space-y-2">{rightRows}</div>
        </div>

        {remainder > 0 && (
          <>
            <div className="my-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-slate-800" />
              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-600">Rear bench</span>
              <span className="h-px flex-1 bg-slate-800" />
            </div>
            <div className="flex justify-center gap-2">{bench}</div>
          </>
        )}
      </div>
    </div>
  )
}
