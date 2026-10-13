/**
 * seatMap2dLayout.js — 2D SVG seat map projection math.
 *
 * Pure projection of the SAME geometry the 3D scene uses: seatMeta's
 * `computeLayout` + `seatPositionFor`. There is no separate seat-map JSON —
 * the 2D map derives every cell from `seatNumber`, exactly like the 3D path.
 *
 * Unit convention (from docs/2d-seat-map-visual-grammar.md §1):
 *   1 meter = S = 100 SVG units. X = across the bus (side to side, matches the
 *   3D x axis), Y = along the bus (front at top, negative-z → top), matching
 *   the legacy BusSeatMap "front at top" semantics.
 *
 * Two-vehicle outline grammar (v2):
 *   - EXPRESS (Yutong C12 Pro, 2+2): long-coach outline, 12.0 m nominal, that
 *     stretches to contain every seat at the shared 0.85 m pitch, plus a rear
 *     engine deck behind the last row. Door slot = coach mid-door, matching
 *     BusInterior3D (z ≈ -5.33..-4.47).
 *   - NORMAL (Ashok Leyland Viking, 2+3): shorter intercity outline, 10.9 m
 *     nominal, FRONT-ENGINE trait — the front door slot sits AHEAD of the
 *     front axle line (z < FRONT_AXLE_Z = -4.7), so the 2D map already reads
 *     "which bus am I on" from length + door position + grid (5-across vs
 *     4-across) + aisle width.
 */

import {
  computeLayout,
  seatPositionFor,
  resolveVehicleId,
  VEHICLE_IDS,
} from './seatMeta'

export const S = 100 // units per meter
export const ROW_H = 0.85 * S // 85 — seatMeta ROW_PITCH
export const BENCH_GAP = 1.0 * S // 100 — seatMeta rear bench gap
export const PAD = 30 // outer margin — keeps focus rings unclipped
export const ACCESSIBLE_PAD = 9 // wider cell around the accessible seat
export const ROW_START_Z = -4.15 // seatMeta row 0 start

const BUS_W = 2.55 // Yutong/Viking width, meters
const INTERIOR_W = 2.34 // seatMeta interiorWidth
export const BUS_LEN_M = { express: 12.0, normal: 10.9 } // coach body length (nominal floor; see buildSeatMapGeometry)
const CX = PAD + (BUS_W / 2) * S // 157.5 — centre of the bus width
export const Y_TOP = PAD + 130 // top of row 0 (below windshield/driver zone)
export const BUS_TOP_Y = 25 // front bumper at top of the SVG
export const MAP_WIDTH = Math.round(CX + (BUS_W / 2) * S + PAD) // 315
export const BUS_W_U = BUS_W * S // 255 — body width in units
export const CX_U = CX

// Cell height = seat depth (~0.46 m in seatGeometry); row pitch (85) leaves a
// readable gap between rows.
export const CELL_H = 46

// Axle lines — same z-space as the 3D wheels (BusInterior3D Wheel z = ±4.7),
// so "front door AHEAD of the front axle" is measurable in 2D: a door slot is
// ahead of the front axle when its whole z-range is < FRONT_AXLE_Z.
export const FRONT_AXLE_Z = -4.7
export const REAR_AXLE_Z = 4.7

// Per-vehicle 2D outline traits — mirror FleetVehicle.java + ServiceClass.java:
//   EXPRESS -> Yutong C12 Pro (12.0 m coach, 2+2, rear engine),
//   NORMAL  -> Ashok Leyland Viking (10.9 m intercity, 2+3, front engine).
// `doorZRange` is the front-door slot along the right flank (z-space, meters):
//   - Yutong: coach mid-door that matches the 3D model (straddles the axle,
//     door leaf z ≈ -5.33..-4.47 in BusInterior3D).
//   - Viking: AHEAD of the front axle (z from -5.45 to -4.85, entirely < -4.7).
// `rearDeckPadM` is the space kept behind the last seat row for the rear wall +
// engine deck, which is what makes the Express read as a long coach even when
// its seat content is short.
const VEHICLE_2D = {
  [VEHICLE_IDS.YUTONG_C12_PRO]: {
    nominalLenM: 12.0,
    doorZRange: [-5.33, -4.47],
    rearDeckPadM: 1.2,
    silhouette: 'coach',
  },
  [VEHICLE_IDS.ASHOK_LEYLAND_VIKING]: {
    nominalLenM: 10.9,
    doorZRange: [-5.45, -4.85],
    rearDeckPadM: 0.6,
    silhouette: 'intercity',
  },
}

// Door notch on the right flank. The exported NAME is kept for backward
// compatibility: SeatMap2D reads DOOR_Z_RANGE at render time, and the array is
// a live ESM binding — buildSeatMapGeometry() rewrites it in place to the
// current vehicle's slot BEFORE the renderer reads it, so the (frozen) 2D
// renderer shows the per-vehicle door without needing a prop change.
// doorZRangeFor() is the pure getter for any future consumer.
export const DOOR_Z_RANGE = [...VEHICLE_2D[VEHICLE_IDS.YUTONG_C12_PRO].doorZRange]

