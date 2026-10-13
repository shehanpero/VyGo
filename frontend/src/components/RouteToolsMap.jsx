// VyGo — Live Routes map: route corridor visualization for RouteToolsPage.
//
// Plain Leaflet (react-leaflet is not installed) — same pattern as RouteMap.jsx:
// an L.map instance created once on mount, then route layers redrawn in a
// separate effect whenever the `routes` prop changes. Corridor endpoints are
// resolved through a small internal gazetteer; corridors with unknown endpoints
// are skipped gracefully instead of crashing the render.

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// CARTO dark basemap (free, no key). {r} is replaced by @2x on retina screens.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const DEFAULT_CENTER = [7.8731, 80.7718]
const DEFAULT_ZOOM = 7

// ---------------------------------------------------------------------------
// Sri Lanka city gazetteer — name → [lat, lng]. Approximate coordinates,
// good enough for a corridor overview. Aliases map to their canonical entry.
// ---------------------------------------------------------------------------
const CITY_COORDS = [
  ['colombo', [6.9403, 79.8522]],
  ['kandy', [7.2906, 80.6337]],
  ['galle', [6.0329, 80.217]],
  ['matara', [5.9549, 80.555]],
  ['kataragama', [6.4187, 81.335]],
  ['badulla', [6.9934, 81.055]],
  ['jaffna', [9.6615, 80.0255]],
  ['trincomalee', [8.5874, 81.2152]],
  ['anuradhapura', [8.3114, 80.4037]],
  ['ratnapura', [6.7056, 80.3844]],
  ['makumbura', [6.8768, 79.975]],
  ['kadawatha', [6.9898, 79.9571]],
  ['maharagama', [6.8484, 79.9228]],
  ['panadura', [6.7136, 79.9074]],
  ['negombo', [7.2084, 79.8358]],
  ['katunayake', [7.1648, 79.8823]],
  ['kurunegala', [7.4863, 80.3652]],
  ['tangalle', [6.0245, 80.7988]],
  ['pettah', [6.9403, 79.8522]],
  ['horana', [6.7169, 80.0594]],
  ['matale', [7.4683, 80.6214]],
  ['polonnaruwa', [7.9403, 81.0188]],
  ['embilipitiya', [6.3428, 80.8474]],
  ['avissawella', [6.9558, 80.2134]],
  ['puttalam', [8.0362, 79.835]],
  ['batticaloa', [7.7102, 81.6924]],
  // extras for coverage of common corridors
  ['hambantota', [6.124, 81.1205]],
  ['vavuniya', [8.7514, 80.4971]],
  ['dambulla', [7.86, 80.651]],
  ['ella', [6.8667, 81.0467]],
  ['nuwara eliya', [6.9497, 80.7891]],
  ['wellawaya', [6.7368, 81.0997]],
  ['kalutara', [6.585, 79.962]],
  ['kottawa', [6.8414, 79.9666]],
  ['gampaha', [7.0917, 79.9953]],
  ['homagama', [6.8409, 80.0055]],
  ['ja-ela', [7.0784, 79.8934]],
  ['kegalle', [7.251, 80.3436]],
  ['gampola', [7.165, 80.57]],
  ['ampara', [7.2975, 81.6822]],
  ['monaragala', [6.8726, 81.3497]],
  ['mattala', [6.2998, 81.1204]],
  ['kilinochchi', [9.381, 80.411]],
  ['chilaw', [7.574, 79.794]],
  ['mannar', [8.9769, 79.9044]],
  ['middeniya', [6.2095, 80.7793]],
  ['beliatta', [6.0458, 80.7343]],
  ['walasmulla', [6.1596, 80.6785]],
  ['hakmana', [6.0809, 80.6534]],
  ['rakwana', [6.5142, 80.5595]],
  ['siyambalanduwa', [6.9043, 81.4187]],
  ['bibila', [6.7842, 81.1746]],
  ['passara', [6.9552, 81.1519]],
  ['welimada', [6.9071, 80.898]],
  ['peradeniya', [7.265, 80.594]],
  ['ambalangoda', [6.235, 80.055]],
  ['hikkaduwa', [6.146, 80.102]],
]

const CITY_ALIASES = {
  'colombo (pettah)': 'colombo',
  'pettah (colombo)': 'colombo',
  'katunayake airport': 'katunayake',
  'bandaranaike international airport': 'katunayake',
  'cmb airport': 'katunayake',
  'nuwara-eliya': 'nuwara eliya',
  'jaela': 'ja-ela',
  'ja ela': 'ja-ela',
  'anuradhapura (new town)': 'anuradhapura',
  'kataragama (city)': 'kataragama',
}

