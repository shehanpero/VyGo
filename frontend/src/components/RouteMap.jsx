import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { DEFAULT_CENTER, DEFAULT_ZOOM, CITIES, CORRIDORS } from '../data/routeGeo'
import { api } from '../api/client'

// CARTO dark basemap (free, no key). {r} is replaced by @2x on retina screens by Leaflet.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const LIVE_COLOR = '#a78bfa' // purple — distinguishes live backend routes from static corridors

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function corridorPopupHtml(corridor) {
  const operators = corridor.operators
    .map((o) => `<span class="vygo-operator">${o}</span>`)
    .join('')
  return `
    <div class="vygo-popup-title"><span class="vygo-dot" style="background:${corridor.color}"></span>${corridor.code} · ${corridor.name}</div>
    <div class="vygo-popup-route">${corridor.summary}</div>
    ${corridor.operators.length ? `<div class="vygo-popup-label">Bus Owners</div><div class="vygo-popup-operators">${operators}</div>` : ''}
  `
}

function cityPopupHtml(city) {
  const tag =
    city.type === 'capital'
      ? '<span class="vygo-tag vygo-tag-capital">Capital</span>'
      : city.type === 'junction'
        ? '<span class="vygo-tag vygo-tag-junction">Junction</span>'
        : ''
  return `<div class="vygo-popup-title">${city.name}</div>${tag}${city.note ? `<div class="vygo-popup-route">${city.note}</div>` : ''}`
}

function drawCorridor(map, corridor) {
  const line = L.polyline(corridor.points, {
    color: corridor.color,
    weight: corridor.weight,
    opacity: 0.92,
    lineJoin: 'round',
    lineCap: 'round',
  }).addTo(map)

  // Permanent code label pinned to a chosen point on the line.
  line.bindTooltip(
    `<span class="vygo-corridor-code">${corridor.code}</span> <span class="vygo-corridor-name">${corridor.name}</span>`,
    {
      permanent: true,
      direction: 'top',
      offset: [0, -8],
      className: 'vygo-corridor-label',
      opacity: 0.95,
    }
  )

  const tooltip = line.getTooltip()
  if (tooltip) tooltip.setLatLng(corridor.labelPos)

  line.bindPopup(corridorPopupHtml(corridor), { className: 'vygo-popup', maxWidth: 320 })
}

function drawCity(map, city) {
  const isCapital = city.type === 'capital'
  const isJunction = city.type === 'junction'
  const marker = L.circleMarker(city.coords, {
    radius: isCapital ? 7 : isJunction ? 5.5 : 4.5,
    color: '#0f172a',
    weight: 1.5,
    fillColor: isCapital ? '#fbbf24' : isJunction ? '#38bdf8' : '#f8fafc',
    fillOpacity: 0.95,
  }).addTo(map)

  marker.bindTooltip(city.name, {
    direction: 'top',
    offset: [0, -6],
    className: 'vygo-city-tooltip',
  })
  marker.bindPopup(cityPopupHtml(city), { className: 'vygo-popup', maxWidth: 260 })
}

// ---------------------------------------------------------------------------
// Optional live-route overlay from the backend (/api/v1/routes).
// The backend is NOT required: this is wrapped in try/catch at the call site
// and silently degrades to the static map when unreachable.
// ---------------------------------------------------------------------------
function findCityCoord(place) {
  if (!place) return null
  // Direct coordinate shapes the API might return.
  if (Array.isArray(place)) return [place[0], place[1]]
  if (typeof place === 'object') {
    if (place.lat != null && place.lng != null) return [place.lat, place.lng]
    if (place.latitude != null && place.longitude != null) return [place.latitude, place.longitude]
  }
  // Fallback: match by city name against our static catalogue.
  const city = CITIES.find((c) =>
    c.name.toLowerCase().includes(String(place).toLowerCase())
  )
  return city ? city.coords : null
}