// Pure per-vehicle door slot getter (falls back to the Express default).
export function doorZRangeFor(layout) {
  const vehicle =
    layout?.vehicle ||
    (layout?.normal ? VEHICLE_IDS.ASHOK_LEYLAND_VIKING : VEHICLE_IDS.YUTONG_C12_PRO)
  return VEHICLE_2D[vehicle]?.doorZRange || DOOR_Z_RANGE
}

// z (meters, 3D seat axis) -> y (SVG units, front at top).
export function zToY(z) {
  return Y_TOP + (z - ROW_START_Z) * S
}

/**
 * Transform a seatNumber into (xPx, yPx) via seatPositionFor (meters → units).
 */
export function seatToPx(n, layout) {
  const [x, , z] = seatPositionFor(n, layout)
  return {
    xPx: CX + x * S,
    yPx: Y_TOP + (z - ROW_START_Z) * S,
  }
}

/**
 * Build the full 2D geometry for a trip:
 *  - `layout` from computeLayout (authoritative for placement),
 *  - per-layout cell/aisle widths (seatMeta seatW / aisle math),
 *  - the SVG viewBox that contains every seat + the full coach body.
 *
 * v2 (two-vehicle grammar):
 *  - body length is adaptive: max(vehicle nominal length, front overhang +
 *    seat content + rear deck), so a 53-seat Express or a 58-seat Viking NEVER
 *    pokes outside the outline — the fixed 12.0/10.9 m constants were too
 *    short for the shared 0.85 m row pitch at the top seat counts.
 *  - the returned object carries vehicle-aware outline data (`vehicle`,
 *    `silhouette`, `nominalLenM`, `bodyLenM`, `doorZRange`, front/rear axle
 *    y-positions) for the renderer to consume.
 */
export function buildSeatMapGeometry(capacity, busType, serviceClass) {
  const layout = computeLayout(capacity, busType, serviceClass)
  const perRow = layout.perRow
  const seatW = perRow === 4 ? 0.44 : 0.41
  const aisle = Math.max(0.24, INTERIOR_W - perRow * seatW)
  const cellW = seatW * S
  const aisleW = aisle * S

  // Vehicle-aware outline traits (serviceClass + capacity resolved in seatMeta).
  const vehicle = layout.vehicle || resolveVehicleId(layout.normal, capacity)
  const v2d = VEHICLE_2D[vehicle] || VEHICLE_2D[VEHICLE_IDS.YUTONG_C12_PRO]

  // Publish the per-vehicle door slot to the frozen renderer via the live ESM
  // binding (see DOOR_Z_RANGE note above). Idempotent, same-vehicle re-renders
  // splice the same values.
  DOOR_Z_RANGE.splice(0, DOOR_Z_RANGE.length, ...v2d.doorZRange)

  let maxY = Y_TOP
  if (layout.fullRows > 0) {
    maxY = Y_TOP + (layout.fullRows - 1) * ROW_H
  }
  if (layout.remainder > 0) {
    // Bench row sits one BENCH_GAP behind the last full row.
    maxY = Y_TOP + layout.fullRows * ROW_H + BENCH_GAP
  }
  const seatsBottom = maxY + CELL_H / 2 + 60 + PAD // + rear wall

  // Adaptive coach length (meters): at least the vehicle's nominal length,
  // stretched so every seat — including the rear bench — stays inside the
  // outline at the shared 0.85 m pitch. FRONT_ZONE_M is the bumper→row 0 gap;
  // contentLenM measures from row 0 to the last seat + half a cell + rear deck.
  const FRONT_ZONE_M = (Y_TOP - BUS_TOP_Y) / S // 1.35
  const [, , lastSeatZ] = seatPositionFor(capacity, layout)
  const contentLenM = lastSeatZ - ROW_START_Z + CELL_H / 2 / S + v2d.rearDeckPadM
  const bodyLenM = Math.max(v2d.nominalLenM, FRONT_ZONE_M + contentLenM)
  const busLen = bodyLenM * S
  const bodyBottom = BUS_TOP_Y + busLen + PAD
  const viewBoxH = Math.round(Math.max(seatsBottom, bodyBottom))
  const bodyY = BUS_TOP_Y
  const bodyH = busLen

  return {
    layout,
    perRow,
    normal: layout.normal,
    isExpress: !layout.normal,
    cellW,
    aisleW,
    viewBoxW: MAP_WIDTH,
    viewBoxH,
    bodyY,
    bodyH,
    // v2 vehicle-aware outline data.
    vehicle,
    silhouette: v2d.silhouette,
    nominalLenM: v2d.nominalLenM,
    bodyLenM,
    doorZRange: v2d.doorZRange,
    frontAxleY: zToY(FRONT_AXLE_Z),
    rearAxleY: zToY(REAR_AXLE_Z),
  }
}
