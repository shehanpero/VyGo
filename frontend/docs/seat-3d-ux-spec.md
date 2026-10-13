# VyGo — "Enter the Bus" 3D Seat Selection UX Spec

**Document:** `frontend/docs/seat-3d-ux-spec.md`
**Author:** Game Designer (VyGo design authority)
**Audience:** 3D & Scene Developer (R3F / GSAP / framer-motion), UI Engineer, Finish-Gate Reviewer
**Version:** 1.0
**Status:** Living document — all numeric values are `[PLACEHOLDER]` hypotheses until playtested

---

## Changelog

| Ver | Date | Change |
|-----|------|--------|
| 1.0 | 2026-08-03 | Initial spec: intro choreography, seat state machine, juice rules, selection rules, smoothness contract |

---

## 1. Design Pillars & Intent

This spec governs the 3D seat-selection experience that replaces/augments the flat `BusSeatMap` on the Seat Select page (`src/pages/SeatSelect.jsx`). It is the creative authority the 3D & Scene Developer builds against.

**Design pillars (every decision below is measured against these):**

1. **Cinematic arrival** — entering the coach must feel like a AAA "keyhole" moment: deliberate, smooth, and skippable, never a loading spinner.
2. **Spatial clarity** — a seat's state must be readable in one glance from the isometric resting frame; color + lift + glow are redundant channels.
3. **Juice on every click** — selection is an event, not a state toggle. Sound, motion, haptics, and HUD all fire within 120 ms.
4. **Frame-rate honesty** — everything is frame-rate-independent; a 30 fps laptop and a 144 Hz desktop see the same *timing*, not the same *frame count*.
5. **Accessible by default** — `prefers-reduced-motion` cuts the flight, not the function. Subtitles, keyboard traversal, and aria states ship with the first build.

**Inspiration references:**
- **Apple Vision Pro spatial UI** — depth-layered glass panels, focus-based hover (slight scale + glow), floating labels, no harsh pops.
- **Airline seat selectors (SeatGuru / airline flows)** — grid-faithful map, clear booked/available read, selected seats "pop" so the total is never surprising.
- **AAA camera transitions (Uncharted / God of War / Naughty Dog "camera in a box")** — push through the doorway, hold, then reveal; FOV subtly tightens for tension and relaxes for the reveal; cinematic eased throughout (`power3.inOut`).

**Coordinate & model conventions (fix before code):**
- Three.js right-handed. Bus length along **Z** (front of bus = **-Z**, rear = **+Z**), width along **X** (driver side = **-X**), up along **Y**. Bus centered at origin; floor at `y = 0`.
- Seat pitch `0.85 m` (`[PLACEHOLDER]`), seat center height `0.45 m`, aisle width `0.55 m`.
- FOV baseline `40°`, camera near `0.1`, far `100`.
- **2D ↔ 3D color mapping contract:** the existing 2D map legend (Available slate / Selected `primary-500` emerald / Locked amber / Booked red) stays the source of truth on the page. In the 3D world the palette is *extended*, not contradicted: AVAILABLE = brand blue (new, reads better against warm interior), SELECTED = emerald green (identical hue to 2D selected), LOCKED = orange, BOOKED = red, VIP = gold, LADIES = pink, ACCESSIBLE = purple. The 3D legend must show the same four 2D meanings (Available / Selected / Locked / Booked) using the new 3D swatches.

---

## 2. Camera Choreography Timeline — "Enter the Bus"

Total runtime **≤ 9.0 s** (`[PLACEHOLDER]` target: 8.0 s), **skippable** at any point (any click / keypress / "Skip intro" chip) → hard cut to the resting isometric frame with a 0.35 s eased blend.

### 2.1 Timeline

All timings are absolute from timeline start. Camera poses are given as `position` (three.js world units) and `lookAt target`. Unless noted, all positions interpolate in **position space with eased value of `t`** (i.e. ease the blend factor, then lerp positions) — never lerp *toward* a moving target with linear dt-multiplied easing (that makes speed vary by frame rate).