function overlayLiveRoutes(map, routes) {
  if (!Array.isArray(routes) || routes.length === 0) return
  let drawn = 0

  routes.forEach((route) => {
    // The corridor explorer is about expressway corridors (E01/E03). The
    // classic CTB network is already drawn statically as highway corridors,
    // so overlaying all 146 routes as identical dashed lines would drown the
    // map in spaghetti and hide the expressway decisions users came for.
    const routeType = String(route.routeType || '').toUpperCase()
    if (routeType && routeType !== 'EXPRESSWAY') return

    const from = findCityCoord(route.fromCity ?? route.from ?? route.origin)
    const to = findCityCoord(route.toCity ?? route.to ?? route.destination)
    if (!from || !to) return

    const label = route.routeNumber
      ? `${route.routeNumber} · ${route.fromCity ?? ''} → ${route.toCity ?? ''}`
      : `${route.fromCity ?? ''} → ${route.toCity ?? ''}`

    L.polyline([from, to], {
      color: LIVE_COLOR,
      weight: 2,
      opacity: 0.75,
      dashArray: '5 7',
      interactive: true,
    })
      .addTo(map)
      .bindPopup(`<div class="vygo-popup-title">Live route</div><div class="vygo-popup-route">${label}</div>`, {
        className: 'vygo-popup',
        maxWidth: 260,
      })

    // Small endpoint dots for each live route leg.
    ;[from, to].forEach((pos) =>
      L.circleMarker(pos, {
        radius: 3,
        color: '#0f172a',
        weight: 1,
        fillColor: LIVE_COLOR,
        fillOpacity: 1,
      }).addTo(map)
    )
    drawn += 1
  })

  return drawn
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RouteMap({ className = '', height = 480 }) {
  const shellRef = useRef(null)
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 7,
      maxZoom: 17,
      zoomControl: true,
    })
    mapRef.current = map

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    // Static corridors first (classic highways render under the expressways).
    CORRIDORS.forEach((corridor) => drawCorridor(map, corridor))
    CITIES.forEach((city) => drawCity(map, city))

    // Optional enhancement: overlay live routes from the backend.
    // Failures (backend down / route shape unknown) are swallowed on purpose.
    let cancelled = false
    api
      .get('/routes')
      .then((res) => {
        if (!cancelled) overlayLiveRoutes(map, res.data)
      })
      .catch(() => {
        /* Backend unreachable — keep the static corridor map. */
      })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={shellRef}
      className={`vygo-map-shell ${className}`}
      style={{ position: 'relative', width: '100%', height }}
      data-testid="route-map"
    >
      <div ref={containerRef} aria-label="Sri Lanka bus route map" className="vygo-map-root" style={{ height: '100%', width: '100%' }} />

      {/* Legend (pointer-events none so it never blocks map panning) */}
      <div className="vygo-legend" aria-hidden="true">
        <div className="vygo-legend-title">Corridors</div>
        {CORRIDORS.map((corridor) => (
          <div key={corridor.id} className="vygo-legend-item">
            <span className="vygo-legend-line" style={{ background: corridor.color }} />
            <span className="vygo-legend-code">{corridor.code}</span>
            <span className="vygo-legend-name">{corridor.name}</span>
          </div>
        ))}
      </div>

      {/* Scoped dark styling for Leaflet popups/tooltips (kept local — index.css untouched) */}
      <style>{`
        .vygo-map-shell .leaflet-container { background: #020617; font-family: inherit; }

        /* Corridor permanent labels */
        .vygo-map-shell .vygo-corridor-label {
          background: rgba(15, 23, 42, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.4);
          color: #f1f5f9;
          border-radius: 6px;
          padding: 2px 8px;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.03em;
          white-space: nowrap;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
        }
        .vygo-map-shell .vygo-corridor-label::before { display: none; }
        .vygo-map-shell .vygo-corridor-label .vygo-corridor-name { font-weight: 500; }

        /* City tooltips */
        .vygo-map-shell .vygo-city-tooltip {
          background: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #e2e8f0;
          border-radius: 6px;
          padding: 3px 9px;
          font-size: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
        }
        .vygo-map-shell .vygo-city-tooltip::before { display: none; }

        /* Popups */
        .vygo-map-shell .vygo-popup .leaflet-popup-content-wrapper,
        .vygo-map-shell .vygo-popup .leaflet-popup-tip {
          background: #0f172a;
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
        }
        .vygo-map-shell .vygo-popup .leaflet-popup-content { margin: 12px 14px; line-height: 1.5; }
        .vygo-map-shell .vygo-popup a.leaflet-popup-close-button { color: #94a3b8; }
        .vygo-map-shell .vygo-popup-title { font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
        .vygo-map-shell .vygo-popup-route { font-size: 12px; color: #cbd5e1; }
        .vygo-map-shell .vygo-popup-label {
          margin: 8px 0 4px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
        }
        .vygo-map-shell .vygo-popup-operators { display: flex; flex-wrap: wrap; gap: 4px; }
        .vygo-map-shell .vygo-operator {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.25);
          font-size: 11px;
          color: #cbd5e1;
        }
        .vygo-map-shell .vygo-dot {
          display: inline-block;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          margin-right: 6px;
          vertical-align: middle;
        }
        .vygo-map-shell .vygo-tag {
          display: inline-block;
          margin: 0 0 6px;
          padding: 1px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .vygo-map-shell .vygo-tag-capital { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
        .vygo-map-shell .vygo-tag-junction { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }

        /* Legend card */
        .vygo-map-shell .vygo-legend {
          position: absolute;
          left: 10px;
          bottom: 24px;
          z-index: 1000;
          pointer-events: none;
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 10px;
          padding: 8px 10px;
          color: #e2e8f0;
          font-size: 11px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          max-width: 240px;
        }
        .vygo-map-shell .vygo-legend-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .vygo-map-shell .vygo-legend-item { display: flex; align-items: center; gap: 6px; line-height: 1.7; }
        .vygo-map-shell .vygo-legend-line {
          width: 18px;
          height: 4px;
          border-radius: 2px;
          flex: none;
        }
        .vygo-map-shell .vygo-legend-code { font-weight: 700; min-width: 26px; }
        .vygo-map-shell .vygo-legend-name { color: #cbd5e1; }
      `}</style>
    </div>
  )
}
