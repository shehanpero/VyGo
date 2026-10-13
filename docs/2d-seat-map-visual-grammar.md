# 2D SVG Seat Map — Visual Grammar & Feel Spec

**Design spec only — no code written.**

- **Version:** 1.0 (2026-08-03)
- **Status:** Ready for Frontend implementation; all numeric `[PLACEHOLDER]` values flagged for playtest.
- **Renderer:** 2D SVG parallel renderer over the SAME seat data/state as `SeatSelect3D`.
- **Source of truth (reused, never duplicated):** `seatMeta.js` (`SEAT_COLORS`, `computeLayout`, `seatPositionFor`, `getSeatCategory`, `seatGlyphFor`, `seatAriaLabel`, `SEAT_STATE_GLYPHS`, `SEAT_CATEGORY_LABELS`, `categoriesForService`), `fleetVariants.js` (`getFleetVariant`, `variant.layout`), `deviceProfile.js` (LOW tier rules), `SeatHud.jsx` (legend parity), `SeatSelect3D.jsx` (`handleSeatToggle`, `handleSeatSelect`, `computeMoveIndex`, `focusIndex`, sr-only grid + live region).
- **No invented seat-map JSON.** Seat geometry is derived from `seatNumber` via `computeLayout` + `seatPositionFor`, exactly like the 3D path.

---

## 0. Non-negotiables (design contract)

1. **One state owner.** The map never holds selection state. Every pointer/keyboard activation calls the SAME shared actions the 3D uses — `handleSeatToggle(n, true)` (primary) or `handleSeatSelect(seat)`. `withSound=true` so `playSelect`/`playError` + haptics fire exactly as in 3D.
2. **Renderer is a pure projection** of `(seatsData, layout, selected, focusIndex, serviceClass, variant)`. Toggling 3D ⇄ 2D cannot lose selection because both read the same `selected` array from the orchestrator; the toggle is presentational.
3. **LOW device tier → default 2D, 3D toggle hidden entirely** (deviceProfile rule). While `profile.pending`, start in 2D; when the benchmark resolves to `high`/`mid`, auto-switch to 3D only if the user has not manually chosen 2D.
4. **One keyboard grid at a time.** In 2D mode the SVG seats ARE the interactive grid (roving tabindex + `computeMoveIndex`); the 3D hidden sr-only grid unmounts so there is never a double tab stop. In 3D mode the hidden grid stays exactly as it is today — no regression.
5. **Glyph + color always** (WCAG 1.4.1). Every non-available state carries its `SEAT_STATE_GLYPHS` mark; color is never the sole cue.

---

## 1. Layout Math

### 1.1 Constants (SVG user units; 1 meter = `S = 100` units)

| Constant | Value | Derivation |
|---|---|---|
| `S` | `100` units/m | uniform scale, keeps bus proportions |
| `CELL_W` | `seatW * S` → `44` (2+2) / `41` (2+3) | `seatMeta` `seatW` (0.44 / 0.41) |
| `ROW_H` | `ROW_PITCH * S` = `85` | `ROW_PITCH 0.85` |
| `BENCH_GAP` | `BENCH_GAP * S` = `100` | rear bench gap 1.0 m |
| `AISLE_W` | `aisle * S` → `58` (2+2) / `29` (2+3) | `aisle = max(0.24, interiorW − perRow·seatW)` |
| `PAD` | `30` | outer margin (keeps focus rings unclipped) |
| `ACCESSIBLE_PAD` | `9` each side | wider cell around the accessible seat |
| `CX` | `PAD + (busW/2)*S` = `30 + 127.5` = `157.5` | center of the 2.55 m bus width |
| `Y_TOP` | `PAD + 130` = `160` | top of row 0 (below windshield/driver zone) |

### 1.2 Transform (meters from `seatPositionFor` → SVG units)

```
xPx = CX + x_m * S
yPx = Y_TOP + (z_m - ROW_START_Z) * S        // ROW_START_Z = -4.15
```

- Front of bus = negative z = **top of the SVG** (y grows downward toward the rear) — preserves the legacy `BusSeatMap` "front at top" semantics.
- `seatPositionFor(n, layout)` already returns `[x, 0, z]` including the bench row and aisle centering — the 2D map consumes it verbatim. Do NOT recompute row/side/col from JSON.