const GAZETTEER = {}
for (const [key, coords] of CITY_COORDS) GAZETTEER[key] = coords
for (const [alias, target] of Object.entries(CITY_ALIASES)) {
  if (GAZETTEER[target]) GAZETTEER[alias] = GAZETTEER[target]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function resolveCity(place) {
  if (!place) return null
  const key = String(place).trim().toLowerCase().replace(/\s+/g, ' ')
  if (GAZETTEER[key]) return GAZETTEER[key]
  const bare = key.replace(/\s*\(.*?\)\s*$/, '').trim()
  if (bare && GAZETTEER[bare]) return GAZETTEER[bare]
  return null
}

function routeTypeOf(route) {
  return String(route?.operatorType ?? '').trim().toUpperCase() === 'EXPRESSWAY'
    ? 'EXPRESSWAY'
    : 'NORMAL'
}

function routeLabel(route) {
  return route?.corridor || `${route?.fromCity ?? ''} → ${route?.toCity ?? ''}`
}

function listOf(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function routePillsHtml(routeNumbers) {
  return listOf(routeNumbers)
    .map((n) => `<span class="vygo-rn">${esc(n)}</span>`)
    .join('')
}

function operatorPillsHtml(operators) {
  return listOf(operators)
    .map((o) => `<span class="vygo-operator">${esc(o)}</span>`)
    .join('')
}

function phoneLinksHtml(phones) {
  return listOf(phones)
    .map(
      (p) =>
        `<a class="vygo-phone" href="tel:${esc(p).replace(/[^\d+]/g, '')}">${esc(p)}</a>`
    )
    .join('')
}

function linePopupHtml(route, typeLabel) {
  const routeNumbers = listOf(route?.routeNumbers)
  return `
    <div class="vygo-popup-title">${esc(routeLabel(route))}</div>
    <div class="vygo-popup-route">${esc(route?.fromCity ?? '')} → ${esc(route?.toCity ?? '')}</div>
    <div class="vygo-popup-label">Type</div>
    <div class="vygo-popup-route">${esc(typeLabel)}</div>
    ${routeNumbers.length ? `<div class="vygo-popup-label">Route numbers</div><div class="vygo-popup-routes">${routePillsHtml(routeNumbers)}</div>` : ''}
  `
}

function cityPopupHtml(route, role, cityName) {
  const routeNumbers = listOf(route?.routeNumbers)
  const operators = listOf(route?.operators)
  const phones = listOf(route?.phones)
  return `
    <div class="vygo-popup-title">${esc(role)}: ${esc(cityName)}</div>
    <div class="vygo-popup-route">${esc(routeLabel(route))}</div>
    ${routeNumbers.length ? `<div class="vygo-popup-label">Route numbers</div><div class="vygo-popup-routes">${routePillsHtml(routeNumbers)}</div>` : ''}
    ${operators.length ? `<div class="vygo-popup-label">Bus Owners</div><div class="vygo-popup-operators">${operatorPillsHtml(operators)}</div>` : ''}
    ${phones.length ? `<div class="vygo-popup-label">Phones</div><div class="vygo-popup-phones">${phoneLinksHtml(phones)}</div>` : ''}
  `
}

function drawEndpointMarker(layer, coords, route, role, cityName) {
  L.circleMarker(coords, {
    radius: 5,
    color: '#64748b',
    weight: 1.2,
    fillColor: '#0f172a',
    fillOpacity: 1,
  })
    .addTo(layer)
    .bindTooltip(`${role}: ${cityName}`, {
      direction: 'top',
      offset: [0, -6],
      className: 'vygo-city-tip',
    })
    .bindPopup(cityPopupHtml(route, role, cityName), { className: 'vygo-popup', maxWidth: 280 })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RouteToolsMap({ routes = [], className = '', height = 420 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const routeLayerRef = useRef(null)
  const [drawnCount, setDrawnCount] = useState(0)

  // Create the base map once. Layers for the current `routes` prop live in a
  // dedicated layer group so they can be cleared and redrawn without touching
  // the tiles.
  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 6,
      maxZoom: 17,
      zoomControl: true,
    })
    mapRef.current = map

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    routeLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      routeLayerRef.current = null
    }
  }, [])

  // Redraw polylines + endpoint markers whenever the routes prop changes.
  useEffect(() => {
    const map = mapRef.current
    const layer = routeLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    const bounds = []
    let drawn = 0

    ;(Array.isArray(routes) ? routes : []).forEach((route) => {
      const from = resolveCity(route?.fromCity)
      const to = resolveCity(route?.toCity)
      if (!from || !to) return

      const typeLabel = routeTypeOf(route)
      const isExpressway = typeLabel === 'EXPRESSWAY'
      const fromName = String(route?.fromCity ?? '').trim()
      const toName = String(route?.toCity ?? '').trim()

      L.polyline([from, to], {
        color: isExpressway ? '#14b8a6' : '#818cf8',
        weight: isExpressway ? 3.5 : 2.5,
        opacity: isExpressway ? 0.9 : 0.7,
        dashArray: isExpressway ? null : '6 8',
        lineJoin: 'round',
        lineCap: 'round',
      })
        .addTo(layer)
        .bindTooltip(`${esc(routeLabel(route))} · ${esc(typeLabel)}`, {
          direction: 'top',
          offset: [0, -8],
          className: 'vygo-route-tip',
        })
        .bindPopup(linePopupHtml(route, typeLabel), { className: 'vygo-popup', maxWidth: 300 })

      drawEndpointMarker(layer, from, route, 'From', fromName)
      drawEndpointMarker(layer, to, route, 'To', toName)

      bounds.push(from, to)
      drawn += 1
    })

    if (drawn > 0 && bounds.length) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.15), { padding: [24, 24] })
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    }
    map.invalidateSize()
    setDrawnCount(drawn)
  }, [routes])

  const boxStyle = typeof height === 'number' ? { height: `${height}px` } : { height }

  return (
    <div
      className={`vygo-routetools-map relative w-full overflow-hidden rounded-2xl border border-slate-800 ${className}`}
      style={boxStyle}
      data-testid="route-tools-map"
    >
      <div
        ref={containerRef}
        aria-label="Sri Lanka route corridors map"
        className="vygo-routetools-root"
        style={{ height: '100%', width: '100%' }}
      />

      {drawnCount > 0 && (
        <ul className="sr-only">
          {routes.map((r, i) => {
            const from = resolveCity(r?.fromCity)
            const to = resolveCity(r?.toCity)
            if (!from || !to) return null
            const nums = listOf(r?.routeNumbers)
            return (
              <li key={i}>
                {routeLabel(r)} ({routeTypeOf(r) === 'EXPRESSWAY' ? 'expressway' : 'normal'}), from{' '}
                {String(r?.fromCity ?? '').trim()} to {String(r?.toCity ?? '').trim()}
                {nums.length ? `, route numbers ${nums.join(', ')}` : ''}
              </li>
            )
          })}
        </ul>
      )}

      {drawnCount === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/85 px-4 py-2.5 text-sm text-slate-300 backdrop-blur-sm">
            Select routes to see them on the map
          </div>
        </div>
      )}

      {drawnCount > 0 && (
        <div className="pointer-events-none absolute bottom-6 left-3 z-[1000] flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="block h-1 w-5 rounded-full bg-teal-500" />
            Expressway
          </span>
          <span className="flex items-center gap-1.5">
            <span className="block h-0 w-5 border-t-2 border-dashed border-indigo-400" />
            Normal
          </span>
        </div>
      )}

      {/* Scoped dark styling for Leaflet popups/tooltips (kept local — index.css untouched) */}
      <style>{`
        .vygo-routetools-map .leaflet-container { background: #020617; font-family: inherit; }

        .vygo-routetools-map .vygo-route-tip,
        .vygo-routetools-map .vygo-city-tip {
          background: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #e2e8f0;
          border-radius: 6px;
          padding: 3px 9px;
          font-size: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
        }
        .vygo-routetools-map .vygo-route-tip::before,
        .vygo-routetools-map .vygo-city-tip::before { display: none; }

        .vygo-routetools-map .vygo-popup .leaflet-popup-content-wrapper,
        .vygo-routetools-map .vygo-popup .leaflet-popup-tip {
          background: #0f172a;
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
        }
        .vygo-routetools-map .vygo-popup .leaflet-popup-content { margin: 12px 14px; line-height: 1.5; }
        .vygo-routetools-map .vygo-popup a.leaflet-popup-close-button { color: #94a3b8; }
        .vygo-routetools-map .vygo-popup-title { font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
        .vygo-routetools-map .vygo-popup-route { font-size: 12px; color: #cbd5e1; }
        .vygo-routetools-map .vygo-popup-label {
          margin: 8px 0 4px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
        }
        .vygo-routetools-map .vygo-popup-routes,
        .vygo-routetools-map .vygo-popup-operators,
        .vygo-routetools-map .vygo-popup-phones { display: flex; flex-wrap: wrap; gap: 4px; }
        .vygo-routetools-map .vygo-rn,
        .vygo-routetools-map .vygo-operator {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.25);
          font-size: 11px;
          color: #cbd5e1;
        }
        .vygo-routetools-map .vygo-phone {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(20, 184, 166, 0.12);
          border: 1px solid rgba(20, 184, 166, 0.3);
          font-size: 11px;
          color: #5eead4;
          text-decoration: none;
        }
        .vygo-routetools-map .vygo-phone:hover { background: rgba(20, 184, 166, 0.22); }
      `}</style>
    </div>
  )
}
