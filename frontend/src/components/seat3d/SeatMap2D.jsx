import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { FaSearchPlus, FaSearchMinus, FaUndo } from 'react-icons/fa'
import {
  SEAT_COLORS,
  getSeatCategory,
  seatAriaLabel,
  seatGlyphFor,
  seatStateLabelFor,
} from './seatMeta'
import {
  buildSeatMapGeometry,
  seatToPx,
  BUS_TOP_Y,
  BUS_W_U,
  CELL_H,
  CX_U,
  DOOR_Z_RANGE,
  MAP_WIDTH,
  ACCESSIBLE_PAD,
  ROW_START_Z,
  Y_TOP,
} from './seatMap2dLayout'

const HIT_PAD = 6 // interactive hit area extends beyond the visible cell

function seatColor(seat, category, isSelected) {
  if (isSelected) return SEAT_COLORS.selected
  if (seat.status === 'BOOKED') return SEAT_COLORS.booked
  if (seat.status === 'LOCKED' || seat.status === 'RESERVED') return SEAT_COLORS.locked
  if (category === 'vip') return SEAT_COLORS.vip
  if (category === 'ladies') return SEAT_COLORS.ladies
  if (category === 'accessible') return SEAT_COLORS.accessible
  return SEAT_COLORS.available
}

const SeatCell = forwardRef(function SeatCell(
  {
    seat,
    layout,
    geometry,
    selected,
    farePerSeat,
    serviceClass,
    tabIndex,
    onToggle,
    onMove,
  },
  ref,
) {
  const n = Number(seat.seatNumber)
  const category = getSeatCategory(n, layout)
  const isSelected = selected.includes(n)
  const unavailable = seat.status !== 'AVAILABLE'
  const { xPx, yPx } = seatToPx(n, layout)

  const isAccessible = category === 'accessible'
  const cellW = geometry.cellW + (isAccessible ? ACCESSIBLE_PAD : 0)
  const halfW = cellW / 2
  const halfH = CELL_H / 2

  // Roving tabindex: focused seat carries 0, everything else -1. Unavailable
  // seats stay in the roving order (spec §8) but ignore pointer input.
  const handleKeyDown = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      onMove(e.key.replace('Arrow', '').toLowerCase())
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(n, true)
    }
  }

  const color = seatColor(seat, category, isSelected)
  const glyph = seatGlyphFor(category, seat.status, isSelected)
  const stateLabel = seatStateLabelFor(seat.status, isSelected)
  const isTextGlyph = glyph === '✓' || glyph === '◆'

  const popKey = `${n}-${isSelected ? 'sel' : 'un'}`

  return (
    <g
      ref={ref}
      className={`vygo-seat is-${stateLabel} ${unavailable ? 'is-unavailable' : ''}`}
      role="button"
      tabIndex={tabIndex}
      aria-label={seatAriaLabel(n, seat.status, isSelected, category, farePerSeat, serviceClass)}
      aria-pressed={unavailable ? undefined : isSelected}
      aria-disabled={unavailable ? 'true' : undefined}
      transform={`translate(${xPx}, ${yPx})`}
      onClick={() => onToggle(n, true)}
      onKeyDown={handleKeyDown}
    >
      <rect
        className="vygo-seat-hit"
        x={-halfW - HIT_PAD}
        y={-halfH - HIT_PAD}
        width={cellW + HIT_PAD * 2}
        height={CELL_H + HIT_PAD * 2}
        rx={10}
        fill="rgba(0,0,0,0)"
      />
      <g className="vygo-seat-body">
        <g key={popKey} className="vygo-seat-pop">
          <rect
            className="vygo-seat-rect"
            x={-halfW}
            y={-halfH}
            width={cellW}
            height={CELL_H}
            rx={7}
            fill={color}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1.2}
          />
          {glyph && (
            <text
              className={`vygo-seat-glyph ${isTextGlyph ? 'vygo-seat-glyph-text' : ''}`}
              x={0}
              y={isTextGlyph ? 0.5 : 0}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isAccessible ? 26 : 20}
            >
              {glyph}
            </text>
          )}
          {isSelected && (
            <text
              className="vygo-seat-number"
              x={0}
              y={halfH - 3.5}
              textAnchor="middle"
              fontSize={9}
              fill="rgba(255,255,255,0.85)"
            >
              {n}
            </text>
          )}
        </g>
      </g>
    </g>
  )
})

