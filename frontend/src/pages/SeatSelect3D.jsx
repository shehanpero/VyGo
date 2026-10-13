import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer } from '@react-three/postprocessing'
import { FaArrowLeft, FaArrowRight, FaBus, FaChair, FaCube, FaKeyboard, FaMap, FaTimes } from 'react-icons/fa'
import { api, errorMessage, getStoredUser } from '../api/client'
import BusInterior3D from '../components/seat3d/BusInterior3D'
import DuskWorld from '../components/seat3d/DuskWorld'
import BoardingSequence, { IntroRig, SETTLE_CAM } from '../components/seat3d/BoardingSequence'
import SeatHud from '../components/seat3d/SeatHud'
import SeatMap2D from '../components/seat3d/SeatMap2D'
import SuccessScene from '../components/seat3d/SuccessScene'
import { TieredEffectPasses } from '../components/seat3d/tieredEffects'
import { useDeviceProfile, effectiveTier } from '../components/seat3d/deviceProfile'
import { setMuted, setHapticsEnabled, playError, playSelect, hapticSelect, hapticDeny } from '../components/seat3d/Sound'
import { computeLayout, getSeatCategory, seatAriaLabel, SEAT_CATEGORY_LABELS } from '../components/seat3d/seatMeta'
import { SERVICE_CLASS, serviceClassFor, getFleetVariant, variantForVehicleModel } from '../components/seat3d/fleetVariants'
import { toLocalYMD } from '../utils/dates'

// Session-scoped flag so the cinematic intro plays once per session; repeat
// visits skip straight to the seat grid. Deliberately NOT the booking flow.
const INTRO_SEEN_KEY = 'vygo_has_seen_intro'
// Absolute backstop so the cinematic can never gate booking: if the intro rig
// hasn't completed within this window the seat grid opens anyway.
const INTRO_FORCE_READY_MS = 10000
const VIEW_MODE_KEY = 'vygo_seat_view'
// Account-level view preference: when a user is signed in the last view choice
// is persisted in localStorage keyed by user id so it survives sessions and
// devices. sessionStorage remains the fallback for guests (and still carries
// the choice within a tab session either way).
const ACCOUNT_VIEW_MODE_PREFIX = 'vygo_seat_view_user_'

function accountViewModeKey(userId) {
  return `${ACCOUNT_VIEW_MODE_PREFIX}${userId}`
}

// Signed-in user id, read synchronously from the same persisted payload
// AuthContext hydrates from (api/client.js `getStoredUser`). No preferences
// endpoint exists yet — account prefs live in localStorage keyed by this id.
function currentUserId() {
  try {
    const u = getStoredUser()
    return u?.id ?? u?.userId ?? u?.sub ?? null
  } catch {
    return null
  }
}

// Persist the trip (and its originating search) so a refresh or deep link
// doesn't strand the user on a blank seat page — the booking journey survives
// reload. location.state is the live source of truth; storage is the fallback.
const TRIP_CTX_KEY = 'vygo_trip_ctx'

// Viewport-based first-visit default (spec): mobile → 2D, desktop → 3D. The
// device tier then takes over once the profile benchmark resolves.
function viewportDefaultMode() {
  return typeof window !== 'undefined' && window.innerWidth < 768 ? '2d' : '3d'
}

// Read the last explicit view choice, if any: account-level (localStorage,
// signed-in users) first, then the session copy. `null` means "first visit" —
// the device tier + viewport decide below.
function storedViewMode() {
  try {
    const uid = currentUserId()
    if (uid != null) {
      const v = window.localStorage.getItem(accountViewModeKey(uid))
      if (v === '2d' || v === '3d') return v
    }
    const s = window.sessionStorage.getItem(VIEW_MODE_KEY)
    if (s === '2d' || s === '3d') return s
  } catch {
    /* storage unavailable — treated as first visit */
  }
  return null
}

function initialViewMode() {
  return storedViewMode() || '3d' // default to 3D; device tier may override below
}

/* ------------------------------------------------------------------ *
 * Defensive resolvers for backend future-proofing (spec task 5): the
 * seat-map JSON may start carrying richer vehicle / seat-config fields
 * (`vehicleModel`, `seatConfig`). All helpers are deliberately permissive —
 * an unknown shape just returns null and the existing defaults win.
 * ------------------------------------------------------------------ */

