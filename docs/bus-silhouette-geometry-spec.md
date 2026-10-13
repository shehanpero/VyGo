# VyGo Bus Silhouette & 2D Seat-Map Geometry Spec

> Source: @3D & Scene Developer (geometry/path spec only — no model files, no code in the app).
> Derived from `fleetVariants.js` (Express → `yutong_c12_pro`, gold `#d4af37`; Normal → `ashok_leyland_viking`,
> blue `#3b82f6`), `BusInterior3D.jsx` (procedural shell: body `[2.5,3.3,12.5]`@y1.65, roof @y3.05, 6 windows at
> `windowZs=[-4.6,-2.76,-0.92,0.92,2.76,4.6]`, windshield rot 0.22 at z=-6.15, wheels r=0.52 at z=±4.7,
> door z≈-5.33..-4.47 on right flank, headlights z=-6.22 y=1.0, tail z=6.22 y=1.0), `seatMeta.js`
> (`ROW_START_Z=-4.15`, `ROW_PITCH=0.85`, `interiorW=2.34`), `HeroScene3D.jsx` palette.

**Scale:** 10 units/m (120 units = 12.0 m). All coordinates are **SVG user units, y-down**, nose at left (x=0),
ground line at **y=40**. Two "grounded deviation" notes: (a) code renders 6 window segments — spec renders 5
(front-most sits inside the door/driver zone); (b) the door is at x 9.2..17.8, ~11% from the nose, not 1/3 — code wins.

## 1A. YUTONG C12 PRO — Express (sleek, roof AC pod)

**viewBox:** `0 0 128 44` (shared with Viking so the animation stage never changes). Roof crown y=7 (3.3 m),
pod top y=4.8 (3.52 m), wheels r=5.2 at y=34.8, axles x=15.5 / 104.5 (wheelbase 89 = 8.9 m).

| Sub-path | Element / `d` | Fill / stroke |
|---|---|---|
| **body** | `M 0 40 L 2.5 40 L 2 27.7 L 0 16.3 C 1.2 13.2 4 10.2 10 7 Q 62 6.6 114 7 C 117.5 7 119.5 8.8 120 10 L 120 30 L 120 40 L 106.83 40 A 5.7 5.7 0 0 0 102.17 40 L 17.83 40 A 5.7 5.7 0 0 0 13.17 40 L 2.5 40 Z` | fill `#0a1526` |
| **roofEdge** | `M 10 7 Q 62 6.6 114 7` | stroke `rgba(52,211,153,0.35)` w=1.2, no fill |
| **windowBand** (5 rects, dividers are the body-colored 2.4-unit gaps) | y=17.6 h=7.8 w=16: x 26.9 · x 45.3 · x 63.7 · x 82.1 · x 100.5 | fill `#0e1a2e` op .92; top edge stroke `rgba(52,211,153,0.28)` w=0.8 |
| **door** (right-flank seam, leaf split at 13.5) | `M 9.2 20 L 17.8 20 L 17.8 38.5 L 9.2 38.5 Z M 13.5 20 L 13.5 38.5` | stroke `#16233c` w=1.2, no fill |
| **beltLine** (variant accent) | `M 3 26.4 L 117 26.4` (y=1.36 m, below window band) | stroke `var(--accent)` w=1.2 op .85 |
| **headlight** | core `M 0.4 28.8 L 2.8 28.8 Q 3.4 28.8 3.4 30 Q 3.4 31.2 2.8 31.2 L 0.4 31.2 Z`; glow circle (1.6,30) r=3.5; secondary rect x0.6 y33 w1.8 h1.6 rx0.8 | core `#fde68a`; glow `rgba(252,211,77,0.25)`; sec `rgba(252,211,77,0.5)` |
| **tailLight** | rect x116.8 y29 w3.2 h2.2 rx1.1; secondary rect x117.6 y33 w2.4 h1.4 rx0.7 | `#fcd34d` stroke `#f87171` w0.8; sec `rgba(248,113,113,0.55)` |
| **routeBoard** (on windshield rake) | `M 1 14.9 L 5.1 15.8 L 4.9 18.5 L 0.9 17.6 Z` | fill `#10b981` op .85 (pulse .6→.95) |
| **acPod** (Express only) | `M 40 6.8 L 40 5.2 Q 40 4.8 43 4.8 L 69 4.8 Q 72 4.8 72 5.2 L 72 6.8 Z` + vents at x46/54/62 y5.6..6.2 | fill `#0d1b30`, stroke `#1c2a4a` w0.8; vents `#1c2a4a` |
| **wheel** ×2 | `<g transform="translate(15.5,34.8)">` and `translate(104.5,34.8)`: tire `<circle r="5.2">`, rim `<circle r="3.0">`, hub `<circle r="1.0">`, ticks `<g class="spin">` 3 lines r1.7→2.9 at 0°/120°/240° | tire `#02060d`; rim `#0e1626` stroke `#1f2937`; hub `#34d399` op.6; ticks `#34d399` w1.1 op.85 |
| **shadow** | rect x1 y40.6 w118 h1.2 rx0.6 | fill `#020617` op .55 |

