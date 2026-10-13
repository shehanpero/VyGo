// Single source of truth for seat-state colors. The 3D render (Seat3D) and the
// HUD legend both read this so the legend always matches what players see.
export const SEAT_COLORS = {
  available: '#2563EB',
  selected: '#16A34A',
  booked: '#DC2626',
  locked: '#F97316',
  reserved: '#F97316',
  vip: '#D4AF37',
  ladies: '#EC4899',
  accessible: '#7C3AED',
}

export function isNormalBus(busType) {
  return String(busType || '').toUpperCase() === 'NORMAL'
}

// Service-class check — the server's authoritative fleet-variant stamp.
// Only NORMAL service uses the wider 3+2 (2+3) layout with no premium trim.
export function isNormalService(serviceClass) {
  return String(serviceClass || '').toUpperCase() === 'NORMAL'
}

// Vehicle ids — mirror of backend FleetVehicle.java (the authoritative
// registry): EXPRESS -> Yutong C12 Pro (51/52/53 seats), NORMAL -> Ashok
// Leyland Viking (42/44/49/54/58). The frontend mirrors the machine ids so 2D
// and 3D consumers can key per-vehicle visuals off `layout.vehicle` without
// re-deriving the mapping (fleetVariants.js owns the display labels).
export const VEHICLE_IDS = {
  YUTONG_C12_PRO: 'yutong_c12_pro',
  ASHOK_LEYLAND_VIKING: 'ashok_leyland_viking',
}

// Allowed passenger-seat counts per vehicle — mirrors
// FleetVehicle.allowedCapacities(). Used to resolve `layout.vehicle` when the
// capacity lands inside a vehicle's allowed set.
export const VEHICLE_CAPACITY_SETS = {
  [VEHICLE_IDS.YUTONG_C12_PRO]: [51, 52, 53],
  [VEHICLE_IDS.ASHOK_LEYLAND_VIKING]: [42, 44, 49, 54, 58],
}

// Resolve the vehicle id for a layout: service class first (EXPRESS -> Yutong,
// NORMAL -> Viking — ServiceClass.leftSeats()), capacity as a tie-breaker when
// it lands inside a vehicle's allowed set. Mirrors FleetVehicle.vehicleModelId()
// (model-first, service-class-default fallback) for the frontend side.
export function resolveVehicleId(normal, capacity) {
  const cap = Number(capacity)
  if (!normal && VEHICLE_CAPACITY_SETS[VEHICLE_IDS.YUTONG_C12_PRO].includes(cap)) {
    return VEHICLE_IDS.YUTONG_C12_PRO
  }
  if (normal && VEHICLE_CAPACITY_SETS[VEHICLE_IDS.ASHOK_LEYLAND_VIKING].includes(cap)) {
    return VEHICLE_IDS.ASHOK_LEYLAND_VIKING
  }
  return normal ? VEHICLE_IDS.ASHOK_LEYLAND_VIKING : VEHICLE_IDS.YUTONG_C12_PRO
}

// Layout + branching helper. The existing `(capacity, busType)` signature is
// preserved verbatim for the 3D agent / SeatHud / legacy 2D fallback. An
// optional third `serviceClass` arg takes precedence when provided — it is the
// source of truth from the backend seat-map JSON; busType is the fallback.
//
// Row grammar is kept row-compatible with the server (ServiceClass.java:
// NORMAL left=3, EXPRESS left=2; SeatLockService rows are built with the same
// left/perRow math, so a seat number maps to the same row/col on both sides).
//
// v2 additions (backward-compatible): `vehicle` (vehicle id resolved from
// serviceClass + capacity) and `rowCount` (full rows + optional rear bench),
// consumed by the 2D outline and by vehicle-aware visual branches.
export function computeLayout(capacity = 0, busType = 'LUXURY', serviceClass) {
  const normal =
    typeof serviceClass === 'string' && serviceClass !== ''
      ? isNormalService(serviceClass)
      : isNormalBus(busType)
  const left = normal ? 3 : 2
  const right = 2
  const perRow = left + right
  const fullRows = Math.floor(capacity / perRow)
  const remainder = capacity % perRow
  const vehicle = resolveVehicleId(normal, capacity)
  const rowCount = fullRows + (remainder > 0 ? 1 : 0)
  return { left, right, perRow, fullRows, remainder, normal, vehicle, rowCount }
}

const ROW_START_Z = -4.15
const ROW_PITCH = 0.85
const BENCH_GAP = 1.0