### 1.3 Per-layout branch (driven by the FleetVariant registry)

`variant.layout` (`'2+2' | '2+3'` from `fleetVariants.js`) selects the geometry branch; `computeLayout(capacity, busType, serviceClass)` supplies the counts. **`computeLayout` is authoritative for placement**; `variant.layout` is the registry identity that also themes the outline (§2).

| | `variant.layout '2+2'` (Express/Yutong) | `variant.layout '2+3'` (Normal/Viking) |
|---|---|---|
| `computeLayout` | `left:2, right:2, perRow:4` | `left:3, right:2, perRow:5` |
| `CELL_W` | `44` | `41` |
| `AISLE_W` | `58` | `29` |
| Left-block centers xPx | `62.5, 106.5` | `61.0, 91.75, 122.5` |
| Right-block centers xPx | `208.5, 252.5` | `192.5, 254.0` |
| Outline | Yutong 12.0 m long, rounded nose, door notch | Viking ~10.8 m `[PLACEHOLDER]`, boxier, shallower notch |
| Accent | `panelAccent #d4af37` gold | `panelAccent #3b82f6` blue |

Guard: if `variant.layout` and `computeLayout.perRow` ever disagree (shouldn't — both derive from the same `serviceClass`), **trust `computeLayout`**, log a warning, and re-derive the outline from the resulting `perRow`.

### 1.4 Worked example A — capacity 45, 2+2 (Express)

`computeLayout(45, 'LUXURY', 'express')` → `{ left:2, right:2, perRow:4, fullRows:11, remainder:1, normal:false }`

- Rows 0–10 (seats 1–44), 11 full rows: y = `160, 245, 330, …, 1010` (pitch 85).
- Bench row (seat 45, `remainder 1`): `seatPositionFor` returns x = 0 m → centered at `xPx 157.5`; y = `160 + 11·85 + 100` = `1195`. Draw a "Rear bench" divider hairline above it.
- Seat cell rects (44 wide, centered on the x above): left block `[40.5–84.5]`, `[84.5–128.5]`; right block `[186.5–230.5]`, `[230.5–274.5]`. Aisle band = `[128.5–186.5]` (58 units).
- viewBox height: `1195 + 85/2 + rear wall (~50) + PAD` ≈ `1330` → `viewBox="0 0 315 1330"`.
- Accessible seat = `left+1` = **seat 3** (row 0, right-block aisle seat). Its cell widens to `44 + 18 = 62` → `[73.5, 135.5]`, overlapping 9 units into the aisle — that is the transfer zone (§3.8).

### 1.5 Worked example B — capacity 45, 2+3 (Normal)

`computeLayout(45, 'NORMAL', 'normal')` → `{ left:3, right:2, perRow:5, fullRows:9, remainder:0, normal:true }`

- Rows 0–8 (seats 1–45), 9 full rows: y = `160, 245, …, 840`. No bench.
- Left block centers: `61.0, 91.75, 122.5`; right block: `192.5, 254.0`. Cells 41 wide; aisle band `[143–172.5]` (29 units).
- viewBox: `viewBox="0 0 315 1040"`.

### 1.6 Bench row (any `remainder > 0`)

- Positions come straight from `seatPositionFor`'s bench branch (`x = (col − (remainder−1)/2) · 0.5` m → centers 50 units apart — **wider than the 41/44 cell**, keep that extra gap, do not squeeze).
- Bench cells render with the same treatments as normal rows.
- Divider: `1u` hairline `#1e293b` (slate-800) across the interior + 10px uppercase `slate-400` label "Rear bench" (improves the legacy 9px `slate-600` which fails contrast).

### 1.7 Fit / zoom relationship (why numbers stay readable)

- Default view = **fit-width**: `k = containerW / viewBoxW`. Because the bus is narrow (~2.55 m), this already renders cells ≥ ~44 CSS px on a 360 px phone — seat numbers readable without zoom.
- The full bus is taller than the container, so the map is vertically pannable; a "Fit" button (and zoom-out) reaches the whole-bus overview: `k_fit = min(k_w, k_h)`, clamped `k ∈ [0.35, 3.5]`.
- Recompute `viewBox` when `capacity`/`layout` change (variant switch → remount key like the 3D `sceneKey`).

---

## 2. Bus Outline

Top-down silhouette, drawn UNDER the seat layer. Wall band: bus width 2.55 m (`±127.5`) with interior floor 2.34 m (`±117`) — seats sit inside `±117`; the outline occupies `117–127.5` so it never collides with cells.

| Element | Express (2+2) | Normal (2+3) |
|---|---|---|
| Body length | `12.0 m` → 1200 u | `10.8 m` `[PLACEHOLDER]` → 1080 u |
| Body width | `2.55 m` → 255 u | `2.55 m` → 255 u |
| Corner radius | front `45 u`, rear `15 u` | front/rear `20 u` (boxier) |
| Nose (windshield) | tapered rounded-nose path from y≈`-70` (relative `Y_TOP`) | flatter boxier nose |
| Door notch | right wall recess `90 × 10 u` at y ≈ row-0 front, z −5.3…−4.4 m | shallower notch `70 × 6 u` `[PLACEHOLDER]` |
| Driver cell | front-left small rounded rect + steering-wheel circle (decorative, `aria-hidden`) | same |
| Entrance | front-right, dashed outline + "Entrance" label (mirrors legacy) | same |

- Fill `#0f172a` (surface-1); stroke `1.5u #1e293b` (slate-800). A 6-row window strip of small rounded rects along each wall (`#1e293b` fill, `aria-hidden`) suggests glazing — cheap, no text.
- Rear wall cap at the bottom, after the bench divider.
- Accent trim strips along both walls tinted `variant.panelAccent` at 40% opacity — gives the map the same fleet identity as the 3D interior/HUD (`#d4af37` Express, `#3b82f6` Normal).

---

## 3. Seat States & Treatment

Glyphs reuse `seatGlyphFor(category, status, selected)` + `SEAT_STATE_GLYPHS`. Hover = halo circle behind the seat (opacity 0 → 0.55, 150 ms) + stroke lighten + `scale(1.05)`; **selected outranks hover** (no hover scale on a selected seat — same rule as 3D).

| State | Fill | Stroke | Glow / halo | Glyph | Hover | Cursor / pointer-events |
|---|---|---|---|---|---|---|
| **Available** | `#2563EB` (SEAT_COLORS.available) | `1.5u rgba(255,255,255,0.35)` | none at rest; hover halo `#93c5fd` | none | yes (150 ms, scale 1.05) | `pointer` · auto |
| **Selected** | `#16A34A` | `2u #4ADE80` | permanent halo `#16A34A` blurred 6u, **pulse 2 s** + 300 ms pop | `✓` replaces the number | none (selected identity preserved) | `pointer` · auto (deselect) |
| **Booked** | `#DC2626` at `opacity 0.5` (hue matches legend) | `1.5u rgba(220,38,38,0.8)` | none | `🔒` centered, full opacity | none | `not-allowed` · **`pointer-events: none`** |
| **Reserved / Locked** | `#F97316` at `opacity 0.5` | `1.5u rgba(249,115,22,0.8)` | none | `⏳` centered (legend's single "Locked" entry) | none | `not-allowed` · **`pointer-events: none`** |
| **VIP** | `#D4AF37` | `1.5u rgba(255,255,255,0.4)` | hover halo `#FDE68A` | `👑` corner badge | yes | `pointer` · auto |
| **Ladies** | `#EC4899` | `1.5u rgba(255,255,255,0.4)` | hover halo `#F9A8D4` | `◆` corner badge | yes | `pointer` · auto |
| **Accessible** | `#7C3AED` | `2u dashed rgba(255,255,255,0.45)` | hover halo `#C4B5FD` | `♿` corner badge | yes | `pointer` · auto |

Notes:

- **Booked/Reserved translucency** is deliberate: hue matches the legend swatch exactly (same `SEAT_COLORS` values) while unavailable seats stay visually recessive so the map reads as "what can I pick". Color + glyph together carry the state (1.4.1).
- **`pointer-events: none` applies to mouse/touch only.** Unavailable seats REMAIN in the roving tab order for keyboard parity with the 3D sr-only grid; Enter/Space on one triggers the existing deny feedback inside `handleSeatToggle` (playError + hapticDeny), exactly like 3D.
- **Selected ≠ booked semantics:** a selected seat keeps its full green and remains clickable to deselect.
- **Corner badge:** 12 u circle, fill `rgba(2,6,23,0.85)`, stroke `1u rgba(255,255,255,0.3)`, glyph 9 u — mirrors the 3D glyph chip (`rounded-full bg-slate-950/85 border-white/30`). Badge sits at the cell's top-right, offset +2 u outside the corner.
- **Number visibility rule:** number is centered text (`text-anchor="middle"`, `dominant-baseline="central"`); when a corner badge is present the number keeps its center (badge overlaps the corner, not the text). When selected, `✓` replaces the number on-screen (number stays in `aria-label`/`<title>`); when the cell renders < 30 u (far zoom-out), the number collapses to a 6 u dot — see §6.

### 3.8 Accessible seat — wider cell + transfer zone

- Cell width `CELL_W + 2·ACCESSIBLE_PAD` = 62 u (2+2) / 59 u (2+3), centered on the seat center, expanding into the aisle (the seat is always the right-block aisle seat, `left+1`).
- Dashed stroke `2u rgba(255,255,255,0.45)` marks the wider footprint; add a faint hatch strip (3 diagonal lines, `aria-hidden`) in the aisle-side expansion to suggest the transfer zone.
- Hit target = the full 62 u rect (easier touch target).
- `♿` corner badge always (unless selected/booked/locked per `seatGlyphFor`).

### 3.9 Selected animation (2 s period, matches 3D)

3D reference (`Seat3D.jsx`): continuous `ei += 0.12 + sin(π·t)·0.12` — **exactly 2 s period** (t in seconds), plus a one-shot 300 ms scale pop `1 → 1.06 → 1` (`sin(π·t/0.3)`).

2D equivalent (CSS keyframes on SVG elements):

```css
/* One-shot pop — approximates the 3D half-sine pop (300 ms). */
@keyframes vygo-select-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}
/* applied: animation: vygo-select-pop 0.3s ease-in-out 1 both; */

/* Continuous soft glow — sin(π·t) → 2 s period. */
@keyframes vygo-selected-glow {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 0.85; }
}
/* applied to the halo circle: animation: vygo-selected-glow 2s ease-in-out infinite; */
```

- Halo circle behind the seat: r ≈ `CELL_W·0.8`, fill `#16A34A`, `filter: blur(6u)`, `pointer-events: none`.
- `transform-origin: center` (`transform-box: fill-box` on the seat `<g>`).
- Selection confirm = pop + `✓` + halo fade-in (0.35 static at `t=0`), all fired on the same frame the shared state changes.

### 3.10 VIP price always visible

- Each VIP cell renders a micro-caption under the seat: `LKR 1,250` (`farePerSeat.toLocaleString()`, font 10 u bold, `#94a3b8` slate-400 — AA on the dark floor).
- Render only when `CELL_W·k ≥ 34` CSS px (default fit-width view always satisfies this); in the far overview the price lives in the `<title>` tooltip + `aria-label` + the HUD's always-visible per-seat fare line (Express), so "always visible" holds.

---

## 4. Legend

- **Order and content match `SeatHud.jsx` `LEGEND` exactly:** Available, Selected, VIP, Ladies, Accessible, Locked, Booked.
- **Filter by service class with the SAME rule as the HUD** (`SeatHud` drops VIP + Ladies when not Express): use `categoriesForService(serviceClass)` to decide; Normal shows Available, Selected, Accessible, Locked, Booked.
- Swatch: `12×12` rounded-sm (`rx 2`), `border 1u rgba(255,255,255,0.4)`, background = the exact `SEAT_COLORS` hex (solid — legend swatches stay solid even though booked/locked seats render at 0.5 opacity; hue parity is what matters).
- Label: 11 px `#cbd5e1` (slate-300), glyph prefix where defined (`✓`, `👑`, `◆`, `♿`, `⏳`, `🔒`), exactly as the HUD renders them.
- Placement: on-map glass panel (`backdrop-filter: blur(14px); background: rgba(15,23,42,0.55); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px`), bottom-left inside the map, `2–3` column grid on ≥ 640 px, single column below. `aria-label="Seat map legend"`, swatches `aria-hidden`.

---

## 5. Interaction Feel

### 5.1 Pointer selection (the non-negotiable)

A click/tap on a selectable seat calls **`handleSeatToggle(n, true)`** — the identical action the 3D handler and sr-only grid dispatch. No local `setSelected`, no second state source, no optimistic copy. Sounds/haptics (`playSelect`/`playError`, `hapticSelect`/`hapticDeny`) are already inside the shared action; the map never plays them itself.

- `onClick` on the seat `<g>` (works for mouse + touch + keyboard-synthetic).
- Hover affordance on `onPointerEnter`/`onPointerLeave`; on coarse pointers disable hover-only effects (`@media (hover: hover)`), tap still selects on click.
- `user-select: none` on the `<svg>`; `-webkit-tap-highlight-color: transparent`; `touch-action: none` on the pan/zoom surface.

### 5.2 Timing (matched to 3D `Seat3D.jsx` constants)

| Event | Duration / easing |
|---|---|
| Hover halo + stroke lighten | 150 ms ease-out (`HOVER_RATE = 1/0.15`) |
| Selection color change | 300 ms ease-out (`SELECT_RATE = 1/0.3`) |
| Selection pop | 300 ms `ease-in-out`, `1 → 1.06 → 1` |
| Continuous selected glow | 2 s `ease-in-out` infinite (`sin(π·t)`) |
| Deselect | reverse lerps, glow halts |

### 5.3 Keyboard (SAME grid-order semantics as the 3D sr-only grid)

- Container: `role="grid"` `aria-label="Seat selection map"`.
- Each seat `<g role="gridcell">`, `tabIndex={i === focusIndex ? 0 : -1}` (roving), `aria-label={seatAriaLabel(...)}`, `aria-selected` for available, `aria-disabled="true"` for unavailable, `aria-pressed` for parity with the legacy buttons.
- **Arrow keys** on the container delegate to the orchestrator's existing `computeMoveIndex(dir, focusIndex)` — row-major: Left/Right `±1` in row, Up/Down `±perRow`, clamped to capacity, skips non-existent seats. Focus moves via `setFocusIndex(target)` + `.focus()` on the target `<g>`.
- **Enter / Space** → `handleSeatToggle(n, true)`.
- Ordering identity: the map renders seats in the orchestrator's canonical `seatNumbers` (ascending) so index ↔ seatNumber mapping is identical across renderers.
- **Focus ring:** SVG `outline: 2px solid #2dd4bf; outline-offset: 3u` on the focused `<g>` — design-system focus token (`--ring-color #2dd4bf`, ≈10.8:1), visible over every seat fill. Never clip the ring: container `overflow: hidden` gets `PAD ≥ 30` inset on the viewBox.
- Hint pill (desktop only, mirrors the 3D one): "Arrow keys move · Enter selects · Scroll to zoom · Drag to pan".

### 5.4 Pan / zoom / fit

- **Wheel:** zoom toward cursor, `k *= exp(-deltaY * 0.0015)`, clamp `[0.35, 3.5]`.
- **Pinch:** two-pointer distance ratio on the `<svg>` surface (`touch-action: none`).
- **Pan:** single-pointer drag (pointer capture), two-finger pan on touch.
- **Implementation:** all zoom/pan as CSS `transform: scale(k) translate(tx, ty)` on the `<svg>` element; screen→SVG hit conversion via `svg.getScreenCTM().inverse()` (rect coordinates never change — the CSS transform keeps pointer mapping automatic).
- **Double-click / double-tap:** zoom in ×1.4.
- **Fit button** (reuse `SeatHud` CamButton pattern): reset to whole-bus overview `k_fit`; also a "reset" affordance returns to fit-width default.
- Reduced motion: zoom/pan snaps (no easing).

### 5.5 Renderer toggle

- `role="group" aria-label="Seat map view"` of two buttons: "2D seat map" / "3D seat map", `aria-pressed` on the active one; hidden entirely on LOW tier.
- On switch, `focusIndex` persists; the newly-mounted grid focuses the same seat. Selection is untouched (shared state).

---

## 6. Typography / Contrast

### 6.1 Seat number

- Font: inherit (Tailwind/system sans), `font-weight: 700`, `font-variant-numeric: tabular-nums`, `letter-spacing: 0`.
- Size: `11.5` SVG units in a 44 u cell (≈26% of cell); at default fit-width on a 360 px viewport that renders ≥ **11 px**; floor **10 px** at the far overview — below that the number collapses to a 6 u dot (§3.9 note).
- Placement: centered in the cell (`text-anchor="middle"`, `dominant-baseline="central"`); corner badges never overlap the text baseline.
- On-screen label color per fill (all AA ≥ 4.5:1, computed vs the fill):

| Fill | Text color | Ratio (approx) |
|---|---|---|
| Available `#2563EB` | `#F1F5F9` (slate-100) | ≈ 4.6:1 ✓ |
| Selected `#16A34A` | `#020617` (dark) | ≈ 6.1:1 ✓ |
| VIP `#D4AF37` | `#0F172A` (dark) | ≈ 8.3:1 ✓ |
| Ladies `#EC4899` | `#0F172A` (dark) | ≈ 4.9:1 ✓ |
| Accessible `#7C3AED` | `#F1F5F9` | ≈ 5.1:1 ✓ |
| Booked / Locked | no number (glyph only) | n/a |
| Glyph badge | `#FFFFFF` on `rgba(2,6,23,0.85)` | ≈ 15:1 ✓ |

### 6.2 Captions & labels

- "Front of bus ▲", "Driver", "Entrance", "Rear bench": **10 px**, uppercase, `letter-spacing: 0.1em`, `#94a3b8` (slate-400 ≈ 7.9:1 on base) — bumps the legacy 9 px slate-600 to AA.
- VIP price caption: 10 px bold `#94a3b8`.
- Hints pill: 11 px `#94a3b8`.

---

## 7. Reduced Motion

Wrap all motion behind `@media (prefers-reduced-motion: reduce)` (mirrors the orchestrator's `reducedMotion` flag → pass it as a prop, same value):

- **Selected glow:** static halo at `opacity: 0.55`, no keyframes.
- **Select pop:** no scale animation (snap to 1), color change still applies (instant, `kColor = 1` — identical to 3D `snap`).
- **Hover transitions:** `transition: none` (instant halo/scale).
- **Pan/zoom:** snap, no easing, no double-tap zoom animation.
- Haptics disabled exactly as the orchestrator already does (`setHapticsEnabled(!reducedMotion)`).

---

## 8. Accessibility

1. **Per-seat name:** each seat `<g>` gets a native `<title>` (SVG tooltip + fallback name) AND `aria-label`, both built from `seatAriaLabel(n, status, selected, category, farePerSeat, serviceClass)` — the SAME string the 3D sr-only grid uses today, so SR output is identical between renderers ("Seat 7, available, LKR 1,250").
2. **Grid semantics:** visible 2D container `role="grid"`; seats `role="gridcell"` with roving `tabindex`, `aria-selected`/`aria-pressed`, `aria-disabled` for unavailable. In 2D mode the 3D hidden sr-only grid unmounts (single grid rule, §0.4); in 3D mode it stays byte-for-byte as shipped.
3. **Live region parity:** the page-level sr-only `<p aria-live="polite">Selected seats: …</p>` in the orchestrator is renderer-agnostic and ALREADY announces selection changes — the map adds NO second live region (prevents double-announce). Lock/conflict toasts keep their existing `role="alert"`.
4. **Keyboard parity:** identical `computeMoveIndex` row-major math, identical `seatTabIndex` roving pattern, identical Enter/Space activation. Arrow navigation may land on unavailable seats (as in 3D); activation is rejected with the shared deny feedback + `aria-disabled` conveys state.
5. **Non-color cues:** every unavailable/special state carries its glyph; selected carries `✓`; focus is a high-contrast teal ring — nothing is conveyed by color alone (1.4.1).
6. **Focus management on switch:** renderer toggle keeps `focusIndex`; remounting grid focuses the same seat; the toggle buttons are labelled (`Switch to 2D seat map` / `Switch to 3D seat map`) with `aria-pressed`.
7. **Decorative layer:** outline, windows, driver cell, transfer-zone hatching, halo circles, legend swatches all `aria-hidden="true"`.
8. **Touch targets:** effective hit rect ≥ 44 CSS px at default zoom — implement as an invisible rect `CELL_W + 8 × ROW_H + 8` behind each selectable seat (`pointer-events: all`, `fill: transparent`, `aria-hidden`); the accessible seat's 62 u cell already exceeds this.

---

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08-03 | Initial spec: layout math, outline, state treatments, legend, interaction, typography, reduced motion, a11y. |