## 1B. ASHOK LEYLAND VIKING — Normal (boxier, flat roof, no AC pod)

**viewBox:** same `0 0 128 44`, ground y=40, bus x 0..110 (11.0 m), roof y=7.5 (3.25 m), wheels r=5.2 at y=34.8,
axles x=18 / 94 (wheelbase 76 = 7.6 m — longer overhangs, shorter wheelbase).

| Sub-path | Element / `d` | Fill / stroke |
|---|---|---|
| **body** | `M 0 40 L 3 40 L 2.5 27.7 L 1.5 17.5 C 2.2 13.5 4.5 10 8 7.5 L 102 7.5 C 107 7.5 109 9 110 10.5 L 110 29 L 110 40 L 96.33 40 A 5.7 5.7 0 0 0 91.67 40 L 20.33 40 A 5.7 5.7 0 0 0 15.67 40 L 3 40 Z` | fill `#0a1526` |
| **roofEdge** | `M 8 7.5 L 102 7.5` (flat, boxier) | stroke `rgba(52,211,153,0.35)` w=1.2 |
| **windowBand** (5 rects, y=17.6 h=7.8 w=14.1, ×0.88 scale) | x 23.65 · x 39.85 · x 56.05 · x 72.25 · x 88.45 | fill `#0e1a2e` op .92; top stroke `rgba(52,211,153,0.28)` |
| **door** (x 8.1..15.7; leaf split 11.9) | `M 8.1 20 L 15.7 20 L 15.7 38.5 L 8.1 38.5 Z M 11.9 20 L 11.9 38.5` | stroke `#16233c` w=1.2 |
| **beltLine** (variant accent) | `M 3 26.4 L 107 26.4` | stroke `var(--accent)` w=1.2 op .85 |
| **headlight** | core rect x0.5 y29 w2.0 h2.2 rx1; glow circle (1.5,30) r=3.0; secondary rect x0.7 y33 w1.4 h1.6 rx0.7 | core `#fde68a`; glow `rgba(252,211,77,0.25)`; sec `rgba(252,211,77,0.45)` |
| **tailLight** | rect x106.8 y29 w3.2 h2.2 rx1.1; secondary rect x107.6 y33 w2.4 h1.4 rx0.7 | `#fcd34d` stroke `#f87171` w0.8; sec `rgba(248,113,113,0.55)` |
| **routeBoard** (smaller, utilitarian) | `M 1 15.7 L 4.5 16.5 L 4.3 18.4 L 0.9 17.6 Z` | fill `#10b981` op .85 |
| **wheel** ×2 | `<g transform="translate(18,34.8)">` and `translate(94,34.8)` — same internals as Yutong | same as Yutong |
| **shadow** | rect x1 y40.6 w108 h1.2 rx0.6 | fill `#020617` op .55 |
| **acPod** | none (Normal = standard trim) | — |