| Beat | Time (s) | Phase | Camera position (start → end) | LookAt target | Easing (gsap) | Duration |
|------|----------|-------|-------------------------------|---------------|---------------|----------|
| **B0** | 0.00–0.40 | Glass loader fade-in | Static at establish: `(4.2, 1.9, 6.8)` | Bus center `(0, 0.9, 0)` | Overlay: `power2.out`; camera: none (hold) | 0.40 |
| **B1** | 0.40–2.40 | Exterior hero rotation (yaw sweep) | Bus yaws `+0° → +230°` on its local Y (turntable hero shot); camera holds establish | Bus center `(0, 0.9, 0)` | `power2.inOut` on yaw | 2.00 |
| **B2** | 2.40–3.40 | Dolly to front door | `(4.2, 1.9, 6.8)` → `(1.15, 1.55, 3.1)` | Door center `(0.0, 1.05, 2.9)`; FOV `40° → 36°` (tension) | `power3.inOut` | 1.00 |
| **B3** | 3.40–3.80 | Door opens | Hold `(1.15, 1.55, 3.1)`; door slides + rotates open; warm interior light spills (see §5 vignette) | Door center `(0.0, 1.05, 2.9)` | Door: `power2.out` (0.4 s); camera: none | 0.40 |
| **B4** | 3.80–4.40 | Enter through doorway ("keyhole" step) | `(1.15, 1.55, 3.1)` → `(0.0, 1.55, 2.35)` (crosses door plane; slight dip `y -0.06` at midpoint for a "step") | `(0, 1.2, 1.2)` (shift into aisle) | `power2.inOut` | 0.60 |
| **B5** | 4.40–6.40 | Aisle walk-through | `(0.0, 1.55, 2.35)` → `(0.0, 1.55, -3.4)` (front → rear, down the aisle; additive bob: `y += 0.035·sin(2π·t·1.4)`, tiny roll `0.012 rad` at 0.7 Hz) | `(0, 1.2, -2.0)` (leads the walk) | `power1.inOut` on Z + additive sine bob | 2.00 |
| **B6** | 6.40–8.00 | Rise to isometric reveal | `(0.0, 1.55, -3.4)` → `(-6.2, 6.1, -6.2)` (final corner); FOV `36° → 40°` (relax) | `(0, 0.5, 0)` (bus center) | `power4.inOut` (expo-style settle) | 1.60 |

**Keyframed waypoints** (implement as a single `gsap.timeline()` over `camera.position`, a shared `lookTarget` `THREE.Vector3`, and `camera.fov`; call `camera.lookAt(lookTarget)` every `useFrame`):

```
t=0.00  pos=( 4.2, 1.9,  6.8)  target=(0, 0.9, 0)   fov=40
t=0.40  pos=( 4.2, 1.9,  6.8)  target=(0, 0.9, 0)   fov=40
t=2.40  pos=( 1.15,1.55, 3.1)  target=(0, 1.05, 2.9) fov=36
t=3.80  pos=( 1.15,1.55, 3.1)  target=(0, 1.05, 2.9) fov=36
t=4.40  pos=( 0.0, 1.55, 2.35) target=(0, 1.2, 1.2)  fov=36
t=6.40  pos=( 0.0, 1.55,-3.4)  target=(0, 1.2, -2.0) fov=36
t=8.00  pos=(-6.2, 6.1, -6.2)  target=(0, 0.5, 0)    fov=40
```

### 2.2 Final isometric framing ("resting" state)

