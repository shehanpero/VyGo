# VyGo — Upgraded Booking Journey: UX Architecture & Design Contract

**Document:** `frontend/docs/seat-3d-flow-architecture.md`
**Author:** ArchitectUX (technical architecture + UX foundation)
**Audience:** 3D & Scene Developer, UI Engineer, RouteTools/Help owners, Finish-Gate Reviewer
**Companion spec:** `frontend/docs/seat-3d-ux-spec.md` (Game Designer — *creative authority* for the 3D scene, camera, seat animation, juice). This document is the *build contract* on top of it: it fixes screen states, focus, HUD hierarchy, accessibility, consistency, and edge cases so the journey can be finished and gated. Where this document and the game spec differ, the game spec wins on visual/animation values; this document wins on states, focus, and contracts that must be *checkable*.
**Version:** 1.0 · **Status:** Build-ready · **Date:** 2026-08-03

---

## 0. Scope & Non-Negotiable Invariants

The upgraded journey is the whole path **Home → search results → trip select → cinematic 3D seat pick → payment → confirmation**, with **route-tools** and **help** as sanctioned detours. The 3D experience replaces the render of `/seat-select` (`frontend/src/pages/SeatSelect.jsx`) — it does **not** change routes in `frontend/src/main.jsx`, the `/pay` contract, or the backend API.

**Invariants (any change that breaks these is a build breaker):**

| # | Invariant | Evidence / how checked |
|---|-----------|------------------------|
| I1 | `/pay` receives the **exact same navigation-state shape** the current `SeatSelect.jsx:81-93` sends: `{ lockToken, trip, lockedSeats, boardingPointId, dropoffPointId, totalFare, seatNumbers, expiresAt }`. | Diff the 3D page's `navigate('/pay', { state })` against the current call. Field names/types identical. |
| I2 | `/pay` fallback restore via `sessionStorage['vygo_payment_ctx']` keeps working (`Payment.jsx:6,37-45`). | Enter `/pay` with no `location.state`; sessionStorage restore still renders the summary. |
| I3 | `POST /bookings/lock-seats` payload stays `{ tripId, seatNumbers, boardingPointId, dropoffPointId }` (numeric ids). | Network tab; backend accepts. |
| I4 | Seat cap = `Math.min(6, trip.availableSeats)`; a 7th seat is denied and never enters state (game spec §5.1). | Try to select 7; HUD total never shows 7. |
| I5 | The 2D fallback (`BusSeatMap.jsx`) remains importable and the 3D page degrades to it when WebGL is unavailable or the FPS tier is too low (game spec §6.2). | Block WebGL in devtools → 2D map renders in a card with the same HUD. |
| I6 | All a11y contracts in §5 hold in **both** the 3D and 2D-fallback paths. | Run the §5 checklist twice. |
| I7 | No source files outside `frontend/docs/` are touched by this contract; the 3D/UI agents implement, the Finish-Gate Reviewer gates. | — |