**Profile differentiation:** Yutong = 120 long, rake `(2,27.7)→(0,16.3)` + curved cap `C`/crowned roof `Q`, AC pod,
gold belt; Viking = 110 long, near-vertical glass `(2.5,27.7)→(1.5,17.5)`, flat roof `L`, boxier square rear cap,
no pod, blue belt.

## 2. TOP-DOWN OUTLINES (2D seat map)

**Shared viewBox:** `0 0 124 34`, centerline y=17, nose at x=1. Bus width: Yutong 25.5 (2.55 m → y 4.25..29.75),
Viking 26 (2.6 m → y 4..30, boxier width/length ratio).

### Yutong C12 Pro top-down
| Sub-path | `d` / element | Fill / stroke |
|---|---|---|
| **outline** | `M 1 17 C 1.5 9.5 9 4.25 22 4.25 L 103 4.25 C 111 4.25 116.5 9.5 117.5 17 C 116.5 24.5 111 29.75 103 29.75 L 22 29.75 C 9 29.75 1.5 24.5 1 17 Z` | fill `#0a1526` |
| **frontGlass** (nose band) | `M 22 4.25 C 9 4.25 1.5 9.5 1 17 C 1.5 24.5 9 29.75 22 29.75` | stroke `#0e1a2e` w=2.4, no fill |
| **doorNotch** (right/entrance flank, x 9.2..17.8) | `M 9.2 29.75 L 10.4 27.4 L 17.2 27.4 L 17.8 29.75 Z` | fill `#0d1b30`, stroke `var(--accent)` w=0.8 |
| **seatGrid** | rect x21 y5.3 w76.5 h23.4 (interior 2.34 m inset 5.25/5.25; rows x 21..97.5) | stroke `rgba(148,163,184,0.45)` dash `3 3`, no fill |
| **aisle** | `M 17 5.3 L 17 28.7` | stroke `rgba(52,211,153,0.4)` w=1 dash `2 2` |
| **rowLines** | verticals at x = 21, 29.5, 38, 46.5, 55, 63.5, 72, 80.5, 89, 97.5 (10 rows, pitch 8.5) from y5.3..28.7 | stroke `rgba(148,163,184,0.25)` w=0.7 |
| **driverZone** (optional) | rect x3..21 y5.3..28.7 | stroke `rgba(148,163,184,0.2)` dash `2 3` |

Seat centers per row (2+2, seatW 0.44, aisle 5.8): y = 7.5, 11.9, 22.1, 26.5.

### Ashok Leyland Viking top-down
| Sub-path | `d` / element | Fill / stroke |
|---|---|---|
| **outline** | `M 1 17 C 1.5 9.5 9 4 21 4 L 94 4 C 102 4 107.5 9.5 108.5 17 C 107.5 24.5 102 30 94 30 L 21 30 C 9 30 1.5 24.5 1 17 Z` | fill `#0a1526` |
| **frontGlass** | `M 21 4 C 9 4 1.5 9.5 1 17 C 1.5 24.5 9 30 21 30` | stroke `#0e1a2e` w=2.4 |
| **doorNotch** (x 8.1..15.7) | `M 8.1 30 L 9.3 27.6 L 15.3 27.6 L 15.7 30 Z` | fill `#0d1b30`, stroke `var(--accent)` w=0.8 |
| **seatGrid** | rect x21 y5.3 w59.5 h23.4 (rows x 21..80.5 = 8 rows @40 seats) | stroke `rgba(148,163,184,0.45)` dash `3 3` |
| **aisle** | `M 17 5.3 L 17 28.7` | stroke `rgba(52,211,153,0.4)` w=1 dash `2 2` |
| **rowLines** | x = 21, 29.5, 38, 46.5, 55, 63.5, 72, 80.5 | stroke `rgba(148,163,184,0.25)` w=0.7 |

Seat centers per row (2+3, seatW 0.41, aisle 2.9): y = 7.35, 10.43, 13.5, 20.5, 26.65.