- **Azimuth:** 225° from +Z axis (corner view — front-left of the bus visible from above).
- **Pitch:** **32°–38°** below horizontal, target **35°**. At the spec position `(-6.2, 6.1, -6.2)` with target `(0, 0.5, 0)` the pitch is ≈ 35°.
- **Distance:** ≈ 9.5 m from target; entire seat grid must fit inside the frame at all times (both 2+2 and 3+2 layouts, rear bench included).
- **OrbitControls resting config (engaged after B6 completes):**
  - `target = (0, 0.5, 0)`
  - `minDistance = 3.0`, `maxDistance = 14.0`
  - `minPolarAngle = 0.15 rad` (never clip below floor), `maxPolarAngle = 1.25 rad` (~71°, prevents full top-down)
  - `enablePan = false` (pan reintroduces layout confusion; revisit only if playtest demands)
  - `enableDamping = true`, `dampingFactor = 0.08`
  - `autoRotate = 0.25 rpm` for idle shimmer, **stops permanently on first user input** (drag or wheel)
  - Intro timeline runs with OrbitControls disabled; enable with a 0.5 s crossfade at t = 8.0.

### 2.3 Easing vocabulary (exact curves)

| Curve | gsap name | Math (for hand-rolled `useFrame`) | Used for |
|-------|-----------|-----------------------------------|----------|
| easeInOutCubic | `power3.inOut` | `t<.5 ? 4t³ : 1-(-2t+2)³/2` | Dolly to door (B2), reveal (B6 position) |
| easeOutQuad | `power2.out` | `1-(1-t)²` | Overlay fade (B0), door open (B3) |
| easeInOutQuad | `power1.inOut` | `t<.5 ? 2t² : 1-(-2t+2)²/2` | Aisle walk Z-drive (B5) |
| easeInOutQuart | `power4.inOut` | `t<.5 ? 8t⁴ : 1-(-2t+2)⁴/2` | Isometric reveal settle (B6), camera FOV relax |
| easeInOutBack | `back.inOut(1.4)` | overshoot curve | Seat selection "pop" (§3) |
| easeOutBack | `back.out(1.7)` | overshoot settle | Snap-back on 409 (§4.4) |

**Implementer rule:** use GSAP tweens for the timeline (clock-based, inherently frame-rate-independent) and dt-based exponential lerps for all continuous seat motion (§3.4). Never mix the two for the same property.

---

## 3. Seat Animation State Machine

### 3.1 Model

A seat's full visual state = **availability** (one of `AVAILABLE / SELECTED / BOOKED / LOCKED`) **× class flavor** (one of `STANDARD / VIP / LADIES / ACCESSIBLE`). The eight named states below are the render-time composites. Flavor is a *tint + icon overlay*; availability drives interaction and motion. Class flavors never block selection — a `VIP·AVAILABLE` seat is clickable.

**Visual priority when channels conflict:** `BOOKED` > `LOCKED` > `SELECTED` > `HOVER` > class flavor > `AVAILABLE`. (A `LADIES·BOOKED` seat renders booked-red with the ladies icon — never pink.)

### 3.2 States, colors, behavior

| State | Hex (base / emissive) | Scale | Lift (Y, m) | Emissive | Pulse / Motion | Interaction |
|-------|-----------------------|-------|-------------|----------|----------------|-------------|
| **AVAILABLE** | `#3B82F6` brand-blue / emissive `0.06` | `1.00` | `0.00` | faint blue sheen | none (static) | click → SELECTED |
| **HOVER** | `#3B82F6` brightened `×1.25` / `0.45` | `1.06` | `+0.12` | strong blue glow + under-seat radial sprite | pulse `1.2 Hz` (amplitude `0.04` on emissive) | click → SELECTED |
| **SELECTED** | `#10B981` emerald / `0.60` | `1.08` | `+0.22` | strong green glow | gentle float bob: sine, amp `0.02 m`, `1.6 Hz` | click → AVAILABLE |
| **BOOKED** | `#EF4444` red / `0.15` | `1.00` | `0.00` | dim red | none (calm, desaturated) | inert |
| **LOCKED** | `#F97316` orange / `0.30` | `1.00` | `0.00` | orange glow | pulse `0.8 Hz` (urgency), lock icon | inert |
| **VIP** | `#F59E0B` gold tint / `0.20` | `1.00` | `0.00` | gold sheen | crown glyph + price tag label | as availability permits |
| **LADIES** | `#EC4899` pink tint / `0.20` | `1.00` | `0.00` | pink sheen | heart/label | as availability permits |
| **ACCESSIBLE** | `#A855F7` purple tint / `0.20` | `1.00` | `0.00` | purple sheen | wheelchair icon | as availability permits |

