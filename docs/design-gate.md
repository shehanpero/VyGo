# UI Finish Gate — VyGo Frontend (Home / Routes / Seat Select / Payment)

**Reviewer:** UI Finish-Gate Reviewer · **Date:** 2026-08-03
**Scope:** `frontend/src/pages/{Home,Routes,SeatSelect,Payment}.jsx`, `frontend/src/components/{HeroScene3D,RouteMap}.jsx` (editable), plus handoff audit of `ExpresswayCorridors.jsx`, `OperatorChips.jsx`, `AiAssistant.jsx`, `Layout.jsx`, `Brand.jsx`, `index.css` (owned by concurrent a11y agent — issues reported, not edited).

---

## Product Lens

VyGo is a Sri Lankan bus-booking product whose remake promise is *corridor-aware expressway travel*: a passenger must be able to get from "I want to go south fast" to a booked, expressway-only seat with the corridor context (E01 Southern / E03 Airport) preserved the whole way. The first-read object on Home is the corridor/quick-route grid; the primary action is a pre-targeted trip search; the repeat workflow is Colombo → South (Galle/Matara/Kataragama) or Colombo → Katunayake Airport. Every handoff link must resolve against the real backend seed (146 routes, E001/E003 stored codes, `EX 2-6` Colombo→Kataragama, `EX 3-1` Colombo→Katunayake Airport, etc.) — a link that searches a non-existent from/to pair is a dead end, not a "demo".

Constraints: React 18 + Vite 5 + Tailwind, expressway teal tokens, leaflet corridor map, lazy route chunks, `sessionStorage` payment context, backend sandbox payments (PayHere) with no env-flag gating in the original code.

---

## Decision: HOLD (one critical handoff bug outside edit scope) / PASS for all files in scope

All review-scope files pass after the fixes below. One **critical user-facing bug** remains in `ExpresswayCorridors.jsx` (off-limits to this review): two "featured classic" links search from/to pairs that do not exist in the backend, guaranteeing an empty search. Handoff to the owning agent is required before ship.

---

## Per-Page Audit

### 1. Home (`Home.jsx`) — PASS (after fixes)

| # | Evidence | Verdict |
|---|----------|---------|
| 1 | Corridor handoff from Routes/ExpresswayCorridors sent `expresswayCode` (`Routes.jsx:371`, `ExpresswayCorridors.jsx:118`) but Home never read it — an "E01 Southern" card landed on a generic pair search with no corridor label. **Fixed**: `Home.jsx:106-126` reads `expresswayCode`, normalizes via `displayCorridorCode` (`E001`→`E01`), sets corridor chip, forces `type: 'EXPRESSWAY'`, dedupes on the corridor key, and carries classic `routeNumber` into a header tag (`Home.jsx:357-359`). | Fixed |
| 2 | Corridor chips ("E01 · Southern", "E03 · Airport") promised expressway trips but searched the pair with no route-type filter (`Home.jsx:140-145`). **Fixed**: `corridorSearch` now sets `expresswayOnly='expressway'` and passes `type: 'EXPRESSWAY'` (docs/ux-research.md R1). | Fixed |
| 3 | Copy contradicted the operator fact ("15+ operators"). **Fixed**: "16 operators" in `HIGHLIGHTS` (`Home.jsx:31`) and hero (`Home.jsx:175`). | Fixed |
| 4 | Trip card hid the bus registration when a rating existed (`Home.jsx:450-456`). **Fixed**: `busReg` always visible; rating is an optional trust signal; unrated shows "Trusted operator". | Fixed |
| 5 | Pre-search footer had no route-catalogue path for users who don't know a route (Journey B AC1). **Fixed**: "Browse the full route catalogue" link added (`Home.jsx:512-519`). | Fixed |
| 6 | Empty/loading/error states, expressway toggle, seat-left urgency coloring, sort control — all intentional and readable. | PASS |
| 7 | **Keep**: `isExpresswayTrip` client-side fallback (belt-and-suspenders when the `type` param is ignored) — protects the expressway-only toggle. | Keep |