**Grid placement formula (any capacity):** `rowStartX = 21` (ROW_START_Z=-4.15 → 2.1 m from nose), `pitch = 8.5`,
`rows = floor(capacity/perRow)`, `perRow = 4` (Express) / `5` (Normal); bench remainder gap = 10 units behind last row.

## 3. MOTION ANATOMY (canonical scale, shared viewBox)

| | Yutong C12 Pro (Express) | Viking (Normal) |
|---|---|---|
| Front wheel center | (15.5, 34.8) | (18, 34.8) |
| Rear wheel center | (104.5, 34.8) | (94, 34.8) |
| Wheel radius | 5.2 (0.52 m) | 5.2 (0.52 m) |
| Wheelbase / contact line | 89, y=40 x 15.5..104.5 | 76, y=40 x 18..94 |
| Suspension bob pivot | (60, 40) = contact-line midpoint | (56, 40) |
| Recommended CG | (60, 22) — 1.8 m high | (56, 22) |
| Bob range | ±1.2 units vertical, ±1.4° rotation | same |
| Wheel spin at 90 u/s | 0.363 s/rev | 0.363 s/rev (same radius) |
| Full cross duration (travel 248 / 238 at 90 u/s) | 2.76 s | 2.64 s |

**Rule:** bob the **upper assembly only** (body, roof, windows, door, lights, belt, pod); keep wheels + shadow pinned
at y=34.8/40 — reads as suspension travel without wheel-ground slip. Wheels rotate via a `spin` keyframe on the inner
tick group (`transform-origin: 0 0` since each wheel group is already `translate`d to its center).

## 4. BUILD SPEC (for the Frontend Developer)

1. **No duplication via `<defs>` + CSS vars.** One inline `<svg viewBox="0 0 128 44" aria-hidden="true">` per bus stage.
   Put each bus's sub-paths in `<defs><g id="bus-yutong">…</g><g id="bus-viking">…</g></defs>`. Render
   `<g class="bus bus--express"><use href="#bus-yutong"/></g>` / `bus--normal` + `#bus-viking`.
   Accent with zero path duplication: `.bus--express { --accent:#d4af37 } .bus--normal { --accent:#3b82f6 }`;
   belt/door edge/notch strokes use `var(--accent)`. Emerald rim `#10b981`, tail `#fcd34d`, body `#0a1526` are fixed.
2. **Drive animation.** Wrap `<use>` in `<g class="bus--drive">`. CSS:
   `@keyframes driveBus { from { transform: translateX(128px); } to { transform: translateX(-248px); } }`
   (Viking: `-238px`). `animation: driveBus 2.76s linear infinite` (Yutong) / `2.64s` (Viking).
   Keep the stage svg at fixed px width (e.g. `max-width: 640px`); if scaled, travel distances stay proportional in user units.
3. **Wheel rotation.** Tick group: `@keyframes spin { to { transform: rotate(360deg); } }`,
   `animation: spin 0.363s linear infinite`.
4. **Suspension bob.** Upper assembly group: `@keyframes bob { from { transform: translateY(0); } to { transform: translateY(1.2px); } }`,
   `animation: bob 1.8s ease-in-out infinite alternate`; pair with a rotate (±1.4° about pivot via nested translate)
   only if the stage reads too stiff.
5. **prefers-reduced-motion static frame.**
   `@media (prefers-reduced-motion: reduce) { .bus--drive, .spin, .bus--bob { animation: none !important; } }`
   Default (non-animated) position `translateX(-60px)` — nose in the left third of the stage, wheels at 0° ticks,
   route board at static opacity 0.7.
6. **Seat map.** Separate inline `<svg viewBox="0 0 124 34">` per trip; draw outline → notch → grid/aisle/rows, then
   render seat chips at the computed y-centers above (or re-derive via `seatPositionFor` math:
   `mapX = 21 + (rowIndex*8.5) + 10*bias`, `mapY = 17 - 10*seatX`). Same accent var theming.
7. **Dusk harmonization.** Body `#0a1526` matches hero building silhouettes; emerald rim + amber tail/head read against
   `#020617` night; gold/blue accents map 1:1 to `panelAccent` from `fleetVariants.js`.