// Coerce a value to a positive integer seat count, or null when it isn't one.
function toPositiveSeatCount(v) {
  if (v == null) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

// Pull a vehicle-model stamp off a JSON object. Accepts `vehicleModel`
// (preferred, future field), `model` (existing SeatMapResponse field), and a
// snake_case variant defensively.
function vehicleModelFrom(data) {
  if (!data || typeof data !== 'object') return null
  for (const k of ['vehicleModel', 'model', 'vehicle_model']) {
    const v = data[k]
    if (typeof v === 'string' && v.trim() !== '') return v
  }
  return null
}

// Extract a seat count from a future `seatConfig` field. Handles number,
// numeric string, array of allowed counts (→ max allowed), or an object with
// capacity-like keys. Anything unrecognised returns null so the existing
// capacity chain (`seatsData.capacity ?? trip.seatsTotal ?? 40`) never breaks.
function seatConfigCapacity(seatConfig) {
  if (seatConfig == null) return null
  if (typeof seatConfig === 'number' || typeof seatConfig === 'string') {
    return toPositiveSeatCount(seatConfig)
  }
  if (Array.isArray(seatConfig)) {
    const nums = seatConfig
      .map(toPositiveSeatCount)
      .filter((n) => n != null)
      .sort((a, b) => b - a)
    return nums.length > 0 ? nums[0] : null
  }
  if (typeof seatConfig === 'object') {
    const keys = ['capacity', 'totalSeats', 'seatsTotal', 'maxSeats', 'seatCount', 'allowedSeatCounts']
    for (const k of keys) {
      const v = seatConfig[k]
      if (Array.isArray(v)) {
        const nums = v
          .map(toPositiveSeatCount)
          .filter((n) => n != null)
          .sort((a, b) => b - a)
        if (nums.length > 0) return nums[0]
      }
      const n = toPositiveSeatCount(v)
      if (n != null) return n
    }
  }
  return null
}

function InteriorRig({ controlsRef }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(SETTLE_CAM.x, SETTLE_CAM.y, SETTLE_CAM.z)
    camera.lookAt(SETTLE_CAM.tx, SETTLE_CAM.ty, SETTLE_CAM.tz)
    const c = controlsRef.current
    if (c) {
      c.target.set(SETTLE_CAM.tx, SETTLE_CAM.ty, SETTLE_CAM.tz)
      c.update()
    }
  }, [camera, controlsRef])
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      minDistance={3}
      maxDistance={22}
      maxPolarAngle={Math.PI * 0.49}
      minPolarAngle={0.1}
    />
  )
}

const glassPanelStyle = {
  backdropFilter: 'blur(14px)',
  background: 'rgba(15, 23, 42, 0.55)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 20,
  boxShadow: '0 24px 60px -12px rgba(2, 6, 23, 0.85)',
}