Legend (bottom of 3D canvas, matching the 2D page legend): Available (blue), Selected (green), Locked (orange), Booked (red).

### 3.3 Transition rules

| From | To | Trigger |
|------|----|---------|
| AVAILABLE | HOVER | pointerenter / keyboard focus |
| HOVER | AVAILABLE | pointerleave (only if not SELECTED) |
| AVAILABLE or HOVER | SELECTED | click / Enter (if `selected.length < 6`) |
| SELECTED | AVAILABLE | click / Enter (deselect) |
| ANY clickable | LOCKED | server refresh / lock-conflict shows seat locked by another session |
| ANY clickable | BOOKED | server refresh reports booked |
| SELECTED | (revert) | 409 conflict at lock time → affected seat snaps back to its server truth (BOOKED/LOCKED), removed from selection (§4.4) |
| HOVER | (reject) | click while a conflict refresh landed mid-hover → 1-pulse shake, no selection |

Transitions are **event-driven**, not polled. Server refresh is the only poller: every `15 s` while the seat map is visible `[PLACEHOLDER]`, plus immediately after a 409.

### 3.4 Exact lerp rates (units/second, frame-rate-independent)

Apply as `current = lerp(current, target, 1 - Math.exp(-rate * dt))` per frame. These are the tuning levers — every value `[PLACEHOLDER]` until playtested.

| Property | Rate (1/s) | Rationale |
|----------|-----------|-----------|
| Scale (hover) | `10` | fast but not instant; 60 ms to ~45% |
| Scale (select pop) | `14` | snappier than hover — ownership should *feel* faster |
| Y-lift | `12` | matches select pop; seat clearly leaves the floor |
| Base color RGB | `8` | ~250 ms to fully swap; no snapping |
| Emissive intensity | `6` | slower than color — glow should linger |
| Hover glow sprite alpha | `10` | |
| HUD total (DOM) | `Infinity` (1 frame) | never tween a number that represents money |

---

## 4. Feedback & Juice

### 4.1 Confirmation click — beat-by-beat timing (all ms, from pointerdown)

| t (ms) | Event | Spec |
|--------|-------|------|
| 0 | pointerdown | Seat press-squash to `scale 0.94` over `60 ms` (`power2.out`); haptic `navigator.vibrate(8)` if supported and not reduced-motion |
| 60 | click (pointerup) | **Selection blip** (§4.2); seat begins SELECTED transition: scale → `1.08`, lift → `+0.22` over `240 ms` (`back.out(1.4)`) |
| 90 | float-up | Seat-number label floats up `-28 px` over `700 ms` (`power3.out`), opacity `0 → 1 → 0`, then settles at rest position above seat with a 1× `pulse` at `1.6 Hz` (§3.2). Implement with framer-motion `animate` |
| 120 | HUD | **Same frame as state change** — React state commit drives the total; the DOM total must reflect the new count by the next paint (§6 acceptance A9) |
| 180 | glow settle | Under-seat sprite and emissive reach SELECTED levels |

### 4.2 WebAudio design (no audio assets; synthesized)

Master bus: `AudioContext` resumed on first pointerdown. All gains in the table are master-scaled.

| Sound | Wave | Freq (Hz) | Envelope | Gain | Use |
|-------|------|-----------|----------|------|-----|
| Select blip | sine glide | `660 → 880` over `0.06 s` | exp decay `0.09 s` | `0.18` | seat selected |
| "Thock" (layered under blip) | triangle | `180` | decay `0.05 s` (low-passed `600 Hz`) | `0.10` | tactile contact |
| Deselect | sine glide | `660 → 520` over `0.05 s` | exp decay `0.07 s` | `0.12` | seat deselected |
| Reject (max 6 / inert click) | square | `140` | decay `0.08 s` | `0.08` | denial |
| 409 shake | 2× thock + square `110 Hz` `0.12 s` | — | — | `0.14` | conflict |
| Success chime | 3× sine notes `523.25 (C5) → 659.25 (E5) → 783.99 (G5)`, each `0.12 s` | — | exp decay `0.35 s`, stagger `0.12 s` | `0.22` | lock success |

