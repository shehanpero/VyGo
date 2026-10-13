# VyGo Hero — "Bus Driving Across the Dusk Expressway" — World Composition Spec

> Source: @Unreal World Builder (environment/world spec only — no UE assets, no code written).
> Target: replacement for `frontend/src/components/HeroScene3D.jsx`, rendered in the existing
> `absolute inset-0 bg-slate-950` div inside `Home.jsx`'s hero section. Keep the existing
> `bg-gradient-to-br from-slate-950/85 via-slate-950/65 to-primary-950/55` overlay unchanged.

**Implementation contract:** one inline `<svg>` per layer (or one `<svg>` with `<defs>` + `<use>` tiles);
CSS `@keyframes` only; no WebGL, no rAF, no animation library. Scene must be `aria-hidden="true"`,
`pointer-events-none`, and must not block LCP (inline SVG = zero network cost — beats the current canvas
and the old 1 MB jpg per `docs/performance.md` rec #5).

**Palette (reuse `HeroScene3D` PALETTE exactly):**
`night #020617` · `deep #050b16` · `asphalt #060c17` · `emerald #10b981` · `emeraldBright #34d399` ·
`emeraldPale #a7f3d0` · `mint #d1fae5` · `amber #fcd34d` · `amberPale #fde68a` · `cream #fff7ed` · `white #f8fafc`.
Sky gradient stops (copy from HeroScene3D): `#020617 → #0b1424 (55%) → #101b2c (85%) → #14233a (100%)`.

Notation: `W` = hero container width (CSS px), `H` = hero container height. All horizontal percentages are of `W`,
vertical of `H`. "Left" = direction all ground-fixed scenery moves; the bus moves **right**
(Colombo-bound, front = right side of the silhouette).

## 0. Core rule

Flat side-profile tracking shot. **The bus sweeps right at constant speed; every ground-fixed layer scrolls
LEFT at a depth-weighted fraction of road speed; the loop seam is invisible because the bus is fully
off-screen at both 0% and 100%.** No perspective anywhere — depth is communicated only by parallax speed
ratio and silhouette darkness/size.

## 1. Layer stack (back → front)

| # | Layer | Parallax (W/s) | vs road (×R) | Dir | Animated |
|---|-------|---------------|--------------|-----|----------|
| L1 | Sky gradient + stars + dusk sun + horizon haze | 0 | 0 | — | static |
| L2 | Far hills (2 ridgelines + dagoba silhouette) | 0.096 | 0.3 | left | 2 s loop |
| L3 | City skyline glow + skyline tile (+ Lotus Tower) | 0.160 | 0.5 | left | 2 s loop |
| L4 | Mid-distant foliage (median palms, scrub) | 0.256 | 0.8 | left | 2 s loop |
| L5 | Road surface (asphalt band + edge lines) | 0 | 0 | — | static band |
| L6 | Lane dashes (painted on road surface) | 0.320 | 1.0 | left | 2 s loop |
| L7 | Road-edge fixtures (lamps, gantry, guardrail) | 0.320 | 1.0 | left | 2 s loop |
| L8 | **Bus rig** (silhouette + wheels + lights + shadow) | +0.160 | — | **right** | 8 s keyframe |
| L9 | Near verge (bushes, shrubs, small palms) | 0.416 | 1.3 | left | 2 s loop |
| L10 | Front foreground (large palm silhouettes) | 0.512 | 1.6 | left | 2 s loop |
| L11 | Vignette + bottom fade | 0 | 0 | — | static |

**Loop-seam rule:** every scrolling layer's total displacement per 8 s bus loop must be an integer multiple of
its own tile/pattern width. Every scrolling layer runs the same **2 s linear cycle**
(`translateX: 0 → −patternWidth`) = exactly **4 cycles per 8 s loop**:

| Layer | patternWidth (tile) | per-loop displacement |
|-------|---------------------|----------------------|
| L2 hills | 0.192 W | 0.768 W |
| L3 skyline | 0.320 W | 1.280 W |
| L4 mid foliage | 0.512 W | 2.048 W |
| L6 dashes | 0.640 W | 2.560 W |
| L7 road-edge | 0.640 W | 2.560 W |
| L9 near verge | 0.832 W | 3.328 W |
| L10 foreground | 1.024 W | 4.096 W |

Depth-cue ordering: nearer objects move fastest opposite travel. Road (L6/L7) = 1.0× anchor. Skyline 0.5×,
hills 0.3×. Foreground verge 1.3–1.6×. Sky never moves. Bus moves right at 0.16 W/s against everything left.

## 2. Road & motion frame

### 2.1 2.5-D road convention
Road is a band: upper ~35% a foreshortened "top surface" sliver where lane paint lives; lower ~65% the dark kerb face.
- Road band: **48% H (far kerb) → 60% H (near kerb) → 100% H (foreground face)**.
- Painted surface strip: 48–60% H. Lane dashes at **53% H**, second dashed line at **56.5% H**.
- Far edge line: 48.1% H, 0.3% H — emerald glow `rgba(16,185,129,0.25)` + cream core `rgba(209,250,229,0.5)`.
- Near edge line: 59.8% H, same recipe, dimmer.
- Asphalt: `#060c17` (top) → `#03070f` (bottom).
- Subtle horizon curve: sine wave (period 1.28 W, amplitude 0.8% H) baked into far edge line + skyline base.

### 2.2 World-units mapping
- Bus real length 12.5 m (from `BusInterior3D` body box). Drawn at 28% W → 1 m = 2.24% W → viewport ≈ 44.6 m of road.
- Bus center sweep: −16% W → +116% W over the loop (1.32 W travel).
- Bus ground-relative speed = bus sweep (0.16 W/s) + road scroll (0.32 W/s) = **0.48 W/s ≈ 21.4 m/s ≈ 77 km/h**.
- Dash cadence: one cycle = 0.0533 W ≈ 2.4 m world (stylized short for energy). Calmer alternative: period 0.268 W, pattern 0.64 W.

### 2.3 Dash scroll
Dash tile 0.64 W = 12 cycles (period 0.0533 W: dash 0.027 W + gap 0.0267 W). Each dash: width 0.027 W, height 0.35% H,
mint core `rgba(209,250,229,0.85)` + 2×-wide emerald underglow `rgba(16,185,129,0.35)`. Animation `translateX(0 → −0.64 W)`,
linear, 2 s, infinite. Bus overtakes road at 0.48 W/s — exactly the wheel spin speed (no slip).

### 2.4 Road-edge fixtures (L7)
Lamp posts scroll at 1.0×R = 0.32 W/s; light pools baked into road layer (L6) so pool + pole never separate.
One pole every 0.16 W (4 per tile), rising from 48% H to 40% H with arm + emerald lamp glow `rgba(52,211,153,0.35)`.
Every 0.333 s the bus passes a pole.

## 3. Environment dressing — Sri Lankan expressway at dusk

- **L1 Sky:** dusk gradient (0→46% H) as palette; 40–60 static stars `#e2e8f0` r 0.4–1.5 px op 0.15–0.6 in upper 30% H;
  dusk sun mostly sunk at (26% W, 47% H), radial cream `#fff7ed` r 4.2% W → amber `rgba(252,211,77,0.55)` → emerald halo
  `rgba(16,185,129,0.18)`; horizon haze emerald band 44–48% H `rgba(52,211,153,0.10→0)`.
- **L2 Far hills + dagoba (tile 0.192 W):** two sine ridgelines per tile (`#0a1424` far, `#050c18` near), one dagoba (stupa)
  per tile — dome 3–5% H, `#0a1526`, 0.5% H cream rim `rgba(255,247,237,0.35)` on the crown.
- **L3 City skyline (tile 0.320 W):** static glow overlay (emerald `rgba(52,211,153,0.22)` r 0.42 W + amber
  `rgba(252,211,77,0.13)` r 0.30 W at (50% W, 46% H)); per tile 12–16 buildings `#0a1526` heights 6–30% H, emerald rim
  `rgba(52,211,153,0.35)`, lit windows `#fcd34d`/`#34d399` 25–35% density; **Lotus Tower signature** needle per tile (1.5×
  tallest) with bulbous head picking up amber sunset rim.
- **L4 Mid foliage (tile 0.512 W):** 2–3 coconut palms per tile (`#050b16`), scrub bumps along 48% H, one rural landmark
  per tile (paddy tufts / tiny water tower `#050c16`).
- **L6/L7 Road + fixtures:** dashes §2.3; poles §2.4 with light pools painted in road layer; optional E01 toll-gantry
  silhouette (dark crossbeam at 42% H, tiny emerald "E01" 3–4 px `rgba(52,211,153,0.5)`).
- **L8 Bus** (from `BusInterior3D` side profile):

| Feature | On-screen spec |
|---|---|
| Body | rect 28% W × 16% H, rounded nose (right) + tail, fill `#050b16` |
| Window band | 6 mint rects `rgba(209,250,229,0.28)` 3.58% W × 3.8% H, pitch 4.12% W, top at 43.2% H, dark pillars `#020617` |
| Roof cap | 2.4% H strip `#0a1526`, emerald rim `rgba(52,211,153,0.5)` at 37.2% H |
| Emerald stripe | bar 46.9–47.3% H `rgba(52,211,153,0.55)` |
| Door notch | seam at 5–12% from front edge, 43–53% H, `#03070f` |
| Wheels | dark discs `#02060d` r 2.5% H at 52.5% H, front 12.4% / rear 87.6% of bus length |
| Front windshield | nose slant 2% W × 3% H at front/right, mint tint `rgba(209,250,229,0.18)` |
| Headlights | 2 cream dots at 48% H near front + beam cone `rgba(255,247,189,0.14)` |
| Tail lights | 1–2 amber dots at 48% H + glow `rgba(252,211,77,0.4)` |
| VyGo sign | emerald board `rgba(16,185,129,0.8)` at 39% H front quarter (optional 2 s pulse 0.5→0.9) |
| Ground shadow | ellipse `rgba(2,6,23,0.5)` at 55% H, width 24% W — moves with bus, on the road strip |

  Bus vertical: top 37% H, bottom 53% H (16% H tall), wheel contact 55% H — on painted strip.
- **L9 Near verge (tile 0.832 W):** 4–5 scrub arcs 3–6% H along 60–70% H (`#050b16`/`#0a1526`), 2 mid palms per tile
  rising 12–18% H leaning.
- **L10 Front foreground (tile 1.024 W):** 2–3 large palm silhouettes 20–30% H rising from 65–100% H, `#020617`, leaning,
  occasionally clipping frame top; tall verge grass bottom 8% H `#03070f`. Palms positioned at tile edges (x<8% and x>88%)
  so they never cross the center band where the bus is.
- **L11 Vignette + bottom fade:** radial `rgba(2,6,23,0)`→`rgba(2,6,23,0.5)` center (50% W, 45% H), linear bottom fade
  `rgba(2,6,23,0)` at 72% H → `rgba(2,6,23,0.92)` at 100% H.

## 4. Framing & camera

### 4.1 Vertical bands
Sky 0–46% H (headline lives top-left) · Horizon 46% H · Painted road strip 48–60% · Bus 37–53% (wheels to 55%) ·
Road face + near verge 60–100% · Bottom fade 72–100%.

### 4.2 Readability contract
- Copy clearance: H1 + subtitle in top ~35% H; bus top at 37% H → headline never behind the bus.
- Search-card clearance: card top ≈ 48% H covers only the bus's bottom ~5% (skirt + wheel tops); the window band
  (43–47% H), roof rim, stripe, lights stay visible above the card for the whole crossing. Bus passes **behind** the card's base.
- Most readable moment (nose + windshield + VyGo sign) peaks ~55–75% W.

### 4.3 Loop seam
Exit-right / re-enter-left, bus fully off-screen at both 0% and 100% (−16% → +116% center). All scroll layers back at
t=0 pose at loop restart. No fade, no second bus.

### 4.4 DOM/z-order
```
<section relative overflow-hidden rounded-3xl>          ← existing
  <div absolute inset-0 bg-slate-950>                    ← existing wrapper
    <div class="hero-stage" aria-hidden pointer-events-none>   ← NEW full-size, inset-0
      [L1 sky svg]
      [L2 hills]  [L3 skyline]  [L4 mid]
      [L5+L6 road svg (static band + dash tile)]
      [L7 fixtures]
      [L8 bus rig]                                       ← full-size wrapper animated 8 s
      [L9 verge]  [L10 foreground]
      [L11 vignette svg]
    </div>
    <div gradient overlay>                               ← existing, unchanged
  </div>
  <div relative px-6 py-10 …>                            ← existing copy + search card, unchanged
```
Each animated layer = a 100%-wide div with the pattern tiled inside; animate `transform: translate3d(0→−tileW)` where
tileW is a per-layer custom property (e.g. `--tile-hills: 19.2%`, or `translate3d(calc(-1 * var(--tile)), 0, 0)`).

## 5. Pacing — 8 s loop

### 5.1 Bus translate
```
@keyframes bus-drive {
  0%   { transform: translate3d(-16%, 0, 0); }
  12%  { transform: translate3d(-2%,  0, 0); }
  88%  { transform: translate3d(102%, 0, 0); }
  100% { transform: translate3d(116%, 0, 0); }
}
.bus-rig { animation: bus-drive 8s linear infinite; will-change: transform; }
```
Simplification allowed: drop the 12%/88% keys and animate `0% → −16% … 100% → 116%` fully linear (off-screen at both ends).

### 5.2 Layer scroll
```
@keyframes layer-scroll { from { transform: translate3d(0,0,0); } to { transform: translate3d(calc(-1 * var(--tile)), 0, 0); } }
/* every scrolling layer: animation: layer-scroll 2s linear infinite; */
/* --tile per layer: L2 19.2% · L3 32% · L4 51.2% · L6 64% · L7 64% · L9 83.2% · L10 102.4% */
```

### 5.3 Wheels — anti-strobe rule
Ground-relative speed 21.4 m/s; wheel r 0.52 m → 6.55 rev/s ≈ 393 RPM. **Do NOT draw visible spokes** (aliasing on 60 Hz).
Near-solid dark discs `#02060d`, brighter hub dot, static motion-smear crescent `rgba(148,163,184,0.18)`. If rotating,
rotate a faint 2-tick radial at 0.153 s/rev, linear, infinite (closed loop — any cycle count is seamless).

### 5.4 Suspension bob (nested inside the rig, NOT on the rig)
```
@keyframes bus-bob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-0.5%) rotate(-0.35deg); }
}
.bus-svg { animation: bus-bob 2s ease-in-out infinite; }
```
Amplitude 0.5% H, 0.5 Hz (4 bobs/loop), ±0.35° pitched around the rear-wheel axis. **Ground shadow must NOT bob**
(lives in the rig outside the bobbing group).

### 5.5 Full loop timing table
| Element | Timeline | Easing | Cycles/loop |
|---|---|---|---|
| Bus sweep | 0→8 s (off-screen→off-screen) | linear (cruise inside frame) | 1 |
| Bus bob + pitch | 0/2/4/6/8 s | ease-in-out | 4 |
| Wheel rotation | 0.153 s/rev | linear | 52.3 (seamless) |
| All scroll layers | 2 s cycle | linear | 4 |
| Lamp-pass | one pole / 0.333 s | — | — |
| VyGo sign pulse (optional) | 2 s | ease-in-out | 4 |
| Window flicker (optional, skip low-end) | 2 s | ease-in-out | 4 |

### 5.6 Feel
8 s = stately dusk "arrival" cruise at ~77 km/h implied. Urgency knob: 6 s loop → bus sweeps 0.213 W/s, scroll cycles
1.5 s (still 4 cycles/loop). Do not go below 6 s.

## 6. Reduced motion — static frame
```
@media (prefers-reduced-motion: reduce) {
  .bus-rig, .bus-svg, [data-scroll], [data-flicker] { animation: none !important; }
}
```
Bus centered at 50% W, vertical band unchanged, no bob, wheels static discs. All scroll layers at t=0 pose. Same
palette/layers/vignette. No JS guard needed — pure media query.

## 7. Spatial review — `SETTLE_CAM` in `BoardingSequence.jsx`

`SETTLE_CAM = { x: 4.6, y: 7.4, z: 8.6, tx: 0, ty: 0.7, tz: 0.3 }`. Verdict: good reveal camera, mediocre interaction camera.
1. Frame center at cushion height — seat-back faces sit below frame center; top third is ceiling. **Recommend `ty ≈ 1.2–1.35`**.
2. Near rows occlude far rows in 2+3 (Normal); `isNormal` compensates by hugging the aisle. **Mitigation:** Normal settle
   slightly more overhead (y ~8.5, tx ~0.2).
3. Settle frame is mostly exterior void (right third shows floor slab). **Pull settle to x ≈ 2.8–3.2, z ≈ 7.2** to fill frame.

## 8. Implementation guardrails
- Perf: ≤ 7 animated layers, `transform`/`opacity` only, `will-change: transform` on bus rig + 7 scroll layers only; no
  box-shadow/left/top animation; reuse shapes via `<defs>/<use>`.
- Colors: emerald = primary/action, teal kept out; amber + cream = dusk accents only; no red tail lights (amber is
  palette-safe dusk tail-light).
- A11y: `aria-hidden="true"`, `role="presentation"`, `pointer-events-none`; reduced-motion per §6.
- deviceProfile: hero does not need the tier system — do NOT mount `ensureDeviceProfile()` on Home for the hero's sake.
- Responsive: bands are %-based; if the search card's top edge sits above ~48% H at a breakpoint, nudge `--bus-top: 37%`
  → 40% at `@media (min-width: 1536px)`. Invariant: bus windows (43–47% H) stay above the card's top edge.
- Testing: watch 3 consecutive loops; verify dash/pole alignment (both 0.64 W tiles, 2 s cycles); verify the 12-dash tile stitches exactly.