export default function SeatSelect3D() {
  const location = useLocation()
  const navigate = useNavigate()

  // Resolve the trip from navigation state, persisting it to sessionStorage so
  // a refresh re-hydrates the same journey. `search` (the originating Home
  // search) rides along so "Back to results" re-runs the exact search.
  const tripCtx = useMemo(() => {
    if (location.state?.trip) {
      const ctx = { trip: location.state.trip, search: location.state.search ?? null }
      try {
        sessionStorage.setItem(TRIP_CTX_KEY, JSON.stringify(ctx))
      } catch {
        /* storage unavailable — live state still works */
      }
      return ctx
    }
    try {
      const raw = sessionStorage.getItem(TRIP_CTX_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.trip) return { trip: parsed.trip, search: parsed.search ?? null }
      }
    } catch {
      /* malformed or unavailable — treated as no trip */
    }
    return { trip: null, search: null }
  }, [location.state])

  const trip = tripCtx.trip
  const backSearch = tripCtx.search

  const backToResults = useCallback(() => {
    if (backSearch) {
      navigate('/', { state: { ...backSearch, runSearch: true } })
    } else {
      navigate('/')
    }
  }, [backSearch, navigate])

  const [seatsData, setSeatsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [lockError, setLockError] = useState('')
  const [selected, setSelected] = useState([])
  const [boardingPointId, setBoardingPointId] = useState('')
  const [dropoffPointId, setDropoffPointId] = useState('')
  const [locking, setLocking] = useState(false)
  const [muted, setMutedState] = useState(false)
  const [mode, setMode] = useState('loading')
  const [introPhase, setIntroPhase] = useState(1)
  const [skipSignal, setSkipSignal] = useState(0)
  const [focusIndex, setFocusIndex] = useState(0)
  const [lockResult, setLockResult] = useState(null)
  // { conflicted: number[], alternatives: number[] } — set when the live
  // re-check (or a 409) finds one of the user's picks just got taken.
  const [conflict, setConflict] = useState(null)
  // The booking panel (SeatHud) is hidden on every screen size until the user
  // taps the "Book seats" trigger. Keeping it opt-in keeps the 3D cabin / 2D
  // map unobstructed while picking seats.
  const [panelOpen, setPanelOpen] = useState(false)

  const controlsRef = useRef(null)
  const map2dRef = useRef(null)
  const busAnim = useRef({ shell: 1, door: 0, yaw: 0 })

  // 2D/3D view mode. Default: 2D while the device profile is pending (never
  // boot the WebGL canvas before we know the tier can handle it), then the
  // profile + viewport decide. A manual toggle wins and persists for the
  // session (and, when signed in, to the account in localStorage). LOW tier is
  // pinned to 2D with the toggle hidden.
  const [viewMode, setViewMode] = useState(initialViewMode)
  // A persisted choice (account OR session) counts as an explicit override —
  // it must survive page loads even on desktop. Only true first visits fall
  // back to the device-tier default.
  const viewModeTouched = useRef(storedViewMode() != null)
  const viewModeRef = useRef(viewMode)
  useEffect(() => {
    viewModeRef.current = viewMode
  }, [viewMode])

  const markIntroSeen = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1')
    } catch {
      /* private mode / storage unavailable — intro will just replay */
    }
  }, [])

  // Safety net: the cinematic must never gate booking. If the intro rig has not
  // reported completion within INTRO_FORCE_READY_MS (natural play length is
  // ~8.7s), force the seat grid open so seats + Book Now are always reachable.
  useEffect(() => {
    if (mode !== 'intro') return
    const t = setTimeout(() => {
      markIntroSeen()
      setMode('ready')
    }, INTRO_FORCE_READY_MS)
    return () => clearTimeout(t)
  }, [mode, markIntroSeen])

  const setViewModeManual = useCallback(
    (v) => {
      viewModeTouched.current = true
      setViewMode(v)
      // The boarding cinematic is a 3D-only experience — heading to the grid
      // releases the intro immediately so 2D is never gated behind the 3D rig.
      if (v === '2d' && mode === 'intro') {
        markIntroSeen()
        setMode('ready')
      }
      try {
        window.sessionStorage.setItem(VIEW_MODE_KEY, v)
        const uid = currentUserId()
        if (uid != null) window.localStorage.setItem(accountViewModeKey(uid), v)
      } catch {
        /* storage unavailable — the choice still applies this session */
      }
    },
    [mode, markIntroSeen]
  )

  const profile = useDeviceProfile()
  const defaultViewMode = useMemo(viewportDefaultMode, [])
  const tier = profile.tier

  useEffect(() => {
    if (profile.pending) return
    if (viewModeTouched.current) return
    if (defaultViewMode === '3d' && viewMode === '2d') {
      setViewMode('3d')
    }
  }, [profile, tier, defaultViewMode, viewMode])

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const maxSelection = useMemo(() => Math.min(6, trip?.availableSeats ?? Infinity), [trip])
  // Future-proofed capacity: a future `seatConfig` field (allowed seat-count
  // set or explicit capacity) wins, then the existing seat-map → trip chain,
  // then the hard default. seatConfigCapacity() is permissive — unknown shapes
  // fall straight through so defaults never break.
  const capacity = useMemo(
    () => seatConfigCapacity(seatsData?.seatConfig) ?? seatsData?.capacity ?? trip?.seatsTotal ?? 40,
    [seatsData, trip]
  )

  // Fleet variant wiring (spec priority 2 + future-proofing task 5). The
  // backend may start stamping a richer vehicle field (`vehicleModel`/`model`)
  // on the seat-map or search JSON — a known model id wins, otherwise the
  // server's authoritative serviceClass stamp, then the search-JSON copy on
  // the trip object, then the busType derivation (NORMAL → normal, else
  // express). The same resolved variant drives the 3D scene AND the 2D map.
  const vehicleModel = useMemo(
    () => vehicleModelFrom(seatsData) || vehicleModelFrom(trip) || null,
    [seatsData, trip]
  )
  const serviceClass = useMemo(() => {
    const fromVehicle = variantForVehicleModel(vehicleModel)
    if (fromVehicle) return fromVehicle.serviceClass
    const raw = seatsData?.serviceClass || trip?.serviceClass || serviceClassFor(trip?.busType)
    return String(raw).toUpperCase() === 'NORMAL' ? SERVICE_CLASS.NORMAL : SERVICE_CLASS.EXPRESS
  }, [seatsData, trip, vehicleModel])
  const variant = useMemo(
    () => getFleetVariant(serviceClass) || getFleetVariant(SERVICE_CLASS.EXPRESS),
    [serviceClass]
  )

  // Variant effects cap: Normal buses (effectsTierCap 'mid') never spend the
  // bloom/DOF budget on a no-premium-trim coach, whatever the device profile
  // says. effectiveTier() keeps the composer in lockstep with the materials
  // (BusInterior3D uses the same helper).
  const effTier = useMemo(() => effectiveTier(profile.tier, variant.effectsTierCap), [profile.tier, variant])

  // R3F reconciliation key: a change of trip or serviceClass remounts the whole
  // Canvas so no stale meshes / mixed materials survive an express→normal
  // switch (spec acceptance: variant switch safety).
  const sceneKey = useMemo(() => `scene-${trip?.tripId ?? 'none'}-${serviceClass}`, [trip, serviceClass])

  const layout = useMemo(
    () => computeLayout(capacity, trip?.busType ?? 'LUXURY', serviceClass),
    [capacity, trip, serviceClass]
  )
  const perRow = layout.perRow

  // SINGLE SOURCE OF TRUTH for seat state: `seatNumbers` (the ordered set),
  // `selected`, `maxSelection` and `seatByNumber` drive the 3D scene, the 2D
  // map AND the HUD. Both views toggle the same `selected` set through the
  // same handler (`handleSeatToggle`), so a pick in one instantly appears in
  // the other. Never introduce a second seat-state system here.
  const seatNumbers = useMemo(
    () =>
      (seatsData?.seats || [])
        .map((s) => Number(s.seatNumber))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b),
    [seatsData]
  )

  const seatByNumber = useMemo(() => {
    const m = new Map()
    for (const s of seatsData?.seats ?? []) m.set(Number(s.seatNumber), s)
    return m
  }, [seatsData])

  const focusedNumber = seatNumbers[focusIndex] ?? null

  const loadSeats = useCallback(async () => {
    if (!trip) return
    setLoading(true)
    setLoadError('')
    try {
      const res = await api.get(`/trips/${trip.tripId}/seats`)
      setSeatsData(res.data)
      let introSeen = false
      try {
        introSeen = typeof window !== 'undefined' && sessionStorage.getItem(INTRO_SEEN_KEY) === '1'
      } catch {
        /* storage unavailable — fall through to normal intro */
      }
      setMode((m) => {
        if (m !== 'loading') return m
        // The boarding cinematic is a 3D-only experience — in 2D mode land
        // straight on the grid (spec: one grid at a time).
        return reducedMotion || introSeen || viewModeRef.current === '2d' ? 'ready' : 'intro'
      })
      if (reducedMotion && !introSeen) markIntroSeen()
    } catch (err) {
      setLoadError(errorMessage(err, 'Failed to load seat map'))
      setMode('error')
    } finally {
      setLoading(false)
    }
  }, [trip, reducedMotion, markIntroSeen])

  useEffect(() => {
    if (!trip) return
    setBoardingPointId(String(trip.boardingPoints?.[0]?.id ?? ''))
    setDropoffPointId(String(trip.dropoffPoints?.[trip.dropoffPoints.length - 1]?.id ?? ''))
    loadSeats()
  }, [trip, loadSeats])

  useEffect(() => {
    setMuted(muted)
  }, [muted])

  useEffect(() => {
    setHapticsEnabled(!reducedMotion)
  }, [reducedMotion])

  useEffect(() => {
    if (seatNumbers.length > 0 && focusIndex >= seatNumbers.length) setFocusIndex(0)
  }, [seatNumbers.length, focusIndex])

  const handleIntroComplete = useCallback(() => {
    markIntroSeen()
    setMode('ready')
  }, [markIntroSeen])
  const handleIntroPhase = useCallback((p) => setIntroPhase(p), [])
  const handleSkip = useCallback(() => {
    // Release to the seat grid immediately — the cinematic must never block
    // booking. Previously this only bumped skipSignal and waited on the 3D
    // rig's 0.35s blend onComplete, which never fires if the GL ticker is
    // stalled (headless, throttled tabs, blocklisted GPU, swiftshader), leaving
    // the page trapped on the intro with no Book Now. Flip state now; the
    // skipSignal blend still plays for continuity when the rig is alive.
    markIntroSeen()
    setMode('ready')
    setSkipSignal((s) => s + 1)
  }, [markIntroSeen])

  const handleSeatToggle = useCallback(
    (n, withSound) => {
      const num = Number(n)
      setLockError('')
      setConflict(null)
      const seat = seatByNumber.get(num)
      if (!seat || seat.status !== 'AVAILABLE') {
        if (withSound) {
          playError()
          hapticDeny()
        }
        return
      }
      if (selected.includes(num)) {
        if (withSound) {
          playSelect()
          hapticSelect()
        }
        setSelected((prev) => prev.filter((x) => x !== num))
        return
      }
      if (selected.length >= maxSelection) {
        if (withSound) {
          playError()
          hapticDeny()
        }
        return
      }
      if (withSound) {
        playSelect()
        hapticSelect()
      }
      setSelected((prev) => [...prev, num])
    },
    [seatByNumber, maxSelection, selected]
  )

  const handleSeatSelect = useCallback(
    (seat) => {
      if (seat.status === 'AVAILABLE') handleSeatToggle(seat.seatNumber, true)
    },
    [handleSeatToggle]
  )

  // Pure, synchronous move-target computation. Both the focused-seat visual
  // (via setFocusIndex) and the SR grid's onKeyDown use it, so the keydown
  // handler can focus the NEW seat directly instead of reading a stale
  // focusIndex from a rAF closure.
  const computeMoveIndex = useCallback(
    (dir, cur) => {
      if (seatNumbers.length === 0) return null
      const n = seatNumbers[cur]
      if (n == null) return 0
      const row = Math.floor((n - 1) / perRow)
      const col = (n - 1) % perRow
      let cand
      if (dir === 'left') cand = row * perRow + (col - 1) + 1
      else if (dir === 'right') cand = row * perRow + (col + 1) + 1
      else if (dir === 'up') cand = (row - 1) * perRow + col + 1
      else cand = (row + 1) * perRow + col + 1
      if (cand < 1 || cand > capacity) return cur
      const idx = seatNumbers.indexOf(cand)
      return idx === -1 ? cur : idx
    },
    [seatNumbers, perRow, capacity]
  )

  const backLinkRef = useRef(null)
  const toastRef = useRef(null)
  const conflictRef = useRef(null)
  const seatBtnRefs = useRef([])

  const seatTabIndex = (i) => (i === focusIndex ? 0 : -1)

  const focusFirstSeat = useCallback(() => {
    const first = seatNumbers.findIndex((n) => {
      const s = seatByNumber.get(n)
      return s && s.status === 'AVAILABLE'
    })
    const target = first === -1 ? 0 : first
    setFocusIndex(target)
    requestAnimationFrame(() => seatBtnRefs.current[target]?.focus())
  }, [seatNumbers, seatByNumber])

  useEffect(() => {
    if (mode === 'ready') focusFirstSeat()
  }, [mode, focusFirstSeat])

  // When switching back to 3D, land keyboard focus back on the roving grid.
  useEffect(() => {
    if (mode === 'ready' && viewMode === '3d' && seatNumbers.length > 0) {
      requestAnimationFrame(() => seatBtnRefs.current[focusIndex]?.focus())
    }
  }, [mode, viewMode, seatNumbers.length, focusIndex])

  useEffect(() => {
    if (lockError && toastRef.current) toastRef.current.focus()
  }, [lockError])

  useEffect(() => {
    if (conflict && conflictRef.current) conflictRef.current.focus()
  }, [conflict])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && mode === 'ready') backLinkRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  // Find up to `maxPer` AVAILABLE seats nearest to each conflicted seat
  // (numeric distance outward ±1, ±2, …), capping the total suggestions so the
  // conflict panel stays tidy. Never suggests a seat the user already picked.
  const nearestAvailable = useCallback(
    (conflicted, freshByNum, takenSet, maxPer = 2, maxTotal = 4) => {
      const alternatives = []
      const seen = new Set()
      for (const c of conflicted) {
        const n = Number(c)
        let offset = 1
        let added = 0
        while (added < maxPer && offset <= capacity && alternatives.length < maxTotal) {
          const cands = [n - offset, n + offset].filter(
            (x) => x >= 1 && x <= capacity && !seen.has(x)
          )
          for (const x of cands) {
            seen.add(x)
            const seat = freshByNum.get(x)
            if (seat?.status === 'AVAILABLE' && !takenSet.has(x)) {
              alternatives.push(x)
              added += 1
              if (added >= maxPer || alternatives.length >= maxTotal) break
            }
          }
          offset += 1
        }
      }
      return alternatives
    },
    [capacity]
  )

  // Remove conflicted seats from the selection but KEEP the user's other valid
  // picks (today's 409 path cleared everything — this preserves them), then
  // surface non-punitive conflict info + clickable alternatives. If the server
  // supplied alternatives, prefer them; otherwise derive locally.
  const applyConflict = useCallback(
    (selectedList, conflicted, freshByNum, serverAltNums) => {
      const valid = selectedList.filter((n) => !conflicted.includes(Number(n)))
      setSelected(valid)
      const alternatives = Array.isArray(serverAltNums) && serverAltNums.length > 0
        ? serverAltNums
        : nearestAvailable(conflicted, freshByNum, new Set(selectedList.map(Number)), 2, 4)
      setConflict({ conflicted, alternatives })
    },
    [nearestAvailable]
  )

  const handleLockConflict = useCallback(
    async (err) => {
      // Backend contract: the 409 body nests the failure detail under
      // `data.conflict` — `conflictingSeats: string[]` names the losers and
      // `suggestedAlternatives: {seatNumber,row,side,price}[]` offers up to 2
      // nearest free seats per loser. If that block is absent we derive the
      // losers from a fresh GET. Either way the client keeps all non-conflicting
      // selections and only drops the losers.
      const data = err?.response?.data
      const conflictBlock = data?.conflict
      const serverConflicts = Array.isArray(conflictBlock?.conflictingSeats)
        ? conflictBlock.conflictingSeats.map(Number)
        : Array.isArray(data?.conflicts)
          ? data.conflicts.map(Number)
          : Array.isArray(data?.seatNumbers)
            ? data.seatNumbers.map(Number)
            : []
      const serverAltNums = Array.isArray(conflictBlock?.suggestedAlternatives)
        ? conflictBlock.suggestedAlternatives.map((s) => Number(s.seatNumber))
        : []
      try {
        const freshRes = await api.get(`/trips/${trip.tripId}/seats`)
        const freshSeats = freshRes.data?.seats ?? []
        setSeatsData(freshRes.data)
        const freshByNum = new Map(freshSeats.map((s) => [Number(s.seatNumber), s]))
        const conflicted = (serverConflicts.length ? serverConflicts : selected).filter(
          (n) => selected.includes(Number(n)) && freshByNum.get(Number(n))?.status !== 'AVAILABLE'
        )
        if (conflicted.length > 0) {
          applyConflict(selected, conflicted, freshByNum, serverAltNums)
        } else if (serverConflicts.length > 0) {
          // Server named the losers but the fresh map still shows them free —
          // trust the server's word and drop exactly those.
          applyConflict(selected, serverConflicts.filter((n) => selected.includes(Number(n))), freshByNum, serverAltNums)
        } else {
          setLockError('Those seats were just taken. Your other seats are still selected — try again.')
        }
      } catch {
        if (serverConflicts.length > 0) {
          applyConflict(selected, serverConflicts.filter((n) => selected.includes(Number(n))), new Map(), serverAltNums)
        } else {
          setLockError(errorMessage(err, 'Those seats were just taken. Please pick again.'))
        }
      }
    },
    [trip, selected, applyConflict]
  )

  const continueBooking = async () => {
    if (selected.length === 0 || !boardingPointId || !dropoffPointId) return
    setLocking(true)
    setLockError('')
    setConflict(null)
    try {
      // LIVE re-check: re-GET seats immediately before locking so the user is
      // never blind-sided by a stale map. If anything flipped to booked/locked,
      // reconcile locally and show alternatives WITHOUT clearing valid picks.
      const freshRes = await api.get(`/trips/${trip.tripId}/seats`)
      const freshSeats = freshRes.data?.seats ?? []
      const freshByNum = new Map(freshSeats.map((s) => [Number(s.seatNumber), s]))
      const conflicted = selected.filter(
        (n) => freshByNum.get(Number(n))?.status !== 'AVAILABLE'
      )
      if (conflicted.length > 0) {
        setSeatsData(freshRes.data)
        applyConflict(selected, conflicted, freshByNum)
        return
      }
      setSeatsData(freshRes.data)

      const res = await api.post('/bookings/lock-seats', {
        tripId: trip.tripId,
        seatNumbers: selected,
        boardingPointId: Number(boardingPointId),
        dropoffPointId: Number(dropoffPointId),
      })
      const { lockToken, lockedSeats, expiresAt, totalFare } = res.data
      const ref = `VY-${String(lockToken || Date.now()).slice(0, 6).toUpperCase()}`
      setLockResult({
        lockToken,
        lockedSeats,
        expiresAt,
        totalFare,
        payload: {
          ref,
          routeNumber: trip.routeNumber,
          from: trip.from,
          to: trip.to,
          seats: selected,
          date: toLocalYMD(),
          totalFare,
        },
      })
      setMode('success')
    } catch (err) {
      if (err.response?.status === 409) {
        await handleLockConflict(err)
      } else {
        setLockError(errorMessage(err, 'Could not lock seats'))
      }
    } finally {
      setLocking(false)
    }
  }

  const handlePickAlternative = (n) => {
    const num = Number(n)
    const seat = seatByNumber.get(num)
    if (!seat || seat.status !== 'AVAILABLE' || selected.includes(num) || selected.length >= maxSelection) {
      playError()
      return
    }
    playSelect()
    setSelected((prev) => [...prev, num])
    setConflict(null)
    setLockError('')
    // Land focus somewhere stable + visible after the panel closes.
    requestAnimationFrame(() => backLinkRef.current?.focus())
  }

  const handleDismissConflict = () => {
    setConflict(null)
    setLockError('')
    requestAnimationFrame(() => backLinkRef.current?.focus())
  }

  const handleChipRemove = useCallback(
    (n) => {
      // Deselect in shared state — Seat3D lift/color + HUD chips update together.
      handleSeatToggle(Number(n), true)
    },
    [handleSeatToggle]
  )

  const goToPayment = () => {
    if (!lockResult) return
    navigate('/pay', {
      state: {
        lockToken: lockResult.lockToken,
        trip,
        lockedSeats: lockResult.lockedSeats,
        boardingPointId: Number(boardingPointId),
        dropoffPointId: Number(dropoffPointId),
        totalFare: lockResult.totalFare,
        seatNumbers: selected,
        expiresAt: lockResult.expiresAt,
      },
    })
  }

  const handleStay = () => {
    const expired = lockResult?.expiresAt && Date.parse(lockResult.expiresAt) <= Date.now()
    setMode('ready')
    if (expired) {
      // The server released the seats — drop the stale selection and refetch so
      // the grid reflects the newly-freed seats.
      setSelected([])
      loadSeats()
    }
  }

  const rotateCam = () => {
    const c = controlsRef.current
    if (!c) return
    c.setAzimuthalAngle(c.getAzimuthalAngle() + Math.PI / 6)
    c.update()
  }
  const zoomIn = () => {
    if (viewMode === '2d') {
      map2dRef.current?.zoomIn()
      return
    }
    const c = controlsRef.current
    if (!c) return
    c.dollyIn(1.15)
    c.update()
  }
  const zoomOut = () => {
    if (viewMode === '2d') {
      map2dRef.current?.zoomOut()
      return
    }
    const c = controlsRef.current
    if (!c) return
    c.dollyOut(1.15)
    c.update()
  }
  const panCam = () => {
    const c = controlsRef.current
    if (!c) return
    const right = new THREE.Vector3().setFromMatrixColumn(c.object.matrixWorld, 0)
    c.target.addScaledVector(right, 0.5)
    c.update()
  }
  const resetCam = () => {
    if (viewMode === '2d') {
      map2dRef.current?.resetView()
      return
    }
    const c = controlsRef.current
    if (!c) return
    c.object.position.set(SETTLE_CAM.x, SETTLE_CAM.y, SETTLE_CAM.z)
    c.target.set(SETTLE_CAM.tx, SETTLE_CAM.ty, SETTLE_CAM.tz)
    c.update()
  }

  if (!trip) {
    return (
      <div className="card mx-auto max-w-xl p-10 text-center">
        <FaBus className="mx-auto mb-4 text-4xl text-slate-500" />
        <h1 className="text-xl font-bold text-white">No trip selected</h1>
        <p className="mt-2 text-sm text-slate-400">Search for a trip first, then pick your seats.</p>
        <Link to="/" className="btn-nexus mt-6">Back to search</Link>
      </div>
    )
  }

  const showIntro = mode === 'intro'

  // Live total for the bottom booking dock. Mirrors SeatHud's fare source so the
  // dock and the panel never disagree.
  const dockTotal = (seatsData?.farePerSeat ?? trip?.fare ?? 0) * selected.length

  return (
    <div className="mx-auto w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          ref={backLinkRef}
          onClick={backToResults}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-nexus-400"
        >
          <FaArrowLeft className="text-nexus-400" /> Back to results
        </button>
        {/* 3D/2D view toggle — always visible in the seat-select header (never
            buried under map overlays). Reads the persisted choice (account →
            session → first visit default) and writes it back on tap. */}
        <div
            className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 p-1 backdrop-blur"
            role="group"
            aria-label="Seat map view mode"
          >
            <button
              type="button"
              aria-pressed={viewMode === '3d'}
              onClick={() => viewMode !== '3d' && setViewModeManual('3d')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-nexus-400 ${
                viewMode === '3d' ? 'bg-nexus-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <FaCube aria-hidden="true" /> 3D View
            </button>
            <button
              type="button"
              aria-pressed={viewMode === '2d'}
              onClick={() => viewMode !== '2d' && setViewModeManual('2d')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-nexus-400 ${
                viewMode === '2d' ? 'bg-nexus-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <FaMap aria-hidden="true" /> 2D View
            </button>
          </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-nexus-500/15 text-nexus-400">{trip.busType}</span>
          <span
            className={`badge ${serviceClass === SERVICE_CLASS.NORMAL ? 'bg-slate-700 text-slate-200' : 'bg-amber-500/15 text-amber-300'}`}
          >
            {variant.label}
          </span>
          <span className="badge bg-slate-800 text-slate-300">{trip.routeNumber}</span>
          <span className="text-sm font-bold text-white">{trip.from} → {trip.to}</span>
          <span className="text-xs text-slate-400">{trip.operator} · {trip.busReg}</span>
        </div>
      </div>

      <div
        className="seat3d-stage relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
        style={{ minHeight: 520 }}
        role="group"
        aria-label={
          viewMode === '2d'
            ? '2D seat map. Use Tab to enter the seat grid and arrow keys to move between seats.'
            : '3D seat map. Use Tab to enter the seat grid and arrow keys to move between seats.'
        }
      >
        {viewMode === '3d' && (
        <Canvas
          key={`${sceneKey}-${viewMode}`}
          dpr={[1, 1.75]}
          shadows
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ fov: 50, position: [SETTLE_CAM.x, SETTLE_CAM.y, SETTLE_CAM.z], near: 0.1, far: 120 }}
        >
          <color attach="background" args={['#020617']} />
          {/* Choreographed NEXUS light rig: cool slate key, cyan/violet/magenta
              accent fills that tint the cabin sides, plus a soft atmospheric fog
              that melts the far wall into the aurora. DuskWorld (below) layers
              the cinematic backdrop on top of this rig; the fog is widened for
              the larger stage so the bus stays crisp and distant geometry melts
              into the deep blue (#050b16). */}
          <fog attach="fog" args={['#050b16', 16, 40]} />
          <ambientLight intensity={0.5} color="#cbd5e1" />
          <hemisphereLight args={['#67e8f9', '#0f172a', 0.42]} />
          <directionalLight
            position={[6, 10, 4]}
            intensity={1.1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
            shadow-camera-near={1}
            shadow-camera-far={50}
            shadow-bias={-0.0004}
          />
          <pointLight position={[-4.2, 2.4, -2]} intensity={0.9} color="#22d3ee" />
          <pointLight position={[4.4, 2.2, 3]} intensity={0.7} color="#a78bfa" />
          <pointLight position={[0, 1.4, -5]} intensity={0.5} color="#e879f9" />

          {/* Cinematic world stage — dusk backdrop, ground, rim light, env map.
              Tier-gated by the variant-capped effTier (low = flat-safe). */}
          <DuskWorld tier={effTier} reducedMotion={reducedMotion} />

          <Suspense fallback={null}>
            {showIntro && (
              <IntroRig onComplete={handleIntroComplete} onPhase={handleIntroPhase} busAnim={busAnim} skipSignal={skipSignal} variant={variant} />
            )}
            {mode === 'ready' && <InteriorRig controlsRef={controlsRef} />}

            <BusInterior3D
              variant={variant}
              seats={seatsData?.seats ?? []}
              capacity={capacity}
              busType={trip?.busType ?? 'LUXURY'}
              selected={selected}
              focusedNumber={focusedNumber}
              maxSelection={maxSelection}
              onSeatSelect={handleSeatSelect}
              busAnim={busAnim}
              showShell={showIntro}
            />
          </Suspense>

          <EffectComposer enableNormalPass={effTier === 'high'}>
            <TieredEffectPasses profile={{ tier: effTier }} />
          </EffectComposer>
        </Canvas>
        )}

        {viewMode === '2d' && (
          <SeatMap2D
            ref={map2dRef}
            seatsData={seatsData}
            capacity={capacity}
            busType={trip?.busType ?? 'LUXURY'}
            serviceClass={serviceClass}
            // Same resolved fleet variant as the 3D scene: the 2D outline/grid
            // branches on serviceClass today (2+2 Yutong vs 2+3 Viking via
            // seatMap2dLayout exports); the full variant (incl. vehicleModel)
            // is exposed here for the Game Designer's outline component to
            // consume as seatMap2dLayout.js evolves.
            variant={variant}
            selected={selected}
            focusIndex={focusIndex}
            onFocusIndexChange={setFocusIndex}
            computeMoveIndex={computeMoveIndex}
            onToggle={handleSeatToggle}
            farePerSeat={seatsData?.farePerSeat ?? trip?.fare ?? 0}
          />
        )}

        <p className="sr-only" aria-live="polite">
          {selected.length > 0 ? `Selected seats: ${selected.join(', ')}` : 'No seats selected'}
        </p>

        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={glassPanelStyle} role="status">
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-nexus-500" />
              Loading seat map…
            </div>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="w-full max-w-sm p-6 text-center" style={glassPanelStyle} role="alert">
              <p className="text-sm text-red-400">{loadError}</p>
              <button type="button" className="btn-secondary mt-4" onClick={loadSeats}>
                Try again
              </button>
            </div>
          </div>
        )}

        {viewMode === '3d' && showIntro && !loading && (
          <BoardingSequence phase={introPhase} onSkip={handleSkip} reducedMotion={reducedMotion} variant={variant} />
        )}

        {mode === 'ready' && (
          <SeatHud
            trip={trip}
            seatsData={seatsData}
            serviceClass={serviceClass}
            variant={variant}
            viewMode={viewMode}
            amenities={seatsData?.amenities ?? []}
            model={seatsData?.model}
            selected={selected}
            boardingPointId={boardingPointId}
            dropoffPointId={dropoffPointId}
            onBoardingChange={setBoardingPointId}
            onDropoffChange={setDropoffPointId}
            onBookNow={continueBooking}
            onRemoveSeat={handleChipRemove}
            locking={locking}
            maxSelection={maxSelection}
            muted={muted}
            onToggleMute={() => setMutedState((m) => !m)}
            onRotate={rotateCam}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onPan={panCam}
            onReset={resetCam}
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
          />
        )}

        {mode === 'ready' && !panelOpen && (
          <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-slate-950/85 px-3 py-3 backdrop-blur-md md:px-4">
            <div className="mx-auto flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    selected.length > 0 ? 'bg-nexus-500/20 text-nexus-300' : 'bg-slate-800 text-slate-400'
                  }`}
                  aria-hidden="true"
                >
                  <FaChair />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {selected.length > 0
                      ? `${selected.length} seat${selected.length === 1 ? '' : 's'} selected`
                      : 'Select your seats'}
                  </div>
                  <div className="truncate text-xs text-slate-400">
                    {selected.length > 0
                      ? `Total LKR ${dockTotal.toLocaleString()}`
                      : `Tap a seat on the ${viewMode === '2d' ? 'map' : 'bus'} to begin (up to ${maxSelection})`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={panelOpen}
                aria-controls="seatselect-hud"
                className={`btn-nexus inline-flex shrink-0 items-center gap-2 whitespace-nowrap !px-7 !py-3.5 text-base font-bold ${
                  selected.length > 0 ? 'animate-pulse-soft' : ''
                }`}
              >
                Book Now
                <FaArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {mode === 'ready' && (
          <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur md:flex">
            <FaKeyboard className="text-nexus-400" />
            {viewMode === '2d'
              ? 'Arrow keys move · Enter selects · Scroll to zoom'
              : 'Arrow keys move · Enter selects · Drag to orbit'}
          </div>
        )}

        {conflict && (
          <div
            ref={conflictRef}
            tabIndex={-1}
            className="absolute left-1/2 top-4 z-30 w-[min(94%,460px)] -translate-x-1/2 p-4 focus:outline-none"
            style={glassPanelStyle}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  {conflict.conflicted.length === 1
                    ? `Seat ${conflict.conflicted[0]} was just taken.`
                    : `Seats ${conflict.conflicted.join(', ')} were just taken.`}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {selected.length > 0
                    ? `No problem — your other ${selected.length} seat${selected.length === 1 ? '' : 's'} ${selected.length === 1 ? 'is' : 'are'} still selected.`
                    : 'No problem — pick a free seat below and continue.'}
                </p>
                {conflict.alternatives.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Still free nearby</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {conflict.alternatives.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handlePickAlternative(n)}
                          aria-label={`Select seat ${n} instead`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-nexus-500/40 bg-nexus-500/15 px-3 py-1 text-xs font-semibold text-nexus-300 transition hover:bg-nexus-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-nexus-400"
                        >
                          <FaChair className="text-[10px]" aria-hidden="true" />
                          Seat {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleDismissConflict}
                aria-label="Dismiss conflict message"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-700/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-nexus-400"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {lockError && !conflict && (
          <div
            ref={toastRef}
            tabIndex={-1}
            className="pointer-events-none absolute left-1/2 top-4 z-30 w-[min(92%,420px)] -translate-x-1/2 p-4 focus:outline-none"
            style={glassPanelStyle}
            role="alert"
          >
            <p className="text-sm text-red-400">{lockError}</p>
          </div>
        )}

        {mode === 'success' && lockResult && (
          <SuccessScene payload={lockResult.payload} expiresAt={lockResult.expiresAt} onContinue={goToPayment} onClose={handleStay} />
        )}

        {mode === 'ready' && viewMode === '3d' && (
          <div className="sr-only" role="grid" aria-label="Seat selection grid">
            {seatNumbers.map((n, i) => {
              const seat = seatByNumber.get(n)
              const unavailable = seat && seat.status !== 'AVAILABLE'
              const category = seat ? getSeatCategory(n, layout) : 'standard'
              const isSelected = selected.includes(n)
              return (
                <button
                  key={n}
                  type="button"
                  ref={(el) => {
                    seatBtnRefs.current[i] = el
                  }}
                  tabIndex={seatTabIndex(i)}
                  aria-label={seatAriaLabel(n, seat?.status ?? 'BOOKED', isSelected, category, seat?.price, serviceClass)}
                  aria-pressed={unavailable ? undefined : isSelected}
                  aria-disabled={unavailable ? 'true' : undefined}
                  onClick={() => handleSeatToggle(n, true)}
                  onKeyDown={(e) => {
                    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault()
                      const target = computeMoveIndex(e.key.replace('Arrow', '').toLowerCase(), focusIndex)
                      if (target !== focusIndex) {
                        setFocusIndex(target)
                        seatBtnRefs.current[target]?.focus()
                      }
                    }
                  }}
                >
                  {n}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