export function seatPositionFor(seatNumber, layout) {
  const { left, perRow, fullRows, remainder } = layout
  const n = Number(seatNumber)
  if (!Number.isFinite(n) || n < 1) return [0, 0, 0]
  const rowIndex = Math.floor((n - 1) / perRow)
  const col = (n - 1) % perRow
  const isBench = rowIndex >= fullRows

  const interiorW = 2.34
  const seatW = perRow === 4 ? 0.44 : 0.41
  const aisle = Math.max(0.24, interiorW - perRow * seatW)
  const half = interiorW / 2

  let x
  if (isBench) {
    x = (col - (remainder - 1) / 2) * 0.5
  } else if (col < left) {
    const leftSeats = left
    const a = -half + seatW / 2
    const b = -aisle / 2 - seatW / 2
    x = leftSeats === 1 ? a : a + (col / (leftSeats - 1)) * (b - a)
  } else {
    const rightSeats = perRow - left
    const c = aisle / 2 + seatW / 2
    const d = half - seatW / 2
    const idx = col - left
    x = rightSeats === 1 ? c : c + (idx / (rightSeats - 1)) * (d - c)
  }

  const z = isBench ? ROW_START_Z + fullRows * ROW_PITCH + BENCH_GAP : ROW_START_Z + rowIndex * ROW_PITCH
  return [x, 0, z]
}

export function getSeatCategory(seatNumber, layout) {
  const n = Number(seatNumber)
  if (!Number.isFinite(n)) return 'standard'
  const { perRow, normal, left } = layout
  if (n === left + 1) return 'accessible'
  if (perRow === 4 && n >= 13 && n <= 16) return 'ladies'
  if (!normal && n <= perRow) return 'vip'
  return 'standard'
}

// Seat categories a service class actually offers. Normal buses have no VIP
// or individual-AC trim — only premium (Express) rows get the VIP badge — and
// the Ladies category only exists on 4-across (2+2) buses, so it is Express
// too. The authoritative guard stays in getSeatCategory via `layout.normal`
// (preserved); this is a convenience for HUD/legend consumers.
export function categoriesForService(serviceClass) {
  return isNormalService(serviceClass)
    ? ['standard', 'accessible']
    : ['standard', 'vip', 'ladies', 'accessible']
}

export const SEAT_CATEGORY_LABELS = {
  standard: 'Standard',
  vip: 'VIP',
  ladies: 'Ladies',
  accessible: 'Accessible',
}

// Non-color state cues so seat status is never conveyed by color alone (WCAG 1.4.1).
export const SEAT_STATE_GLYPHS = {
  selected: '✓',
  booked: '🔒',
  locked: '⏳',
  vip: '👑',
  ladies: '◆',
  accessible: '♿',
  available: '',
}

export function seatStateLabelFor(status, selected) {
  if (selected) return 'selected'
  if (status === 'BOOKED') return 'booked'
  if (status === 'LOCKED') return 'locked'
  return 'available'
}

export function seatGlyphFor(category, status, selected) {
  if (selected) return SEAT_STATE_GLYPHS.selected
  if (status === 'BOOKED') return SEAT_STATE_GLYPHS.booked
  if (status === 'LOCKED') return SEAT_STATE_GLYPHS.locked
  if (category === 'vip') return SEAT_STATE_GLYPHS.vip
  if (category === 'ladies') return SEAT_STATE_GLYPHS.ladies
  if (category === 'accessible') return SEAT_STATE_GLYPHS.accessible
  return SEAT_STATE_GLYPHS.available
}

// Screen-reader name for a seat — mirrors the 2D map naming ("Seat 7, Available")
// plus state, category and fare so SR users get the same info as sighted users.
// Optional `serviceClass` suppresses the VIP label on Normal trips (defensive —
// getSeatCategory already avoids 'vip' via layout.normal).
export function seatAriaLabel(seatNumber, status, selected, category, farePerSeat, serviceClass) {
  const n = Number(seatNumber)
  const state = seatStateLabelFor(status, selected)
  const effectiveCategory =
    category === 'vip' && isNormalService(serviceClass) ? 'standard' : category
  let label = `Seat ${n}, ${state}`
  if (effectiveCategory && effectiveCategory !== 'standard' && SEAT_CATEGORY_LABELS[effectiveCategory]) {
    label += `, ${SEAT_CATEGORY_LABELS[effectiveCategory]}`
  }
  if (state === 'available' || state === 'selected') {
    const fare = Number(farePerSeat)
    if (Number.isFinite(fare) && fare > 0) label += `, LKR ${fare.toLocaleString()}`
  }
  return label
}