**Dependencies to add (owned by the 3D agent, per game spec §8):** `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `framer-motion`. `qrcode.react` is already present (used by confirmation).

---

## 1. User Journey Map

8 steps. `[3D]` marks where the new cinematic experience slots in. Every step lists **user can…** (actions) and **exit paths** (never trap the user).

| Step | Screen (route) | What the user does | Exit paths / detours | Notes for the contract |
|------|----------------|--------------------|----------------------|------------------------|
| **1** | Land & search — Home (`/`) | See hero + search card; one-tap corridor chips (E01/E03) and quick routes; type from/to/date, bus type, road-type toggle. | Detour → **Live Routes** (`/route-tools`), **Help** (`/help`), assistant. | Corridor chips pre-target expressway-only search (`Home.jsx:143-152`). |
| **2** | Results — Home (`/`) | Compare `.trip-card`s: times, operator trust signals, seats left, fare; sort by departure/fare; toggle expressway-only. | Detour → route-tools/help via nav or utility cards (`Home.jsx:353-384`); sign in (book gate). | **Contract D2 (§6):** a detour from a results session must not silently destroy the search — persist last search in `sessionStorage['vygo_last_search']` and offer restore on return. |
| **3** | Trip select — tap a result | Choose a trip → `navigate('/seat-select', { state: { trip } })`. Not signed in → `ProtectedRoute` redirects to login. | Back to results (browser back preserves `location.state`). | `Home.jsx:439-444`. Trip object is the single source of route/operator/boarding data. |
| **4** `[3D]` | Cinematic seat pick — `/seat-select` | Watch enter-the-bus intro (≤9 s, skippable), then pick seats in the isometric coach: orbit, hover, select (max 6), change boarding/drop-off points, read live totals. | **Back** to search (nav/back button) at any time; **Skip intro**; change boarding/dropoff point in the HUD. | Full state spec in §2–§3. Focus rules in §4. |
| **5** `[3D]` | Locking + success — `/seat-select` | Press **Book Now** → seats lock (`POST /bookings/lock-seats`) → success chime + confetti overlay → continue to payment (auto or tap). | 409 conflict → snap-back + toast, stays on screen; failure → retry. | `locking`/`success`/`conflict` states (§2). |
| **6** | Payment — `/pay` | Review trip/seat summary; **Pay now** (creates booking + initiates PayHere in one intent, `Payment.jsx:99-127`); open PayHere; confirm. | Lock expiry → error + "reselect seats" link back to `/seat-select` (with trip state). | State shape invariant I1. Payment keeps the step indicator Booking → Payment → Confirmation. |
| **7** | Confirmation — `/bookings/:ref` | See QR e-ticket, booking summary, boarding/drop-off names, download/share affordances. | Back to My Bookings; contact Help. | QR scene lives here (post-payment). If the 3D success overlay previews a QR, §5 C8 applies. |

**Where the 3D experience slots in:** steps 4–5 only. Steps 1–3 and 6–7 keep their current screens; their only changes are additive (restore-last-search, lock-expiry reselect link, shared tokens).

---

## 2. Screen / State Spec — `/seat-select` (3D)

The page is a **finite state machine**. One of six states is active at a time. The state shell is a framer-motion `AnimatePresence` container (DOM overlays/HUD); the 3D scene itself is driven by gsap per the game spec.

### 2.1 State enumeration

| State | Meaning | What renders | Seat grid | HUD | Scene |
|-------|---------|--------------|-----------|-----|-------|
| **loading** | `GET /trips/{id}/seats` in flight | Glass loader card (`role="status"`, "Preparing the coach…"), trip strip, back link | not mounted | not mounted | dark backdrop only |
| **intro** | Cinematic flight B0→B6 (game spec §2.1) | Captions (`aria-live`), **Skip intro** chip, vignette | mounted but `inert` + `aria-hidden` (not focusable) | hidden | camera timeline runs (gsap) |
| **interactive** | Isometric resting frame + HUD | Seat grid interactive, OrbitControls, floating glass HUD (§3), legend, camera controls | focusable, row-major traversal | visible | OrbitControls enabled (game spec §2.2) |
| **locking** | `POST /bookings/lock-seats` in flight | Same as interactive + HUD button "Locking seats…" + `aria-busy` | disabled (pointer-events none; not in tab order) | visible, Book Now disabled | static |
| **success** | Lock accepted | Confetti + chime (game spec §4.3), success overlay ("Seats locked — complete payment to confirm"), auto-navigate to `/pay` after **800 ms** or on tap/Enter | disabled | visible behind overlay | celebratory |
| **error** | Load failure (GET failed) | `role="alert"` card + Retry + Back to search | not mounted | hidden | backdrop |
| **conflict** | 409 at lock OR poll/focus refresh flips a selected seat | Snap-back animation (game spec §4.4), `role="alert"` toast ("Seat 12 was just taken — pick another."), payload swap, HUD total same frame | interactive again after snap-back | visible, total recomputed | camera micro-shake |

### 2.2 Transition table (with framer-motion)

Transitions are **event-driven**; the shell uses `<AnimatePresence mode="wait">` with one `motion.div` per state keyed by state name. Enter: `opacity 0→1, y 12→0, scale .98→1` over **220 ms**, `ease [0.22, 1, 0.36, 1]`. Exit: **≤ 180 ms** fade. Reduced motion: `MotionConfig reducedMotion="user"` + `useReducedMotion()` → all durations collapse to **0 ms** (opacity-only crossfade at 100 ms max). **Never** animate the money total (game spec §3.4: HUD total lerp rate = Infinity/1 frame).

| From | To | Trigger | Transition details |
|------|----|---------|--------------------|
| loading | intro | seat payload resolves | fade loader → fade-in caption "Exploring the coach…" |
| loading | error | GET rejects | alert card fades in |
| intro | interactive | gsap timeline `onComplete` OR skip (click anywhere, any key, Skip chip) | 0.35 s eased blend to resting frame (game spec §2, A1); HUD slides in 220 ms after blend |
| interactive | locking | Book Now with ≥1 seat + valid boarding/dropoff | HUD button → spinner; seats freeze |
| interactive | conflict | 15 s poll / window focus refresh flips a SELECTED seat to BOOKED/LOCKED | snap-back + toast (game spec §4.4) |
| locking | success | 201 from lock-seats | chime + confetti + overlay; auto `/pay` after 800 ms or on activation |
| locking | conflict | 409 | camera shake, snap-back, toast, re-fetch seats |
| locking | error | network / 5xx | toast `role="alert"`, stay in interactive (seats re-enabled) |
| conflict | interactive | payload swapped + snap-back completes | total recomputed in the same React commit |
| error | loading | Retry pressed | re-run GET |
| success | `/pay` | timer or activation | `navigate('/pay', { state: I1-shape })` |

### 2.3 Focus management rules (per state)

These are hard contracts — the Finish-Gate Reviewer checks each (see §5 C2/C8/C9/C10/C11).

| State | Initial focus | During | On exit |
|-------|---------------|--------|---------|
| loading | First focusable (back link or `h1` `tabIndex={-1}`) | Loader is `role="status"` (polite) | — |
| intro | **Skip intro** chip (the only interactive element in tab order) | Seat canvas/buttons are `inert` + `aria-hidden`; captions announce beats via `aria-live="polite"` | — |
| intro → interactive | Move focus to the **first available seat in row-major order** (left block → aisle → right block, driver at front; game spec §5.2). Announce in the summary region: "Seat map ready. You can select up to 6 seats." | Keyboard traversal per game spec §5.2; **focus == HOVER** material (the 3D lift/glow *is* the focus indicator — do not add a second CSS ring on seats; global `:focus-visible` still applies to HUD buttons/selects). | — |
| interactive | Seats + HUD controls all reachable; nothing traps focus; Tab order = HUD (route, selectors, camera, legend) then seat grid then Book Now | `aria-pressed` mirrors SELECTED (2D parity, `BusSeatMap.jsx:56`); tooltip chip announces seat + fare on focus | — |
| locking | Keep focus on Book Now (disabled, shows "Locking seats…") | `aria-busy="true"` on HUD; `role="status"` announces "Locking seats…" | — |
| success | Focus the overlay's "Continue to payment" action (auto-navigate also fires it) | Overlay announces "Seats locked" (polite); Escape → continue immediately | Focus lands on `/pay` `h1` after navigation (Payment page adds `tabIndex={-1}` + focus on mount) |
| error | `role="alert"` region `tabIndex={-1}` receives focus | Retry and Back links reachable | — |
| conflict | `role="alert"` toast `tabIndex={-1}` receives focus, then the first affected seat | Escape closes the toast only; focus returns to grid | Total already correct on the same frame |

**`aria-live` summary region:** one `role="status"` `aria-live="polite"` region, visually the HUD's bottom line (and an `sr-only` twin). It announces, debounced **300 ms**:
- "N seats selected · LKR X total" after any selection change.
- "Maximum 6 seats." on a denied 7th.
- "Seat 12 was just taken — pick another." on a poll/409 flip.
- "Locking seats…" → "Seats locked." during lock/success.
Never announce the same string twice in a row without a change (screen readers re-announce only on change).

---

## 3. Information Architecture — the Floating Booking HUD

A glassmorphism panel floats over the isometric coach: right rail on desktop (fixed, `right-4`, below header, `max-w-sm`), bottom sheet on mobile (§6 small screens). Surface: `bg-slate-950/70 backdrop-blur-xl border border-white/10 rounded-panel shadow-2xl shadow-black/40` — the `/70` opacity guarantees every HUD text token sits on a near-`slate-950` surface so contrast math stays valid (§5 C1).

### 3.1 Priority tiers

**P0 — ALWAYS visible, above the fold, never scrolled away:**
1. **Route strip** — `from → to` (bold, `text-slate-50`), date, corridor/route pill (`route-pill` / `route-pill--expressway`) and `busType` badge.
2. **Times** — `departure → arrival` (`tabular-nums`, `trip-card-time` style), duration.
3. **Selection summary** — "N seats · max M" + **total** `LKR X` (`text-xl font-extrabold text-primary-400`, `tabular-nums`). This is the anchor the user re-checks on every click.
4. **Book Now** — `btn-primary`, full width; label `Book N seats · LKR X`; disabled until ≥1 seat and boarding/dropoff valid.

**P1 — always present, may collapse to compact form on mobile:**
5. **Boarding point selector** — `<label class="label" htmlFor="hud-boarding">` + `.input` select, defaulted to first boarding point (`trip.boardingPoints[0]`). **Changeable at any time in interactive**, and the chosen id is what lock-seats + `/pay` receive (I1).
6. **Drop-off selector** — defaulted to last drop-off point; same rules.
7. **Operator · bus reg · bus type · fare per seat** — one muted line (`text-slate-400`, `operator-chip` if room).
8. **Camera controls** — rotate L/R, reset view, zoom hint. `enablePan = false` (game spec §2.2); buttons are real `<button>`s with `aria-label`s, `disabled` while OrbitControls are mid-drag is not required but focus must not be swallowed by the canvas.

**P2 — scrollable / collapsible (inside the panel on mobile; below the fold on desktop):**
9. **Seat legend** — 4 availability swatches + flavor icons, **semantics identical to the 2D legend** (Available / Selected / Locked / Booked; game spec A18). Swatches must include the non-color indicators (lock glyph, check, pattern) — never swatch-only.
10. **Hold note** — "Seats are held temporarily while you pay — complete payment to confirm." (existing copy, `SeatSelect.jsx:241-244`).
11. **Refresh/status line** — "Seat availability refreshes live." + last-refresh time (polite; also the summary region).

### 3.2 Layout & read order

Desktop: `grid-cols-[1fr_minmax(20rem,24rem)]` — scene left, HUD right; HUD is `position: sticky` so it never scrolls off. Mobile: bottom sheet, compact bar (P0.1–P0.4 only) pinned; tap "Details" to expand P1+P2 inside a `max-h-[60vh] overflow-y-auto` region. **P0 must survive the collapse.**

### 3.3 What must ALWAYS be visible vs scrollable

| Always visible (P0) | Present but collapsible (P1) | Scrollable (P2) |
|---|---|---|
| Route + times + date | Boarding / drop-off selectors | Seat legend |
| Seat count + live total | Operator/bus meta | Hold note |
| Book Now | Camera controls | Refresh/status line |

---

## 4. Consistency Contract — RouteTools / Help / Nav / Hooks

### 4.1 Token & class reuse (RouteToolsPage, HelpPage)

Both public pages **already** use the shared system; the contract is to keep it and audit at gate time (C15):

- Surface: `.card`, `bg-slate-800/50`, borders `border-slate-800`.
- Action: `btn-primary` / `btn-secondary`; focus via the global `:focus-visible` ring + `.focus-ring` on clickable cards.
- Text: headings `text-slate-50`/`text-white`; **captions `text-slate-400` — never `text-slate-500`** (≈4:1 fails AA for small text; `docs/design-system.md` rule). Accent text `text-primary-300/400` or `text-expressway-300/400`.
- Patterns: `eyebrow` + `section-title` heading pairs; `badge`/`route-pill`/`route-pill--expressway`/`operator-chip`; segmented controls as `role="group"` + `aria-labelledby` + `aria-pressed` (`RouteToolsPage.jsx:430-452`); loading `role="status"`, errors `role="alert"` (`RouteToolsPage.jsx:474-481`, `HelpPage.jsx:262-273`); grids with `fade-in`.
- Empty states: card + icon + plain-language copy + one recovery action (`RouteToolsPage.jsx:507-519`, `HelpPage.jsx:275-283`).

### 4.2 Navigation placement

`Layout.jsx:39-44` already renders **Live Routes** and **Help** as the first two nav items for **all** users, before role-specific links. Contract (C16):
- Keep this order: `Live Routes` → `Help` → (guest: `Search`, `Routes`, Sign in) / (passenger: `Search`, `Routes`, `My Bookings`, `Alerts`).
- Both stay public (no auth). Active states via the existing `linkClass` `NavLink` pattern.
- Footer's "Help & Support" link (`Layout.jsx:153-155`) stays; no duplicate Help nav entry elsewhere.
- The Home utility cards (`Home.jsx:353-384`) remain the *discovery* entry points; nav items are the *return* paths.

### 4.3 Shared hooks

- **`useRouteTools({ q, network })`** — `frontend/src/hooks/useRouteTools.js`. Contract: returns `{ routes, loading, error, reload }`; aborts in-flight requests on param change/unmount (`AbortController`), ignores canceled errors, stable `reload` callback. **RouteToolsPage must adopt it** (it currently re-implements the fetch inline at `RouteToolsPage.jsx:331-352`) so one hook is the single source for any new consumer (e.g., Home corridor preview, assistant citations). New optional param: `filter` (`sltb`/`private`) handled client-side stays in the page.
- **New (recommended) `useSeatMap(tripId)`** for the 3D page: returns `{ seats, farePerSeat, capacity, loading, error, refresh }`; polls every **15 s and on window focus only while in `interactive`/`conflict`** (never during intro/locking/success), aborts on unmount, never mutates `selected` — the page reconciles `selected` against the fresh payload (game spec §5.3). If the 3D agent prefers a local hook, the *behavior* contract (poll cadence, abort, reconcile) still binds.
- **`useRouteTools` and `useSeatMap` must not duplicate** axios config; both use `frontend/src/api/client.js` (`api` instance, `errorMessage`).

### 4.4 Payment-context consistency

The 3D page's lock-success → `/pay` handoff must be byte-compatible with I1. Additionally, **Payment must show human stop names** (already via `pointLabel`, `Payment.jsx:17-21`) — the 3D page must pass numeric point ids, not labels, so `/pay` resolves them.

---

## 5. Design Contract Checklist (Finish-Gate)

Every item is **binary pass/fail** with a concrete check. `[game A#]` cross-references the game spec's acceptance list where it also applies.

| # | Criterion | How to check |
|---|-----------|--------------|
| C1 | **Contrast ≥ 4.5:1 for all HUD text** on the glass panel. HUD text uses tokens `text-slate-50 / -200 / -300 / -400` on `bg-slate-950/70`; accents `text-primary-400` / `expressway-400`. No token below AA. | DevTools computed-color check on every HUD element (route strip, totals, selectors, captions, Book Now label). Panel bg must be ≥ `slate-950/70` so the math holds over the scene. |
| C2 | **All controls keyboard-accessible**: seats (row-major arrows, Enter/Space, Home/End — game spec §5.2), Skip intro, HUD selectors, camera buttons, Book Now, legend, retry/back. | Tab through the whole page; operate everything with keys only. |
| C3 | **Intro ≤ 9 s OR skippable** at any point (click, key, Skip chip) with ≤ 0.35 s blend to the resting frame. [game A1] | Time it; press a key at 1 s, 5 s, 8 s — each lands in interactive ≤ 0.35 s after. |
| C4 | **Reduced-motion path**: `prefers-reduced-motion: reduce` → no flight (B1–B5), no bob/pulse/confetti/shake/vibrate, captions + state colors kept, full flow completes ≤ 1 s. [game A15] | Emulate reduce in devtools; complete a selection + lock; capture overlay shows no animation. |
| C5 | **Seat states have distinct non-color indicators**: LOCKED = lock glyph, BOOKED = filled/dark + no-glyph contrast pattern, SELECTED = check + lift, AVAILABLE = seat number, flavors = crown/heart/wheelchair. Color is never the only channel (WCAG 1.4.1). [game §3.2, A5/A18] | Greyscale screenshot of the resting frame: states still distinguishable. |
| C6 | **Total updates ≤ 1 frame after click**: same React commit as the selection state; no tween, no delayed total. [game A9] | Selection change + total rendered in the same paint (React profiler / visual test). |
| C7 | **Error states use `role="alert"`**: load failure, 409 conflict, lock network/5xx. | Inspect DOM for `role="alert"` on each; SR announces. |
| C8 | **Success + QR reachable from keyboard**: success overlay action focusable (auto-navigate also triggerable by Enter); any QR render (post-payment confirmation, or an in-overlay preview) has an accessible name and a text fallback (booking ref + seats), `qrcode.react`. | Tab to the QR/action; SR reads booking ref; `aria-label` present. |
| C9 | **Focus never trapped**: Escape closes the success overlay (→ continue) and any toast; Tab never lands on an inert element; no dead-end focus. | Full keyboard sweep; watch for focus loss to `body`. |
| C10 | **Focus moves to the first available seat after intro/skip**; to the toast after a conflict; to `/pay` `h1` after navigation. | SR or devtools `document.activeElement` at each transition. |
| C11 | **`aria-live` summary region** announces selection/cap/conflict/lock (debounced 300 ms; polite). | Trigger each; SR announces. |
| C12 | **HUD hierarchy matches §3**: P0 always visible (including on mobile collapsed bar); P1 present; P2 scrollable; Book Now disabled until valid. | Resize to 390 px; inspect P0 bar; collapse/expand P1+P2. |
| C13 | **Boarding/drop-off changeable on seat-select AND carried to `/pay`** (numeric ids → human names via `pointLabel`). | Change both, lock, land on `/pay`; names render; no raw ids. |
| C14 | **`/pay` state shape invariant (I1)** + `sessionStorage` restore. | See I1/I2 checks. |
| C15 | **RouteTools/Help reuse tokens**: no new raw colors in page JSX; captions `text-slate-400`; `role="status"`/`role="alert"`; `eyebrow`+`section-title`; `role="group"` segmented filters. | Grep pages for `text-slate-500` and hex literals; a11y tree check. |
| C16 | **Nav order** = Live Routes, Help, then role links; public; `linkClass` active states; no duplicates. | Visual + DOM order on `/`, `/route-tools`, `/help` at guest and passenger roles. |
| C17 | **`useRouteTools` adopted by RouteToolsPage**; abort on unmount/param change; `{ routes, loading, error, reload }`. | RouteToolsPage imports the hook; request cancellation on fast filter flips (network tab). |
| C18 | **WebGL/FPS fallback to 2D `BusSeatMap`** with the same HUD + same a11y. [game §6.2 low-tier] | Block WebGL; page renders 2D map, all C1–C13 still pass. |
| C19 | **Poll 15 s + window focus refresh, interactive only**; 409 triggers immediate re-fetch. [game A19] | Network tab cadence; tab-switch refresh. |
| C20 | **409 snap-back**: affected seats revert (scale/lift/color, 300 ms, back-out overshoot), HUD total drops same frame, toast `role="alert"`. [game A12] | Induce 409 (two sessions); observe seats + total + toast in one pass. |
| C21 | **Seat map empty**: shell bus + overlay "No seat map available for this trip." (`role="status"`), Book Now disabled, Back link. | Stub empty payload. |
| C22 | **Long lists don't break layout**: operator/phone pairs and timetable truncate (`truncate`, `min-w-0`), `tel:` links sanitized, HelpPage directory stays tidy at 100+ operators. | Seed long data; check overflow at 390 px and 1440 px. |
| C23 | **Timetable empty/loading/error states** on RouteTools: existing copy "No online-booking timetable yet — contact the operator." + `role="status"`/`role="alert"` (already at `RouteToolsPage.jsx:234-252`). | Stub empty/error timetable. |
| C24 | **Focus == HOVER on seats, no double ring**: focused seat shows the 3D HOVER material (scale/lift/glow) as its focus indicator; CSS outline suppressed for seat buttons only (HUD keeps the global ring). | Keyboard through seats; no outline AND no missing indicator; HUD buttons keep rings. |
| C25 | **Frame-rate independence** for all 3D motion: `1 - exp(-rate·dt)`, dt clamped ≤ 0.05 s, no per-frame allocations, DPR ≤ 2. [game A17] | Code review + 30 fps throttle playback — timing matches 144 Hz. |

---

## 6. Edge Cases

| # | Edge case | Handling contract |
|---|-----------|-------------------|
| E1 | **Trip missing** (`location.state?.trip` null — deep link/refresh into `/seat-select`) | Render the existing "No trip selected" card (`SeatSelect.jsx:45-54`) with `btn-primary` Back to search; do **not** auto-redirect; no crash. Also clear any stale `vygo_payment_ctx` if the user abandoned checkout. |
| E2 | **Stale lock** (`expiresAt` passed to `/pay`; user pays too late) | `/pay` shows expiry as a human time chip; on `POST /bookings` 409/422 → `role="alert"` "Your seat hold expired — reselect." + link back to `/seat-select` carrying `{ trip }` state so the user doesn't re-search. |
| E3 | **409 during selection** (poll/focus flip of a SELECTED seat) | Game spec §4.4 snap-back + §5.3 reconcile; `selected` never contains a non-SELECTED seat; total same frame (C6/C20). Hover-then-race click ignored with 1-pulse shake (game A13). |
| E4 | **Seat map empty** | C21 shell + overlay; user can Back to search. |
| E5 | **Reduced motion** | C4; function identical, only motion removed; Skip still available. |
| E6 | **Small screens** (≤ 640 px) | Bottom-sheet HUD: P0 compact bar (route, count, total, Book Now) pinned; expand for P1/P2 inside `max-h-[60vh] overflow-y-auto`; scene fills the space above; camera controls inside the sheet; nothing permanently covers the front rows. Landscape phones: sheet max-height 45vh. |
| E7 | **Long operator/phone lists** | RouteTools pairs already zip+truncate (`RouteToolCard`, `RouteToolsPage.jsx:73-82`); HelpPage directory grid with `truncate` titles; C22. |
| E8 | **Timetable empty / no online booking** | C23; the "Timetable" button is `disabled` when `!route.hasBookableTrips` with visible "No online booking" badge (`RouteToolsPage.jsx:121-128`). |
| E9 | **Detour loses search results** | `sessionStorage['vygo_last_search']` on Home search; on returning to `/` from `/route-tools`/`/help`, Home offers "Restore last search" (chip) — contract C0/D2. Doesn't auto-run, avoids surprise. |
| E10 | **farePerSeat differs from trip.fare** | HUD total and `/pay` use `seatsData?.farePerSeat ?? trip.fare` (existing `SeatSelect.jsx:140`); HUD reads fare from the seat payload when present. |
| E11 | **maxSelection < 6** (`trip.availableSeats` low) | Cap = `Math.min(6, availableSeats)`; HUD shows "max M"; 7th denial uses M. |
| E12 | **Not signed in** | `ProtectedRoute` (PASSENGER) already gates `/seat-select` + `/pay` (`main.jsx:61-76`); no change; Home shows "Sign in to book" on trip cards. |
| E13 | **Tab hidden mid-intro** | Pause the gsap timeline; on return resume — never jump-snap (game spec §6.2). |
| E14 | **WebGL unavailable / very low FPS tier** | C18 fallback to 2D `BusSeatMap` in a card + HUD; all a11y holds. |
| E15 | **Rapid double-click on seats / Book Now** | While `locking`, seat clicks and Book Now are inert (`pointer-events-none`, `disabled`); the lock POST is fire-once. |

---

## 7. Implementation Order (for the 3D/UI agents)

1. **State shell + focus** — framer-motion `AnimatePresence` six-state machine, focus rules (§2.3), summary region (§2.3). This is the spine everything else hangs on; gate C2/C9/C10/C11 here.
2. **HUD** — P0→P1→P2 panel (§3), contrast-safe glass, responsive sheet (§6 E6); C1/C12/C13.
3. **Intro + scene** — game spec §2 camera timeline, seat state machine §3, juice §4; C3/C5/C20/C25.
4. **Lock flow** — lock-seats call, success/conflict (C6/C7/C8/C14).
5. **Consistency pass** — adopt `useRouteTools` in RouteToolsPage, nav/token audit (C15–C17), last-search restore (E9).
6. **Edge-case sweep** — E1–E15 stubs.

---

*End of contract v1.0 — the Finish-Gate Reviewer runs §5 against the build; every row is binary.*