### 2. Routes (`Routes.jsx`) — PASS (after fixes)

| # | Evidence | Verdict |
|---|----------|---------|
| 1 | Stats strip said "Operators 15+" (`Routes.jsx:163`). **Fixed**: "16". | Fixed |
| 2 | Route-type filter buttons lacked pressed state for assistive tech. **Fixed**: `aria-pressed` on All/Normal/Expressway (`Routes.jsx:187-211`). | Fixed |
| 3 | The map card hands off correctly to Home (`Routes.jsx:361-376`) — now honored end-to-end. | PASS |
| 4 | **Keep**: corridor explorer is above the catalogue (the map is the first-read for "which corridor goes where"); route cards carry number, E-pill, type, class, endpoints, km/min, boarding-point count. | Keep |
| 5 | Stat "Expressway corridors E01 · E03" is hardcoded and truthful (two corridors only) — fine. `stats.expressway` is computed but unused; harmless, remove opportunistically. | Note |

### 3. Seat Select (`SeatSelect.jsx`) — PASS (after fixes)

| # | Evidence | Verdict |
|---|----------|---------|
| 1 | Legend colors didn't match the actual seat grid (`SeatSelect.jsx:189-190` used `bg-amber-500/40`/`bg-red-500/40`; `BusSeatMap.jsx:46,48` uses `bg-red-500/20`/`bg-amber-500/15`). **Fixed**: legend matches grid. | Fixed |
| 2 | Seat cap "max 6" was unexplained. **Fixed**: title tooltip "You can book up to 6 seats in one transaction". | Fixed |
| 3 | Boarding/dropoff defaulting (first → last point) matches seed data order; `boardingPointId`/`dropoffPointId` numbers round-trip into Payment. | PASS |
| 4 | **Keep**: booking-cancel navigation, seat-grid loading/error states, `maxSelection = min(6, availableSeats)`. | Keep |

### 4. Payment (`Payment.jsx`) — PASS (after fixes)

| # | Evidence | Verdict |
|---|----------|---------|
| 1 | Original flow made passengers click an internal "Create booking" step — Journey A acceptance wanted one pay intent. **Fixed**: merged `payNow()` (`Payment.jsx:99-127`) creates the booking then initiates PayHere; step indicator is Booking → Payment → Confirmation. | Fixed |
| 2 | Dev-copy leaked into the passenger flow: "Demo payment · no real charge" badge, "This is a demo checkout, so no real money moves", "Confirm payment (demo)". **Fixed**: sandbox badge is now gated behind `import.meta.env.DEV` (production build shows nothing); paragraph is neutral ("Complete your payment in the PayHere window…"); button is "I've completed payment" (`Payment.jsx:254-268`). | Fixed |
| 3 | Dead code: `createBooking` no longer called. **Fixed**: removed. | Fixed |
| 4 | `sessionStorage` restore + human stop-name resolution via `pointLabel` from the trip's points array — works because the backend puts the full stop list in both `boardingPoints` and `dropoffPoints`. | PASS |
| 5 | **Keep**: step-1 fallback (`Pay with card`) survives an initiate failure after a successful create — resilient, not cosmetic. | Keep |

### 5. Route Map (`RouteMap.jsx`) — PASS (after fixes)

| # | Evidence | Verdict |
|---|----------|---------|
| 1 | Live overlay drew all 146 routes as identical dashed lines, drowning the corridor map in spaghetti. **Fixed**: only `EXPRESSWAY` routes are overlaid (`RouteMap.jsx:110-118`); classic CTB stays as static highway corridors. | Fixed |
| 2 | **Keep**: DPR-capped canvas-free leaflet, dark CARTO tiles, corridor legend, popup styling. | Keep |

### 6. Hero (`HeroScene3D.jsx`) — PASS