### 4.3 Success: chime + confetti

Fired when `/bookings/lock-seats` succeeds (immediately before navigating to `/pay`).

- **Confetti burst (3D, in-scene):** `60` particles `[PLACEHOLDER]` (acceptance ceiling `100`), instanced thin quads.
  - Colors: `#3B82F6, #10B981, #F59E0B, #EC4899, #F8FAFC`
  - Origin: center of the selected seat cluster, normal up
  - Initial speed `1.8–3.2 m/s`, spread cone `±140°`, gravity `0.35 m/s²`
  - Lifetime `1.6–2.6 s` (randomized), continuous spin, fade last `25%`
  - Object-pooled; zero allocation after warm-up
- Haptics: `vibrate([12, 50, 12])`.
- DOM toast: "Seats locked — complete payment to confirm" (matches existing `lockError` copy patterns).

### 4.4 Failure: 409 rejection

On `lock-seats` 409 (seat taken mid-flow):

1. **Camera micro-shake:** `3` decaying pulses, amplitude `0.02 rad`, `0.5 s` total (`power3.out`), applied to the intro rig only if active; otherwise to the seat grid camera.
2. **Flash:** conflicting seat(s) flash red `2×` (`0.12 s` on / `0.08 s` off).
3. **Snap-back:** any seat previously SELECTED that is now BOOKED/LOCKED on the fresh server payload animates scale → `1.00`, lift → `0.00`, color lerp to its truth state over `300 ms` with a `back.out(1.7)` overshoot on scale (a "recoil").
4. **HUD:** total recomputes on the same React commit as the payload swap — no ghost count ever persists (§6 A9/A12).
5. **Message:** error toast (existing `lockError` pattern) + rejected seat does the reject shake.

### 4.5 Hover glow

- Resting AVAILABLE: glow sprite alpha `0.0`, emissive `0.06`.
- HOVER: alpha `0.45`, emissive `0.45`; radial additive sprite radius `0.35 m` under the seat; tooltip chip (seat number + fare) fades in `120 ms`.
- Rates: §3.4. Intentionally *not* instant — a soft ramp reads as "alive", matching Vision Pro focus behavior.

---

## 5. Selection Rules

### 5.1 Limits & toggle semantics

- **Max 6 seats per transaction** — mirrors `maxSelection = Math.min(6, trip.availableSeats)` in `SeatSelect.jsx`; when `trip.availableSeats < 6`, the cap is that value.
- Toggle: click AVAILABLE → SELECTED; click SELECTED → AVAILABLE. BOOKED and LOCKED are inert (no click, no hover lift, `cursor: not-allowed` parity with 2D).
- Attempting a 7th seat: **deny** — seat does a 1-pulse reject shake (`0.18 m` lateral, `0.3 s`), reject blip (§4.2), HUD flashes "Max 6 seats" chip for `1.2 s`, seat never enters SELECTED. HUD never shows a 7th ghost.

### 5.2 Aisle / row traversal order (keyboard)

Mirror the 2D layout exactly (left block, aisle, right block; driver at front):

```
Row r (front → rear):  L1 L2 [L3] | aisle | R1 R2
```

- Focus order: left block row-major (`L1 → L2 → [L3]`), then right block row-major (`R1 → R2`), next row. `NORMAL` buses have 3 left + 2 right; sleeper coaches have 2 + 2; rear bench follows the same row-major rule.
- Keys: `ArrowLeft/Right` move within a row; `ArrowUp/Down` move to the adjacent row; `Enter` / `Space` toggles selection; `Home` / `End` jump to first/last interactive seat.
- **Focus == HOVER visuals:** the focused seat gets the full HOVER lift + glow + tooltip, so keyboard users receive identical state feedback. Focus ring must not double the glow (skip CSS ring; use the 3D hover material).
- All traversable seats reachable with `Tab` in the same order; `aria-pressed` mirrors SELECTED (as the 2D map does today).