const SeatMap2D = forwardRef(function SeatMap2D(
  {
    seatsData,
    capacity,
    busType,
    serviceClass,
    selected,
    focusIndex,
    onFocusIndexChange,
    computeMoveIndex,
    onToggle,
    farePerSeat,
  },
  ref
) {
  const geometry = useMemo(
    () => buildSeatMapGeometry(capacity, busType, serviceClass),
    [capacity, busType, serviceClass]
  )
  const { layout } = geometry

  const seats = useMemo(
    () =>
      (seatsData?.seats || [])
        .map((s) => ({ ...s, seatNumber: Number(s.seatNumber) }))
        .filter((s) => Number.isFinite(s.seatNumber))
        .sort((a, b) => a.seatNumber - b.seatNumber),
    [seatsData]
  )

  const cellRefs = useRef([])
  const scrollRef = useRef(null)

  // Zoom state: 1 = fit-width (default per spec §1), up to 4.
  const [zoom, setZoom] = useState(1)
  const [containerW, setContainerW] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width
      if (w > 0) setContainerW(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const base = containerW > 0 ? containerW / MAP_WIDTH : 1 // px per unit
  const surfaceW = MAP_WIDTH * base * zoom
  const surfaceH = geometry.viewBoxH * base * zoom

  // Land at the front of the bus (top of the map) on first paint.
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: 0, left: 0 })
  }, [])

  const zoomIn = () => setZoom((z) => Math.min(4, Math.round(z * 1.5 * 100) / 100))
  const zoomOut = () => setZoom((z) => Math.max(1, Math.round((z / 1.5) * 100) / 100))
  const resetView = () => {
    setZoom(1)
    requestAnimationFrame(() => scrollRef.current?.scrollTo?.({ top: 0, left: 0 }))
  }
  useImperativeHandle(ref, () => ({ zoomIn, zoomOut, resetView }), [])

  // Sync keyboard focus with the shared roving index (parent owns it).
  useEffect(() => {
    if (focusIndex >= 0 && focusIndex < seats.length) {
      cellRefs.current[focusIndex]?.focus?.()
    }
  }, [focusIndex, seats.length])

  // Clamp focus when the grid shrinks (same guard as the 3D sr-only grid).
  useEffect(() => {
    if (seats.length > 0 && focusIndex >= seats.length) onFocusIndexChange?.(0)
  }, [seats.length, focusIndex, onFocusIndexChange])

  const handleMove = (dir) => {
    const target = computeMoveIndex(dir, focusIndex)
    if (target !== focusIndex) {
      onFocusIndexChange?.(target)
      requestAnimationFrame(() => cellRefs.current[target]?.focus?.())
    }
  }

  const maxSeatY = useMemo(() => {
    let max = Y_TOP
    for (const s of seats) {
      const { yPx } = seatToPx(s.seatNumber, layout)
      max = Math.max(max, yPx)
    }
    return max
  }, [seats, layout])
  const rearBottom = maxSeatY + CELL_H / 2

  // Bus floor details (top-down), from BusInterior3D shell dimensions.
  const doorY0 = Y_TOP + (DOOR_Z_RANGE[0] - ROW_START_Z) * 100
  const doorY1 = Y_TOP + (DOOR_Z_RANGE[1] - ROW_START_Z) * 100

  return (
    <div className="vygo-map2d">
      <div ref={scrollRef} className="vygo-map2d-scroll" tabIndex={-1}>
        <div
          className="vygo-map2d-surface"
          style={{ width: surfaceW, height: surfaceH }}
        >
          <svg
            className="vygo-map2d-svg"
            viewBox={`0 0 ${geometry.viewBoxW} ${geometry.viewBoxH}`}
            role="group"
            aria-label="2D bus seat map. Use Tab to enter the seat grid and arrow keys to move between seats."
          >
            {/* Coach body (top-down silhouette) */}
            <rect
              x={CX_U - BUS_W_U / 2}
              y={BUS_TOP_Y}
              width={BUS_W_U}
              height={geometry.bodyH}
              rx={22}
              fill="#0d1730"
              stroke="#2a3f66"
              strokeWidth={3}
            />
            {/* Front windshield / driver zone */}
            <rect
              x={CX_U - BUS_W_U / 2 + 14}
              y={BUS_TOP_Y + 10}
              width={BUS_W_U - 28}
              height={Y_TOP - BUS_TOP_Y - 16}
              rx={14}
              fill="#1a2c4f"
            />
            {/* Door notch on the right flank */}
            <rect
              x={CX_U + BUS_W_U / 2 - 16}
              y={doorY0}
              width={16}
              height={doorY1 - doorY0}
              rx={6}
              fill="#1f4d8c"
            />
            {/* Aisle */}
            <rect
              x={CX_U - geometry.aisleW / 2}
              y={Y_TOP}
              width={geometry.aisleW}
              height={Math.max(0, rearBottom - Y_TOP)}
              fill="rgba(148,163,184,0.10)"
            />
            {/* Rear wall + engine hint */}
            <line
              x1={CX_U - BUS_W_U / 2 + 8}
              y1={rearBottom + 10}
              x2={CX_U + BUS_W_U / 2 - 8}
              y2={rearBottom + 10}
              stroke="rgba(148,163,184,0.4)"
              strokeWidth={2}
            />
            <text
              x={CX_U}
              y={rearBottom + 40}
              textAnchor="middle"
              fontSize={15}
              fill="rgba(148,163,184,0.6)"
              letterSpacing={4}
            >
              REAR
            </text>
            <text
              x={CX_U}
              y={12}
              textAnchor="middle"
              fontSize={15}
              fill="rgba(148,163,184,0.6)"
              letterSpacing={4}
            >
              FRONT
            </text>

            {/* Seats — the interactive keyboard grid (spec §8.9). */}
            {seats.map((seat, i) => (
              <SeatCell
                key={seat.seatNumber}
                seat={seat}
                layout={layout}
                geometry={geometry}
                selected={selected}
                farePerSeat={farePerSeat}
                serviceClass={serviceClass}
                tabIndex={i === focusIndex ? 0 : -1}
                ref={(el) => {
                  cellRefs.current[i] = el
                }}
                onToggle={onToggle}
                onMove={handleMove}
              />
            ))}
          </svg>
        </div>
      </div>
      <div className="vygo-map2d-toolbar" aria-label="Map controls">
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={zoomIn} className="vygo-map2d-btn">
          <FaSearchPlus aria-hidden="true" />
        </button>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={zoomOut} className="vygo-map2d-btn">
          <FaSearchMinus aria-hidden="true" />
        </button>
        <button type="button" aria-label="Reset view" title="Reset view" onClick={resetView} className="vygo-map2d-btn">
          <FaUndo aria-hidden="true" />
        </button>
      </div>
    </div>
  )
})

export default SeatMap2D