Canvas-2D, DPR cap 2, `prefers-reduced-motion` honored, ResizeObserver cleanup. No generic WebGL gradient; it draws the island's highway/corridor skeleton. No change required.

---

## Critical Issue — Owner Handoff Required (not editable in this review)

**`ExpresswayCorridors.jsx:93-96, 191-204` — two "featured classic" links search non-existent from/to pairs.**

- Route 122: `{ from: 'Ratnapura', to: 'Kataragama' }` — backend route `122/4` is **Pettah → Kataragama** (`DataInitializer.java:992`); no Ratnapura→Kataragama route exists. Clicking → "No trips found for Ratnapura → Kataragama".
- Route 99: `{ from: 'Badulla', to: 'Kataragama' }` — backend route `99` is **Colombo → Badulla** (`DataInitializer.java:512`); the only Badulla pair is `EX 2-13` Badulla → Makumbura. Clicking → dead end.

Both links are real user actions on the Routes page ("Pilgrim & hill classics"). The product fact list says route 99/122 exist — they do — but as *Colombo-origin* routes. Fix: change the link endpoints to real pairs (e.g. route 99 → Colombo→Badulla, route 122 → Pettah→Kataragama), or route the link to the Route Catalogue filtered by number instead of a pair search. Verify by clicking both links and confirming ≥1 trip card renders.

---

## Fixes Applied (this review)

| File | Change | Line |
|------|--------|------|
| `Home.jsx` | Import `displayCorridorCode` | 7 |
| `Home.jsx` | Corridor-aware auto-search from Routes/ExpresswayCorridors handoff (E001→E01, expressway-only, routeNumber carried) | 106-126 |
| `Home.jsx` | Manual search clears route context | 103 |
| `Home.jsx` | Corridor chips filter expressway-only server-side (R1) | 142-150 |
| `Home.jsx` | "16 operators" ×2 (was "15+") | 31, 175 |
| `Home.jsx` | Route tag shown in results header | 357-359 |
| `Home.jsx` | `busReg` always visible + "Trusted operator" for unrated | 450-459 |
| `Home.jsx` | "Browse the full route catalogue" link in pre-search footer | 512-519 |
| `Routes.jsx` | Stat "Operators 16" (was "15+") | 163 |
| `Routes.jsx` | `aria-pressed` on All/Normal/Expressway filters | 187-211 |
| `SeatSelect.jsx` | Legend colors match BusSeatMap (locked/booked opacity) | 189-190 |
| `SeatSelect.jsx` | Seat-cap tooltip explanation | 215 |
| `Payment.jsx` | STEPS renamed Booking → Payment → Confirmation | 8-12 |
| `Payment.jsx` | Removed dead `createBooking` | — |
| `Payment.jsx` | Single-intent `payNow` (create + initiate) | 99-127 |
| `Payment.jsx` | Step-0 button "Pay now · LKR X" | 211-225 |
| `Payment.jsx` | Sandbox badge gated behind `import.meta.env.DEV` | 254-258 |
| `Payment.jsx` | Neutral completion copy + "I've completed payment" button | 263-268 |
| `RouteMap.jsx` | Live overlay restricted to expressway routes | 110-118 |

---

## UI Finish Pass — visual consistency & global-hack removal (2026-08-03)

Second pass over the expressway-remake pages (Home, Routes, ExpresswayCorridors,
OperatorChips, RouteMap, HeroScene3D + `index.css` + this doc).

