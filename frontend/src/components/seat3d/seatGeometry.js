import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/* Two shared, procedurally-built seat geometries — one per service class.
 * Both are built once and cached at module scope (no per-frame allocation).
 *
 * express (2+2 recliner, Yutong C12 Pro): wider bucket with armrests +
 *   headrest, slightly reclined backrest, plush cushion. Full footprint must
 *   stay ≤ 0.44 m wide: Express seats sit on 0.44 m centers (seatMeta seatW
 *   0.44) against the 2.34 m interior walls, so the widest component (the
 *   armrest outer edge) is capped at ~0.21 m off-center to avoid
 *   interpenetrating the neighbouring seat or the shell.
 * normal  (2+3 bench, Ashok Leyland Viking): narrower upright bench seat
 *   (3-across on the left), thinner cushion, upright backrest, no headrest
 *   /armrests. Width ~0.30 so the 5-across row fits the 2.34 m interior —
 *   seatMeta's perRow===5 seatW is 0.41 with ~0.31 spacing on the 3-seat
 *   side, so any wider geometry would overlap its neighbours.
 */
const GEOMETRY_CACHE = { express: null, normal: null }

function finish(parts) {
  const merged = mergeGeometries(parts, false)
  merged.computeVertexNormals()
  return merged
}

function buildExpress() {
  const parts = []

  const base = new THREE.BoxGeometry(0.4, 0.1, 0.46)
  base.translate(0, 0.05, 0)
  parts.push(base)

  const cushion = new THREE.BoxGeometry(0.36, 0.1, 0.47)
  cushion.translate(0, 0.21, 0.06)
  parts.push(cushion)

  const backrest = new THREE.BoxGeometry(0.4, 0.6, 0.09)
  backrest.translate(0, 0.52, -0.2)
  backrest.rotateX(-0.07)
  parts.push(backrest)

  const headrest = new THREE.BoxGeometry(0.3, 0.16, 0.08)
  headrest.translate(0, 0.88, -0.2)
  parts.push(headrest)

  // Armrest outer edge at ±0.21 m — inside the 0.22 m half-pitch budget.
  const armL = new THREE.BoxGeometry(0.05, 0.2, 0.42)
  armL.translate(-0.185, 0.34, -0.04)
  parts.push(armL)

  const armR = new THREE.BoxGeometry(0.05, 0.2, 0.42)
  armR.translate(0.185, 0.34, -0.04)
  parts.push(armR)

  return finish(parts)
}

function buildNormal() {
  const parts = []

  const base = new THREE.BoxGeometry(0.3, 0.08, 0.44)
  base.translate(0, 0.04, 0)
  parts.push(base)

  const cushion = new THREE.BoxGeometry(0.3, 0.08, 0.44)
  cushion.translate(0, 0.16, 0.04)
  parts.push(cushion)

  const backrest = new THREE.BoxGeometry(0.3, 0.58, 0.08)
  backrest.translate(0, 0.46, -0.2)
  parts.push(backrest)

  return finish(parts)
}

export function getSeatGeometry(serviceClass = 'express') {
  const key = serviceClass === 'normal' ? 'normal' : 'express'
  if (!GEOMETRY_CACHE[key]) {
    GEOMETRY_CACHE[key] = key === 'normal' ? buildNormal() : buildExpress()
  }
  return GEOMETRY_CACHE[key]
}

export function disposeSeatGeometry() {
  Object.values(GEOMETRY_CACHE).forEach((g) => {
    if (g) g.dispose()
  })
  GEOMETRY_CACHE.express = null
  GEOMETRY_CACHE.normal = null
}
