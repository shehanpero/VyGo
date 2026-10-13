/**
 * fleetVariants.js — Fleet Variant Upgrade (spec priority 1: registry).
 *
 * The VyGo fleet is described by a small registry of *service classes* that the
 * backend stamps onto seat-map JSON and search JSON as `serviceClass`:
 *   "EXPRESS" | "NORMAL"   (may be absent → see serviceClassFor fallback)
 *
 * Each entry is the single source of truth the orchestrator (SeatSelect3D)
 * uses to drive:
 *   - the 3D scene (the `variant` prop → BusInterior3D),
 *   - the booking panel (SeatHud theming/differentiation),
 *   - the 2D seat map (variant → SeatMap2D → seatMap2dLayout outline/grid),
 *   - the seatMeta layout branching (serviceClass-aware computeLayout).
 *
 * `vehicleName` is the human-readable fleet label shown in the booking panel
 * ("Yutong T12" / "Lanka Ashok Leyland Viking"); `vehicleModel` is the machine
 * id. The backend may start stamping either (or a display variant of it) on
 * the seat-map JSON — variantForVehicleModel() resolves that defensively.
 *
 * `glbPath` points to the raw authoring-scale glTF Binary (.glb) asset served
 * from the root-level `assets/` folder (G:\PEROVIN\vygo\assets). The 3D scene
 * (BusInterior3D) loads it via useGLTF from @react-three/drei and places it
 * inside shellGroupRef for the opacity/fade animation. When glbPath is empty
 * the scene falls back to the fully procedural React-Three-Fiber shell.
 *
 * `modelScale` / `modelRotation` / `modelPosition` are the transform applied
 * by BusInterior3D to the loaded model. The shipped GLBs ARE pre-baked to
 * scene units (meters, floor Y = 0, front = -Z, centered on X), so each
 * variant carries identity transforms (1 / [0,0,0] / [0,0,0]).
 */

export const SERVICE_CLASS = {
  EXPRESS: 'express',
  NORMAL: 'normal',
}

// Machine ids for the two fleet vehicles (used for backend `vehicleModel`
// matching and by the 2D/3D wiring). Human labels live on each variant as
// `vehicleName`.
export const VEHICLE_MODEL_IDS = {
  YUTONG_C12_PRO: 'yutong_c12_pro',
  ASHOK_LEYLAND_VIKING: 'ashok_leyland_viking',
}

// Fallback used whenever the server field is absent: only an uppercase NORMAL
// bus type maps to Normal service; LUXURY/AC/SEMI_LUXURY/… all ride Express.
// The same rule happens to be correct for serviceClass values too ('express' →
// express, 'normal' → normal), so serviceClassFor() doubles as the normalizer.
export function serviceClassFor(busType) {
  return String(busType || '').toUpperCase() === 'NORMAL'
    ? SERVICE_CLASS.NORMAL
    : SERVICE_CLASS.EXPRESS
}

export const FLEET_VARIANTS = {
  [SERVICE_CLASS.EXPRESS]: {
    serviceClass: SERVICE_CLASS.EXPRESS,
    vehicleModel: VEHICLE_MODEL_IDS.YUTONG_C12_PRO,
    vehicleName: 'Yutong T12',
    glbPath: '/assets/yutong-c12.glb', // Yutong T12 touring coach (assets/yutong-c12.glb)
    seatMapPath: '', // procedural layout lives in seatMeta.js
    layout: '2+2',
    materialPreset: 'premium',
    // Premium trim earns the bloom/DOF budget; cap at the device profile's high.
    effectsTierCap: 'high',
    interiorWidth: 2.34,
    panelAccent: '#d4af37', // gold/amber — premium trim
    label: 'Express',
    // Pre-baked: 12.94 m long (front at -Z), floor Y=0, centered on X.
    modelScale: 1,
    modelRotation: [0, 0, 0],
    modelPosition: [0, 0, 0],
  },
  [SERVICE_CLASS.NORMAL]: {
    serviceClass: SERVICE_CLASS.NORMAL,
    vehicleModel: VEHICLE_MODEL_IDS.ASHOK_LEYLAND_VIKING,
    vehicleName: 'Lanka Ashok Leyland Viking',
    glbPath: '/assets/viking.glb', // Lanka Ashok Leyland Viking transit bus (assets/viking.glb)
    seatMapPath: '', // procedural layout lives in seatMeta.js
    layout: '2+3',
    materialPreset: 'standard',
    // No premium trim — don't spend bloom/DOF budget on this bus.
    effectsTierCap: 'mid',
    interiorWidth: 2.34,
    panelAccent: '#3b82f6', // standard blue
    label: 'Normal Service',
    // Pre-baked: 11.90 m long (front at -Z), floor Y=0, centered on X.
    modelScale: 1,
    modelRotation: [0, 0, 0],
    modelPosition: [0, 0, 0],
  },
}

// Resolve a variant from either a serviceClass key ('express'|'normal',
// case-insensitive) or a bus type ('NORMAL' → normal, everything else express).
export function getFleetVariant(serviceClassOrBusType) {
  return FLEET_VARIANTS[serviceClassFor(serviceClassOrBusType)]
}

// Resolve a variant from a backend vehicle-model field (future-proofing: the
// seat-map JSON may start carrying `vehicleModel` / `model`, either as the
// machine id, a slug, or a display name like 'Yutong T12'). Matching is
// deliberately lenient — unknown values return null so callers fall through to
// their existing serviceClass → busType chain without breaking.
export function variantForVehicleModel(vehicleModel) {
  const raw = String(vehicleModel || '').trim().toLowerCase()
  if (!raw) return null
  if (raw === VEHICLE_MODEL_IDS.YUTONG_C12_PRO || raw.includes('yutong')) {
    return FLEET_VARIANTS[SERVICE_CLASS.EXPRESS]
  }
  if (
    raw === VEHICLE_MODEL_IDS.ASHOK_LEYLAND_VIKING ||
    raw.includes('viking') ||
    raw.includes('ashok')
  ) {
    return FLEET_VARIANTS[SERVICE_CLASS.NORMAL]
  }
  return null
}