| File | Change |
|------|--------|
| `index.css` | **Deleted** the global `.text-slate-500 { color: #94a3b8; }` override — `text-slate-500` now renders Tailwind's real `#64748b` (≈4:1, large/decorative only) |
| `Home.jsx` | "Road type" filter wrapped in `role="group"` + `aria-labelledby="road-type-label"` (visible `.label`); `aria-pressed` retained on both buttons; styling/behavior unchanged |
| `Home.jsx` | 7× caption/meta `text-slate-500` → `text-slate-400` (empty states ×2, trip duration/distance, rating/busReg/seats, "per seat", pre-search footer ×2) |
| `Routes.jsx` | "Route type" filter wrapped in `role="group"` + `aria-labelledby="route-type-label"` (`sr-only` label); active segment `text-white` → `text-slate-950` (≈2.6:1 → ≈7.9:1, matches Home + `.btn-primary`) |
| `Routes.jsx` | 4× `text-slate-500` → `text-slate-400` (filtered-results note, empty-state icon tile, empty-state help, km caption) |
| `ExpresswayCorridors.jsx` | "Operators" caption `text-slate-500` → `text-slate-400` (matched "Served towns" + classic-card caption); featured-classic arrow icon `text-slate-500` → `text-slate-400` |
| `OperatorChips.jsx` | "Operators coming soon" + "+N more" `text-slate-500` → `text-slate-400` |
| `RouteMap.jsx` / `HeroScene3D.jsx` | No `text-slate-500` usage — no change |
| `design-system.md` | Documented removed slate-500 override + caption-color rule (`text-slate-400`), and the `role="group"` segmented-control pattern |

Token audit: `stat-tile`, `corridor-card`, `expressway-badge`, `operator-chip`,
`route-pill`, `section-title`, `eyebrow`, `trip-card` all used consistently in
the owned files; `QUICK_ROUTES` labels unchanged (backend seeding pending).
One a11y handoff remains outside this scope: the two "featured classic" links
in `ExpresswayCorridors.jsx` (Route 99/122 endpoints) — see Critical Issue above.

**Other files still using `text-slate-500` for text** (now ≈4:1 after override
removal; owned by the concurrent a11y agent — listed for the merge step, not
edited here): `AiAssistant.jsx:258`, `BusSeatMap.jsx:115,122,126` (+icon `125`),
`AdminComplaints.jsx:75`, `AdminDashboard.jsx:145,177,202`, `AdminOperators.jsx:144`,
`ConductorApp.jsx:274`, `BookingDetail.jsx:122,176,212,216,220`, `Login.jsx:62,66,70,74,78`,
`MyBookings.jsx:85`, `Notifications.jsx:87`, `OperatorDashboard.jsx:97` (icon),
`OperatorReports.jsx:102,104`, `OperatorSchedules.jsx:345`, `Payment.jsx:161,166,187,197,263`,
`SeatSelect.jsx:134,214,221,241`. Merge step should switch text/captions to
`text-slate-400`; icons may stay `text-slate-500`.

## Verification

- `npm.cmd run build -- --outDir dist-verify-ui` in `G:\PEROVIN\vygo\frontend` —
  **PASS** (unique outDir; see UI Finish Pass above), then `dist-verify-ui`
  deleted.
- Live backend smoke test **not run**: no Maven/`mvnw` and no built jar in
  `G:\PEROVIN\vygo\backend`; static handoff pairs were verified against
  `DataInitializer.java` instead.

---

## PASS Criteria (for the next gate)

1. First-read object on Home is the corridor/quick-route grid; primary action is a pre-targeted search — **met**.
2. Every handoff link resolves to a real backend pair: Routes card, E01/E03 corridor cards, A9, and **the two classic featured links (blocked on ExpresswayCorridors.jsx owner)** — **met except blocked item**.
3. No forbidden default remains: no generic hero/dashboard filler, no gratuitous gradients/glass; expressway teal, tile/card/panel radii and `--bg-base #020617` used consistently — **met**.
4. Named states verified: loading, empty, error, expressway-empty, focus rings on interactive elements, reduced-motion — **met** (a11y agent owns final focus/screen-reader audit).
5. Responsive: corridor grid collapses to one column, stat tiles 2-col, trip cards stack with fare right-aligned, map fixed-height with full-width leaflet — **met by inspection at 1440px and 390px breakpoints**; pixel-verify in browser before final ship.