### 5.3 Conflict handling mid-selection

- **Poll:** refresh seat payload every `15 s` while the map is visible `[PLACEHOLDER]`; also on window focus and on any 409.
- **Selected seat flips to BOOKED/LOCKED:** snap-back animation (§4.4 step 3) + toast "Seat 12 was just taken — pick another." Seat is removed from `selected` in the same state commit; total updates same frame.
- **Hover-then-click race:** if a refresh lands between hover and click, the click is **ignored with a 1-pulse shake** — the seat never joins the selection, so the HUD total can never reflect a seat that vanished. This is the invariant: **the HUD total must equal the sum of currently-SELECTED rendered seats at all times.**

---

## 6. Perceived Smoothness Rules

### 6.1 Frame-rate independence (60 fps target)

- All continuous motion uses `THREE.Clock.getDelta()` clamped to `dt ≤ 0.05 s` (prevents spiral after tab-switch) and exponential-lerp smoothing (§3.4). A 30 fps device must take the same real time to complete any animation as a 144 Hz device.
- GSAP for the timeline (clock-based). Do **not** advance GSAP with per-frame `timeScale` hacks.
- No per-frame allocations: module-level temp `Vector3`/`Color` objects; `Color.lerpColors`, not `setHex` per frame.
- DPR capped at `2`; `antialias: true`; reuse one seat geometry + instanced materials where possible.
- Confetti uses a fixed-size object pool (warm 60, never grow).

### 6.2 Motion dampening

- **`prefers-reduced-motion: reduce`:** skip the entire flight (B1–B5). Play B0 (fade) at `0.2 s`, then hard-blend to the isometric resting frame over `0.4 s`. Disable: bob, seat float bob, hover pulse, confetti, camera shake, `vibrate()`. Keep: all color/state changes (instant, no lerp), subtitles, focus ring.
- **Low-tier detection:** sample FPS for the first 30 rendered frames; if `< 45 fps`, set quality tier = LOW → confetti `24`, disable under-seat sprites and bloom, keep vignette static (no animation).
- **Tab hidden:** pause the intro timeline; on return, resume — never jump-snap the camera.

### 6.3 Cinematic vignette

- CSS radial-gradient overlay (`inset 0 0 120px rgba(2,6,23,.55)`), peak opacity `0.35` during B5 aisle walk, relaxing to `0.10` at rest (focus assist, not mood).
- Optional post-processing bloom (quality tier HIGH only). If bloom is used, SELECTED seats must bloom the strongest; AVAILABLE must stay below bloom threshold.

### 6.4 Subtitles / status captions (accessibility)

Bottom-center caption line (`aria-live="polite"`, uppercase tracking, slate-300 on dark), synced to intro beats:

| Beat | Caption |
|------|---------|
| B1 | "Exploring the coach…" |
| B2 | "Approaching the entrance…" |
| B4 | "Entering…" |
| B5 | "Walking through the aisle…" |
| B6 | "Take your seat." |

Captions remain visible under reduced motion (static text, no parallax). All interactive seats keep `aria-label="Seat 12, available, LKR 850"`.

---

## 7. Design Contract / Acceptance Checklist

The Finish-Gate Reviewer checks **all** of the following against this build. Each is binary pass/fail.

