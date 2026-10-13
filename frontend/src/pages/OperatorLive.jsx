import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api, errorMessage } from '../api/client'
import { FaSatelliteDish, FaSync, FaMapMarkerAlt } from 'react-icons/fa'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
const REFRESH_MS = 15000

const busIcon = L.divIcon({
  className: '',
  html:
    '<span style="display:grid;place-items:center;width:32px;height:32px;border-radius:9999px;background:rgba(34,211,238,0.18);border:2px solid #22d3ee;box-shadow:0 0 14px rgba(34,211,238,0.6);color:#22d3ee;font-weight:700;font-size:15px">&#9650;</span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

export default function OperatorLive() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await api.get('/operator/bus-locations')
      setBuses(Array.isArray(res.data) ? res.data : [])
      setUpdatedAt(new Date())
    } catch (err) {
      setError(errorMessage(err, 'Failed to load live buses'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = L.map(container, {
      center: [7.8731, 80.7718],
      zoom: 7,
      minZoom: 6,
      maxZoom: 17,
      zoomControl: true,
    })
    mapRef.current = map

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, subdomains: 'abcd', maxZoom: 19 }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        layerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    const layer = layerRef.current
    const map = mapRef.current
    if (!layer || !map) return
    layer.clearLayers()

    const withCoords = buses.filter((b) => b.latitude != null && b.longitude != null)
    const bounds = []
    withCoords.forEach((b) => {
      const latlng = [b.latitude, b.longitude]
      bounds.push(latlng)
      L.marker(latlng, { icon: busIcon })
        .addTo(layer)
        .bindPopup(
          `<div style="font-weight:700;color:#f8fafc;margin-bottom:2px">${b.registrationNo || 'Bus'}</div>` +
            `<div style="font-size:12px;color:#cbd5e1">${b.route || '—'}</div>` +
            `<div style="font-size:12px;color:#cbd5e1">Speed: ${b.speedKph != null ? Math.round(b.speedKph) + ' km/h' : '—'}</div>` +
            (b.staffName ? `<div style="font-size:12px;color:#94a3b8">Driver: ${b.staffName}</div>` : '')
        )
    })
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [buses])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Live Tracking</h1>
          <p className="text-sm text-slate-400">
            Real-time positions reported by drivers
            {updatedAt && <span className="text-slate-500"> · updated {updatedAt.toLocaleTimeString()}</span>}
          </p>
          <div className="scan-divider mt-3 w-40" />
        </div>
        <button type="button" className="btn-holo" onClick={load} disabled={loading}>
          <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="glass-strong glow-border overflow-hidden rounded-2xl p-2">
          <div ref={containerRef} aria-label="Live bus map" style={{ height: 520, width: '100%', borderRadius: 12 }} />
        </div>

        <div className="glass-strong glow-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
            <FaSatelliteDish className="text-nexus-400" /> Active buses ({buses.length})
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              [0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800/60" />)
            ) : buses.length === 0 ? (
              <p className="text-sm text-slate-400">No live bus positions reported yet.</p>
            ) : (
              buses.map((b) => (
                <div key={b.busId} className="rounded-xl bg-slate-800/40 p-4">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <FaMapMarkerAlt className="text-nexus-400" /> {b.registrationNo || `Bus #${b.busId}`}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{b.route || '—'}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                    <span>Speed <b className="text-slate-100">{b.speedKph != null ? Math.round(b.speedKph) : 0}</b> km/h</span>
                    {b.staffName && <span>Driver <b className="text-slate-100">{b.staffName}</b></span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