| # | Criterion |
|---|-----------|
| A1 | Total intro `≤ 9 s`, and it is skippable at any moment (click, key, or "Skip intro" chip) with a ≤ `0.35 s` blend to the resting frame. |
| A2 | Intro plays the exact beat order B0→B6; camera pose matches the keyframe table within `0.1 m` at each beat checkpoint. |
| A3 | Final resting frame is isometric: azimuth 225°, pitch 32°–38° (spec 35°), and the full seat grid is visible at default zoom. |
| A4 | OrbitControls are disabled during intro, enabled after with target `(0,0.5,0)`, min/max distance `3/14`, `dampingFactor 0.08`, `enablePan false`. |
| A5 | Seat AVAILABLE = brand blue `#3B82F6`; SELECTED = emerald `#10B981`; BOOKED = red; LOCKED = orange; VIP/LADIES/ACCESSIBLE render gold/pink/purple tints with their icons. |
| A6 | Hover lifts the seat `+0.12 m`, scales `1.06`, glow emissive reaches `0.45`, and glow lerps at `10/s`. |
| A7 | Selected seat visibly lifts `+0.22 m`, scales `1.08`, floats its number label, and bobs at `1.6 Hz`. |
| A8 | Confirmation feedback fires within `120 ms` of click: press-squash, select blip, float-up, haptic. |
| A9 | HUD total updates within one rendered frame of a selection state change (no tween, no delayed total). |
| A10 | A 7th seat is denied with a reject shake + "Max 6" chip + reject blip; HUD never shows 7. |
| A11 | Keyboard traversal follows left-block row-major → right-block row-major; focused seat shows identical HOVER visuals. |
| A12 | On a 409, conflicting selected seats snap back (scale/lift/color revert, `300 ms`, back-out overshoot) and the HUD total drops on the same frame. |
| A13 | Hover-then-conflict race: a click on a seat that just became unavailable is ignored with a 1-pulse shake — it can never be selected. |
| A14 | Success chime (C5–E5–G5) + confetti burst of `60` particles (`< 100`), pool-allocated, gravity `0.35`, lifetime ≤ `2.6 s`. |
| A15 | `prefers-reduced-motion` skips the flight, removes bob/pulse/confetti/shake, keeps captions + state colors, completes in ≤ `1 s`. |
| A16 | Subtitles/captions appear for every intro beat, `aria-live` polite; captions survive reduced motion. |
| A17 | Frame-rate independence: seat lerps use `1 - exp(-rate·dt)`; delta clamped `≤ 0.05 s`; no per-frame allocations. |
| A18 | 3D legend swatches match the 2D legend semantics (Available/Selected/Locked/Booked) and 3D colors. |
| A19 | Seat payload refresh poll runs every `15 s` and on window focus; 409 triggers immediate re-fetch. |
| A20 | Vignette peaks at `0.35` during the aisle walk, relaxes to `0.10` at rest; bloom (if any) only on HIGH tier and SELECTED seats bloom strongest. |

**Known failure states to watch in playtest (define "broken" before testing):**
- Total intro feels longer than 9 s (people skip → treat skips as a signal; target < 8 s).
- Users cannot tell BOOKED from LOCKED at glance (raise orange pulse or add lock glyph).
- Users select a seat and *then* read the price (tooltip must precede selection on hover).
- 409 snap-back leaves the HUD different from the rendered seats (this is a blocking bug, not a tuning issue).

---

## 8. Suggested Implementation Shape (informative, not prescriptive)

- Component tree: `SeatSelect3D` (page) → `EnterBusCinematic` (timeline + camera rig) → `BusModel` → `InstancedSeats` → `SeatFeedbackLayer` (labels/toasts/confetti) + `HudOverlay` (total, legend, captions, skip chip).
- Timeline: one `gsap.timeline({ onComplete })`, driven by the keyframe table in §2.1; `useFrame` applies `camera.lookAt(lookTarget)`.
- Seat state: React state per seat (from the API payload) drives a per-seat *target* struct; `useFrame` lerps visuals toward targets via §3.4 rates.
- DOM float-ups: framer-motion `AnimatePresence` for labels; positioned via `THREE.Vector3.project(camera)` each frame.
- WebAudio: single module, lazily created `AudioContext`, all synth in §4.2.
- Dependencies to add: `three`, `@react-three/fiber`, `@react-three/drei` (OrbitControls, instanced helpers), `gsap`, `framer-motion`.

---

*End of spec v1.0 — all `[PLACEHOLDER]` values become hard numbers only after the first playtest gate.*
