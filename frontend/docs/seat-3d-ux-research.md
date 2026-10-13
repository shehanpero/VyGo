# VyGo — 3D Seat Booking, Route Tools & Help: UX Research & Validation Plan

**Document:** `frontend/docs/seat-3d-ux-research.md`
**Author:** UX Researcher
**Audience:** 3D & Scene Developer, UI Engineer, RouteTools/Help owners, Finish-Gate Reviewer, Product
**Date:** 2026-08-03 · **Version:** 1.0 · **Status:** Research + validation plan (pre-gate)

---

## 0. Scope, method, and evidence base

This document validates the upgraded journey described in `seat-3d-flow-architecture.md` (build contract) and
`seat-3d-ux-spec.md` (game spec) against the **users** the product actually serves in Sri Lanka, and against the
**code that exists today**. It is research-only: no source files are changed by this document.

**Method used so far (desk research + audit):**
1. **Design audit** of the current build — `SeatSelect3D.jsx`, `Seat3D.jsx`, `BusInterior3D.jsx`,
   `BoardingSequence.jsx`, `SeatHud.jsx`, `SuccessScene.jsx`, `Sound.js`, `seatMeta.js` (3D flow);
   `SeatSelect.jsx` + `BusSeatMap.jsx` (2D baseline); `RouteToolsPage.jsx`, `HelpPage.jsx` (public directory + help);
   `Payment.jsx`, `Home.jsx`, `Layout.jsx`, `main.jsx` (flow glue).
2. **Heuristic walkthrough** against the two specs' acceptance lists (A1–A20, C1–C25).
3. **Proto-personas** grounded in Sri Lankan transport context (to be validated in the test plan in §4).
4. **Task analysis** of the four highest-value journeys (§2).
5. **Risk register** with code evidence and mitigations (§3).
6. **Test plan** to validate findings before ship (§4) and an **a11y checklist** for the gate (§5).

**Key evidence the research is built on (what the code actually does vs. what the specs promise):**

| Contract item | Spec says | Build does today (audit date) |
|---|---|---|
| Intro length (A1/C3) | ≤ 9 s, skippable by click/key/chip | `BoardingSequence.jsx:61-86` timeline ≈ **10.1 s**; only the Skip chip skips (`:32-34`), chip hidden under reduced motion; no click-anywhere/key skip |
| WebGL/low-FPS fallback (I5/C18) | Fall back to 2D `BusSeatMap` | **No WebGL detection, no FPS tier, no fallback** in `SeatSelect3D.jsx` — `Canvas` always renders (`:342`) |
| Seat states non-color cues (A5/A18/C5) | Lock glyph, check, pattern; 4-state legend | `Seat3D.jsx` colors only; `SeatHud.jsx:11-19` legend is **7 color-only swatches** (Available/Selected/VIP/Ladies/Accessible/Locked/Booked) |
| Keyboard seats (A11/C2/C24) | Row-major Tab traversal, focus == hover, `aria-pressed` | Seats are **not focusable DOM elements**; one `tabIndex={0}` container handles arrows (`SeatSelect3D.jsx:334-341`); `focused` only shows an `Html` number label, no lift/glow (`Seat3D.jsx:119-125`) |
| Glass contrast (C1) | Panel bg ≥ `slate-950/70` | `rgba(15,23,42,0.55)` in `SeatSelect3D.jsx:44` and `SeatHud.jsx:6` |
| 409 snap-back (A12/C20) | Per-seat snap-back, toast "Seat 12 was just taken", total same frame | `SeatSelect3D.jsx:237-245` clears **all** selection (`setSelected([])`), generic toast, no snap-back animation |
| Polling (A19/C19) | 15 s + window-focus refresh, interactive only | **Not implemented** — only a refetch after 409 |
| Locking inertia (E15) | Seat clicks inert while `locking` | Seats remain clickable during `locking` (`Seat3D.jsx` has no disabled path) |
| Success overlay (C8/C9/C10) | Focus moves into dialog, auto-nav ~800 ms, Escape continues | `SuccessScene.jsx` is `role="dialog"` but **never receives focus, no focus trap, no Escape, no auto-nav**; confetti canvas runs regardless of `prefers-reduced-motion` (`SuccessScene.jsx:69-75`) |
| Seat affordance (A6/A7) | Hover lift +0.12 m, select lift +0.22 m, scale 1.08, tooltip chip | Hover scale 1.03, select lift 0.12, no bob, no tooltip chip, no glow sprite |
| Mobile HUD (E6) | P0 pinned compact bar, P1/P2 expandable | Single scrollable bottom sheet covers the scene (`SeatHud.jsx:59-63`); camera buttons are 36×36 px |
| `useRouteTools` adoption (C17) | RouteToolsPage uses the hook | Still inline fetch (`RouteToolsPage.jsx:331-352`) |
| Restore last search on detour (E9/D2) | `sessionStorage['vygo_last_search']` + restore chip | Not implemented in `Home.jsx` |
| Lock-expiry reselect from /pay (E2) | Expiry chip + reselect link carrying `{ trip }` | `Payment.jsx:99-131` shows a generic error on 409/422; no reselect link |

These gaps are the empirical spine of §2–§5. The test plan (§4) is designed to prove whether the gaps matter to the
three personas, and the prioritization matrix decides what must be fixed before ship.

---

## 1. Personas

### P1 — Kumari Perera, 34 — "The price-sensitive commuter" (Sri Lankan commuter)

*Colombo–Kandy corridor; shop assistant; travels 2–3×/month to visit family. Books on her phone while standing at the
bus stand or on the 142. Primary device: low-end Android.*

**Goals**
- Find the **cheapest** fare for the date she needs; compare normal vs. expressway without opening every card.
- Book 2 seats (herself + child) quickly, with **no hidden fees** — the HUD total must equal what her card is charged.
- Know the bus is **real** (operator, reg, route number) before paying; avoid scams.
- Pay with a method she already has; get a ticket she can show the conductor **offline** (QR screenshot).

**Frustrations**
- Slow 2G/3G + data prices: heavy pages, autoplaying animations, and large payloads cost her money and patience.
- English-only UI; she reads Sinhala more comfortably. Stop names in English (Makumbura, Katunayake) are unfamiliar.
- Seats she picks "disappear" at checkout (409) and she has to start over — on a slow connection this can end the booking.
- Long enter-the-bus animations on a 2 GB RAM phone feel like the app is "loading" again, not like a feature.
- Being forced to create an account on a hot day with low battery.

**Device constraints**
- 2–3 GB RAM budget Android (e.g., Samsung Galaxy A-series / M-series class), 720p, Mali/Adreno-class GPU, 4G (often
  3G/2G in her area), Chrome, limited storage, battery-conscious. WebGL may be absent, crashy, or < 45 fps.
- Thumb-operated, often one-handed, often outdoors in daylight (glare).

**3 acceptance criteria she judges the new experience by**
1. **AC1 – Speed-to-value:** She can book 2 seats end-to-end in < 4 minutes on her device with 2G throttling, and the
   intro either plays ≤ 9 s or is skipped **in one tap that responds instantly** (no re-loading).
2. **AC2 – Price honesty:** The total on the HUD at seat-select is byte-identical to the charge at `/pay` and the
   confirmation; she never sees a different number.
3. **AC3 – Recovery without rework:** When a seat is taken, only the lost seat changes; the rest of her selection and
   her boarding/drop-off choices survive, and she completes the booking on the next attempt.

---

### P2 — Ravi Fernando, 41 — "The expressway business traveler"

*Procurement manager; weekly Colombo–Galle and Colombo–Kandy on E01/E03; books luxury/AC buses, sometimes for himself
+ a colleague. Device: mid-range Android (Redmi/Moto class) or iPhone SE, always signed in.*

**Goals**
- **Expressway + AC/luxury only** — filter noise out; know the exact departure and duration.
- See the **operator's phone number and timetable** before booking (delays, luggage, on-the-day changes are handled
  off-app by phone in his world).
- Book a specific seat (window, front) in the fewest interactions; he is time-poor and often booking from a taxi.
- Save/recall his booking details quickly; expense-friendly (clear fare breakdown).

**Frustrations**
- Expressway results mixed with normal routes; corridor chips not enough.
- Dead or unlabelled phone numbers in directories — he won't call a number he can't trust.
- The 3D coach reveal, on the 5th booking this month, is just friction between him and a window seat.
- Timetable "no online booking" dead-ends; he still needs a time to plan his day.
- If a lock expires or a seat 409s, losing his selection costs him a meeting.

**Device constraints**
- Mid-range Android 4G (fine for WebGL most of the time, but can dip below 45 fps with bloom + postprocessing), or
  iPhone SE class; often used one-handed in a vehicle; occasionally poor signal at bus stands (roaming onto 3G).

**3 acceptance criteria he judges the new experience by**
1. **AC1 – Directory that saves a call:** He finds the E01 Colombo→Galle luxury service **and** a trusted operator
   phone (source/verified label) in < 90 s on `/route-tools`, and taps-to-call from the same screen.
2. **AC2 – No slower than 2D:** The 3D flow must not cost him more time than the old flat map — target booking a
   window seat (select → verify total → Book Now) in < 2.5 min including a skipped intro; if the intro makes it
   slower, it must measurably improve trust instead.
3. **AC3 – One-tap recovery:** A 409 or expired lock returns him to seat-select with his trip and remaining
   selection intact — never back to the search form.

---

### P3 — Amara Thomas, 61 — "The overseas visitor" (tourist with accessibility needs)

*Visiting family in Colombo, touring Kandy/Galle; retired teacher from the UK; travels with her husband; wants
clear, honest help and accessible travel. Device: iPhone 12, Safari, roaming data; uses Screen Magnifier and
sometimes VoiceOver; prefers-reduced-motion is ON.*

**Goals**
- **Discover routes** she can understand without knowing Sri Lankan geography: "Colombo → Kandy — how long, how much,
  expressway or normal, can we book online or must we call?"
- Find **accessible seating / assistance** before departure and the right person to call.
- Understand refunds and what to do if the operator cancels — clear, human language.
- Avoid being scammed: know which phone numbers are official operator lines vs. third parties.

**Frustrations**
- English copy is fine, but local stop names and route numbering (E01 vs. 138 vs. SLTB) are a foreign system.
- Roaming data caps: the 3D scene and route map are data-costly; she wants text answers.
- The Help pledge ("keyboard-navigable seat map", "screen-reader friendly", "reduced-motion support",
  `HelpPage.jsx:133-154`) raises expectations — if the 3D flow breaks them, she loses trust in the whole app.
- Motion-heavy interfaces make her nauseous; reduced-motion must actually reduce motion (confetti included).
- Operator directories with no search: scanning 100+ cards to find the Kandy operator is not viable.

**Device constraints**
- Modern iPhone (WebGL fine) but with **reduced-motion on**, possibly VoiceOver, possibly 2× zoom; roaming 4G with a
  data budget; prefers text/voice answers over 3D spectacle.

**3 acceptance criteria she judges the new experience by**
1. **AC1 – Route comprehension:** In < 5 min on `/route-tools` she can answer "how do I get Colombo→Kandy, how long,
   what type of bus, and can I book online or call?" using the map/list, timetable, and help FAQ — without assistance.
2. **AC2 – Accessible booking:** With reduced-motion ON (and keyboard or VoiceOver where relevant), she can pick an
   accessible seat, reach payment, and identify whom to call for assistance — and no animation plays that she didn't
   trigger (no confetti, no shake, no auto-rotate).
3. **AC3 – Trusted human contact:** She can find the refund policy, a verified operator phone (or a "not yet
   verified" label), and the VyGo support line in < 3 min, and can tell the difference between the two.

**Research note:** P1–P3 are proto-personas. §4 recruits one participant per persona (plus a repeat-user and an
a11y-heavy participant) to validate them before the gate.

---

## 2. Task analysis

Four key tasks. Each lists **steps** (against the actual build), **failure points** (with code evidence), and a
**cinematic-intro verdict** (help / hurt / n/a).

### Task 1 — "Find an expressway bus + operator phone via Live Routes" (route-tools)

**Trigger:** P2 needs a Colombo→Galle expressway service and the operator's number to call about a delay. Entry via
Home utility card (`Home.jsx:353-368`) or nav "Live Routes" (`Layout.jsx:39-41`).

**Steps (current build):**
1. Land on `/route-tools`; page header explains expressway corridors E01–E03 (`RouteToolsPage.jsx:380-384`).
2. Choose search "Kandy/E01/SLTB" in the debounced search box (`:419-428`, 300 ms debounce → URL param) and/or tap
   the segmented filter All / Expressway / Normal / SLTB / Private (`:430-452`).
3. Scan cards: corridor name, network badge, from→to, duration, **Operators & contacts** with `tel:` links
   (`:154-180`), route numbers, stats, notes.
4. If the route has no bookable trips, "No online booking" badge shows and Timetable is disabled (`:121-128`); else
   tap Timetable → lazy fetch `/route-tools/{id}/timetable` (`:88-105`).
5. Tap the phone → native dialer.

**Failure points:**
- **Vocabulary mismatch:** search matches backend route text exactly; "Kandy" may not match "Katugastota" or
  "Makumbura" stops, producing the empty state (`:507-519`) with no suggestion. P1 (Sinhala-first) and P3 (tourist)
  are both at risk.
- **Filter confusion:** Expressway/Normal map to a server `network` param, but SLTB/Private are client-side
  (`:354-358`) — the result count can change without a network request, which feels broken on slow networks.
- **2G weight:** the full route list + lazy map + per-card timetable are separate fetches with no caching; a 2G user
  waits on skeleton cards and a map that may never render ("Route map coming soon", `:47-56`).
- **Trust of phone numbers:** `route.operators`/`route.phones` are displayed with no "verified / last updated" label
  (`:73-82,164-170`). P2 and P3 won't call a number they can't attribute; P1 fears scams.
- **Detour destroys context:** returning to Home does not restore the previous search (no `vygo_last_search` in
  `Home.jsx`), so a book-then-check-phone-then-book-again loop re-does the search.
- Timetable empty state is good ("No online-booking timetable yet — contact the operator.", `:249-252`), but it asks
  the user to *leave* the app to get times.

**Cinematic intro verdict: N/A** (not part of this screen) — but note the *chaining* effect: after this detour the
user returns to Home, re-searches, and lands in the 3D intro. If the intro is long, the detour + intro combo makes
the whole loop feel heavy.

**Success metric (for §4):** correct EXPRESSWAY card + reachable `tel:` number in < 3 min, zero moderator assists.

---

### Task 2 — "Book 2 seats on a luxury bus via the 3D flow"

**Trigger:** P2 taps a LUXURY trip card → `/seat-select` (`Home.jsx:440-444`; protected → sign-in gate if guest).

**Steps (current build):**
1. Trip arrives via `location.state.trip` (`SeatSelect3D.jsx:53`); `GET /trips/{id}/seats` loads (`:103-120`).
2. Unless `prefers-reduced-motion`, the ~10 s enter-the-bus flight plays; `BoardingSequence` overlay shows captions +
   Skip chip (`:415-417`, `BoardingSequence.jsx:13-40`).
3. Interactive: isometric coach + floating HUD; boarding defaults to first point, drop-off to last (`:124-125`).
4. Hover/click seat → `Seat3D` lift+glow (`Seat3D.jsx:44-46,93-96`), select blip (`Sound.js:31-33`), HUD total
   updates same frame (`SeatHud.jsx:56-57`). Repeat for seat 2.
5. Adjust boarding/drop-off if needed; verify total.
6. Book Now → `locking` → `POST /bookings/lock-seats` (`:207-252`); success → chime + confetti + QR overlay
   (`SuccessScene.jsx`).
7. Continue to Payment → `/pay` with the I1 state shape (`:254-268`).

**Failure points:**
- **Intro over the 9 s cap** (≈10.1 s, `BoardingSequence.jsx:61-86`) and **only the chip skips** — no key, no
  click-anywhere (`:31-34`); chip is hidden under reduced motion (correct, since no intro, but it also hides the
  *affordance* that the flight can be skipped). Repeat users (P1, P2) pay 10 s per booking.
- **No WebGL/low-FPS fallback** (`SeatSelect3D.jsx:342`): on a low-end Android, the scene can black-screen or crash —
  no 2D `BusSeatMap` rescue (contract I5/C18).
- **Affordance gaps:** seats show color-only states; locked/booked differ only in orange vs. red hue (`Seat3D.jsx:30-31`);
  VIP/Ladies/Accessible are tint-only with **no icons** (`seatMeta.js:62-69`); no lock glyph; no price tooltip on
  hover. P2 (window seat) and P3 (accessible seat) cannot reliably identify their target seat.
- **Mobile obscuration:** the bottom-sheet HUD (`SeatHud.jsx:59-63`) covers the front rows on a 390 px screen; the
  3D seats are small thumb targets; camera buttons are 36×36 px (< 44 px touch guideline).
- **Stale seats:** no 15 s / window-focus polling (A19/C19), so availability rots between page load and Book Now,
  inflating the 409 rate (task 3).
- **Seats still clickable during `locking`** (E15): selection can change after the lock POST fires; the success
  overlay payload uses the live `selected` (`SeatSelect3D.jsx:230,264`) which can disagree with `lockedSeats` —
  a real data-integrity trap.
- **Success overlay is not announced/focused:** `role="dialog"` never receives focus, no Escape, no focus trap
  (`SuccessScene.jsx:88-95`); the 800 ms auto-nav is absent, so a user who doesn't notice the overlay waits — and a
  screen-reader user may never hear "Seats locked" (contract C8/C10).
- **Contrast risk:** glass at 0.55 opacity (`SeatHud.jsx:6`) over a bright scene (selected-green glow, confetti) can
  drop HUD text below 4.5:1 (C1) — worst outdoors in daylight (P1).

**Cinematic intro verdict — helps:** first-time luxury/expressway booking. The aisle walk gives spatial orientation
("front is over there, my seat is near the window at the front") that the flat 2D map does not; it also sells the
premium positioning P2 is paying for and builds P3's confidence that the bus is a real, modern coach.
**Hurts:** repeat transactions (P1, P2), slow devices, and any user whose intent is "just book it". The 10.1 s length
plus chip-only skip converts a value moment into a delay.

**Success metric:** exactly 2 seats selected, HUD total correct, reaches `/pay` with both seats + correct total in
< 4 min (commuter) / < 2.5 min (business traveler), 0 wrong-seat picks on a ≥ 44 px target.

---

### Task 3 — "Recover from seats-taken (409) at checkout"

**Trigger:** another session locks a seat between page load and Book Now (or the lock POST races), so
`POST /bookings/lock-seats` returns 409.

**Steps (current build):**
1. Book Now → 409 → generic toast "Those seats were just taken. Please pick again." (`role="alert"`,
   `SeatSelect3D.jsx:448-452`).
2. **All** selected seats are cleared — `setSelected([])` (`:239`).
3. Seats refetched (`:240-245`).
4. User re-picks from scratch, re-verifies boarding/drop-off, taps Book Now again.
5. If instead the 409/422 lands at `/pay` (lock expired between pages): `Payment.jsx:126-130` shows a generic
   "Payment could not be started" — no expiry chip, no "reselect" deep link carrying `{ trip }` (contract E2).

**Failure points:**
- **Punitive clearing:** the spec (A12/C20) wants a per-seat snap-back with the *surviving* seat still selected; the
  build nukes the whole selection. P1 loses her child's seat selection too; P2 re-picks a window seat twice.
- **Toast findability:** the toast floats at `top-4` (`:448-452`) and can be covered by the bottom-sheet HUD on
  mobile; it's `role="alert"` (good) but focus never moves to it (C7 partial) — keyboard/SR users may not hear it.
- **No shake/flash/snap-back** (A12) means the *visual* cause of the failure is invisible — the seat just "unselects".
- **At /pay there is no escape hatch back to seat-select** (E2) — the user falls back to re-search (worse for P2's
  meeting, P1's data budget).
- **Race amplification:** with no polling (A19), the *first* Book Now is more likely to hit a stale seat; a second
  409 after re-pick is a worst-case churn for P1.

**Cinematic intro verdict — helps:** nothing here; the intro does not replay after a 409 (mode stays `ready`), which
is correct. **Hurts** indirectly: if the user refresh/loses trip state, they re-enter via search → the ~10 s intro
plays again on top of an already-frustrating recovery.

**Success metric:** after an induced 409, the user notices the toast, loses **only the affected seat**, and completes
the lock within 90 s and within 2 attempts.

---

### Task 4 — "Get help about a refund"

**Trigger:** P3 cancels (or a trip is cancelled) and wants to know when money comes back and who to contact. Entry via
nav "Help" (`Layout.jsx:42-44`), footer link (`:153-155`), or the assistant.

**Steps (current build):**
1. Open `/help`; six topic cards (`HelpPage.jsx:26-131`), including Cancellations & Refunds and Accessibility.
2. Expand "Cancellations & Refunds" (`<details>/<summary>`, `:158-187`): cancel from My Bookings; refunds 3–5 business
   days; operator-cancelled → full refund or free rebooking (`:52-64`).
3. If trip-specific (delayed bus, lost item): operator directory section (`:246-311`) — sorted alphabetically,
   registration number + tap-to-call (`:298-307`).
4. Else support channels: call `+94 11 2 340 340`, email `support@vygo.lk`, working hours 8 AM–8 PM SLT (`:313-356`);
   escalation path if operator unresponsive (`:357-382`).
5. Accessibility pledge section (`:385-409`) promises keyboard-navigable seats, reduced-motion, SR-friendly, visible
   focus — the standard the 3D flow must meet.

**Failure points:**
- **Static FAQ ≠ user's live state:** a user mid-refund gets no link from the FAQ to "My Bookings → cancel" nor a way
  to check a specific booking; they must know to open another nav item.
- **Operator directory has no search/filter** — with 100+ operators (C22), P3's "which operator runs Colombo→Kandy?"
  is a browse task, not a find task.
- **Help promises what the 3D flow currently breaks:** the pledge cards (`HelpPage.jsx:133-154`) contradict the audit
  findings (no keyboard seat access, color-only states, confetti under reduced motion). A user who reads the pledge
  and then hits the 3D flow gets a trust break.
- **Language:** English-only; P1's Sinhala-first context is unserved by help.
- **Refund vs. hold-expiry confusion:** the FAQ covers cancellations/refunds but not the "seat hold expired" case
  (E2) — a user whose lock lapsed at `/pay` won't map that error to the refunds topic.
- No verification label on operator phones (same trust issue as Task 1).

**Cinematic intro verdict: N/A** — but the Help page's accessibility pledge is the *contract* that the 3D flow must
honor; treat the pledge text as acceptance criteria in §4–§5.

**Success metric:** finds refund timing + at least one human channel in < 3 min; can distinguish "operator line" from
"VyGo support" (verify both labels).

---

## 3. Risks & mitigations

Severity (S) and likelihood (L): 1–5 (5 = worst/most likely). Risk score = S × L. "Verify" names the gate check or
test task. Evidence is from the audit table in §0.

| # | Risk | Evidence (code) | L | S | Score | Mitigation | Verify |
|---|------|-----------------|---|---|-------|------------|--------|
| **R1** | **3D intro too long for repeat users; chip-only skip** | ≈10.1 s timeline; skip only via chip; chip hidden in reduced-motion (`BoardingSequence.jsx:61-86,31-34`) | 4 | 4 | 16 | Cap at ≤ 9 s (target 6–7 s); **any click/key/skip chip** exits ≤ 0.35 s (C3/A1); auto-skip after 2nd viewing in a session; respect reduced-motion → skip flight entirely (already OK). Measure intro-skip rate + perceived length in test | C3, A1; Test T2 metric "intro-skip rate" |
| **R2** | **WebGL failure / low FPS on budget Android → blank scene, no 2D rescue** | No WebGL detection or FPS tier; `Canvas` always mounts; Bloom always on; DPR up to 1.75 (`SeatSelect3D.jsx:342-388`) | 4 | 5 | 20 | Detect `WebGLRenderingContext` at mount; sample first 30 frames; on fail/< 45 fps render `BusSeatMap` in a card with the **same HUD + same a11y** (C18); reduce postprocessing on LOW tier (drop DoF already mobile-gated; gate Bloom too) | C18/I5; Test T2 on P1 device; devtools "block WebGL" |
| **R3** | **Color-only seat states exclude color-blind and low-vision users; 3D legend drifts from 2D semantics** | `Seat3D.jsx` colors only; no lock glyph/check/pattern; `SeatHud.jsx:11-19` 7 color-only swatches incl. VIP/Ladies/Accessible vs. 2D's 4 states | 4 | 4 | 16 | Add non-color cues: lock glyph on LOCKED, filled/dark + pattern on BOOKED, check + lift on SELECTED; legend = the 2D four (Available/Selected/Locked/Booked) with swatch **+ text + icon**; keep flavor icons (crown/heart/wheelchair) on seats (A5/A18) | C5/A18; greyscale + deuteranopia screenshot (checklist #6) |
| **R4** | **Motion sickness / vestibular discomfort (aisle bob, auto-rotate, 10 s flight)** | Bob `y+=0.035·sin(...)` + roll in spec B5 (game `seat-3d-ux-spec.md:58`); autoRotate 0.25 rpm idle (spec §2.2); build keeps bob/roll in `BoardingSequence.jsx:69-86`; confetti/shake un-gated | 3 | 4 | 12 | Keep damping (`dampingFactor 0.08`); **no auto-rotate after first input**; honor reduced-motion: no flight, no bob, no confetti, no shake, no `vibrate()` (C4/A15); add a static "view coach" still-frame option for low-motion users | C4/A15; Test T5 reduced-motion; motion-sickness debrief in §4 |
| **R5** | **Keyboard + screen-reader users cannot operate the seat grid (WebGL canvas = a11y black hole)** | Seats are not focusable; one `tabIndex={0}` container with arrow-key handler (`SeatSelect3D.jsx:334-341,193-205`); no `aria-pressed`; `focused` ≠ hover visuals (`Seat3D.jsx:119-125`); SR sees `role="group"` container only | 4 | 5 | 20 | Expose each seat as a focusable control in DOM (row-major order), `aria-pressed` mirrors SELECTED, `aria-label="Seat 12, available, LKR 850"`; focus == hover material; keep arrows/Home/End; **2D fallback must pass the same checks (I6)**; this is a promise in HelpPage pledge | C2/C10/C11/C24/I6; checklist #1, #2, #8; Test T5 |
| **R6** | **Route-tools heavy on 2G; no caching; not using the shared hook** | Full route list + lazy map + per-card timetable fetches; inline fetch not `useRouteTools` (`RouteToolsPage.jsx:331-352`) | 3 | 3 | 9 | Adopt `useRouteTools` (abort-on-change, stable reload) (C17); lazy-load the map (already) with a real fallback (already "coming soon" — ship the map or a lighter coverage list); add HTTP cache headers / stale-while-revalidate; keep 300 ms debounce (already) | C17; Test T1 on throttled 2G; network-tab check |
| **R7** | **Operator phone numbers lack provenance → users won't call (or worse, get scammed)** | `route.operators`/`route.phones` displayed with no source label (`RouteToolsPage.jsx:154-180`); Help directory has reg no. but no "verified" label | 4 | 3 | 12 | Label source: "Operator-provided number · last verified {date}" microcopy, or a shield/badge for verified numbers; source `/operators/public` registry (HelpPage already uses it) for both pages; keep `tel:` sanitization (already) | Test T1/T4 on P2/P3: "do you trust this number and why?" |
| **R8** | **HUD unreadable when glass is over a bright 3D scene / canvas steals pointer focus** | Glass `rgba(15,23,42,0.55)` (`SeatHud.jsx:6`) < the ≥0.70 contract (C1); container `tabIndex={0}` can strand keyboard focus after mesh clicks; mobile HUD covers seats | 4 | 4 | 16 | Raise panel opacity to ≥ `slate-950/70`; audit every HUD token for ≥ 4.5:1 at resting + extreme camera angles; ensure Tab order is stable and canvas never traps focus (C9); on mobile pin P0 bar and keep touch targets ≥ 44 px | C1/C9/C12/E6; checklist #5, #10; Test T2 mobile |
| **R9** | **409 clears the whole selection instead of per-seat snap-back; recovery is punishing** | `setSelected([])` (`SeatSelect3D.jsx:239`); generic toast; no snap-back/shake/flash; no reselect link at /pay (E2) | 4 | 4 | 16 | Implement A12/C20: per-seat snap-back + toast "Seat 12 was just taken — pick another." + total same frame; keep unaffected seats; move focus to toast then to the freed seat; add /pay reselect deep-link with `{ trip }` on lock-expiry 409/422 (E2) | C7/C10/C20; Test T3 (must-fix) |
| **R10** | **No availability polling → stale seats → inflated 409 rate** | No 15 s / window-focus refresh anywhere in `SeatSelect3D.jsx` (only refetch after 409) | 3 | 3 | 9 | Poll every 15 s + on window focus while `interactive`/`conflict` only (never during intro/locking/success); reconcile `selected` against fresh payload (A19/C19); hover-then-conflict click → 1-pulse shake, never selects | A19/C19; network-tab cadence test |
| **R11** | **Success overlay invisible to SR/keyboard; confetti ignores reduced-motion; no auto-nav** | `role="dialog"` without focus, trap, or Escape (`SuccessScene.jsx:88-95`); no 800 ms auto-nav; canvas confetti runs always (`:69-75`) | 3 | 4 | 12 | Move focus into dialog on open; trap + Escape→continue; announce "Seats locked" (polite); QR has accessible name + text fallback (booking ref + seats) (C8/C9/C10); gate confetti/shake/vibrate on reduced-motion (C4/A15) | C4/C8/C9/C10; checklist #9; Test T5 |
| **R12** | **Seats clickable during locking → payload/selection drift** | `Seat3D.jsx` has no disabled path; `SeatSelect3D.jsx:230,264` reads live `selected` into success payload | 3 | 4 | 12 | Freeze seats (`pointer-events-none`, out of tab order) + HUD `aria-busy` while `locking` (E15); send `lockedSeats` from the lock response, not live state; fire lock once | E15; Test T2 double-click; code review |
| **R13** | **Detour to route-tools/help destroys search context** | No `vygo_last_search` restore in `Home.jsx` (E9/C0-D2) | 3 | 3 | 9 | Persist last search; on return offer "Restore last search" chip (never auto-run); keeps Task 1 → Task 2 chain cheap | E9/D2; Test T1→T2 chaining |
| **R14** | **Seat class flavors invisible in 3D (VIP/Ladies/Accessible tint-only)** | `seatMeta.js:62-69` category → color only; no icons; P3's accessible seat is indistinguishable from VIP by color alone | 3 | 3 | 9 | Render crown/heart/wheelchair glyphs + labels; keep tint as secondary channel (A5) | A5; greyscale check #6 |

**Top 5 by score for the gate (see §4 prioritization matrix):** R2 (blank scene, S×L=20), R5 (a11y black hole, 20),
R1 (intro, 16), R8 (HUD/contrast/focus, 16), R9 (409 recovery, 16).

---

## 4. Usability test plan

### 4.1 Research questions
1. Does the cinematic intro create value or friction for each persona — and does skip/reduced-motion behavior match
   user intent?
2. Can a low-end Android user complete a 3D booking reliably (WebGL, FPS, data, thumb targets)?
3. How well do users recover from a 409, and does per-seat vs. all-cleared recovery matter measurably?
4. Does route-tools deliver "find expressway + trusted operator phone" on time for business travelers, and help answer
   refund questions for tourists?
5. Do the 3D flow's a11y claims (Help pledge) hold under keyboard, screen-reader, and reduced-motion conditions?

### 4.2 Participants (n = 5, purposive — one per persona + controls)

| # | Profile (persona) | Device (test device) | Network | Access needs | Thread |
|---|---|---|---|---|---|
| P1 | Kumari — commuter (P1) | Budget Android (Samsung A-series class), 720p | Throttled 3G/2G | None; Sinhala-first (moderator in Sinhala) | T1, T2 (low-end), T3 |
| P2 | Ravi — business traveler (P2) | Mid Android (Redmi/Moto class) or iPhone SE | 4G | None | T1, T2 (speed), T3 |
| P3 | Amara — tourist (P3) | iPhone 12+ | Roaming 4G (data budget) | Reduced-motion ON, magnifier | T1, T4 |
| P4 | Repeat commuter (P1 variant) | Same budget Android | 4G | None — has booked with 2D before | T2 (intro-skip focus) + 2D baseline comparison |
| P5 | A11y-heavy user (P3 variant) | Desktop + iPhone with TalkBack/VoiceOver + NVDA | N/A | Screen reader, keyboard-only, reduced-motion | T5 (a11y thread) |

Sample-size rationale: Nielsen's 5-user norm catches ~80% of usability issues per flow; with the persona/device spread
above we cover the three device classes and the two access-need profiles. **Caveat:** 5 users will not validate
statistical effects — treat all numbers as directional; follow up with a remote unmoderated sweep (n ≈ 30) for
quantitative confidence on T2 time-on-task and intro-skip rate.

### 4.3 Session outline (45–60 min each, moderated + 1 observer; remote with screen share + device camera, or in-lab)
1. **Welcome + consent** (5 min): recording, think-aloud, data handling (SL privacy norms: no PII beyond screen).
2. **Baseline questions** (5 min): current booking behavior, device, data plan, trust in bus apps, motion sensitivity.
3. **Tasks** (30–35 min): T1–T4 for P1–P4; T5 (a11y thread) for P5; T1→T2 chaining observed for all.
4. **Debrief** (10 min): SUS, per-task SEQ, intro perception (likability 1–5, perceived length), motion-sickness check.

### 4.4 The 5 tasks (with measurable success criteria)

**T1 — Expressway find + operator phone (route-tools).**
*Scenario:* "You're traveling Colombo→Kandy this weekend. Find an expressway bus and the operator's phone number so you
can ask about luggage."
- Success: EXPRESSWAY route card identified; a `tel:` number found; correct from/to; no moderator assist.
- Pass bar: completes ≤ 3 min; error = picks a NORMAL route first, or cannot find a phone.

**T2 — Book 2 seats on a luxury bus (3D flow).**
*Scenario:* "Book 2 seats on the 8:30 luxury bus Colombo→Kandy for Saturday."
- Success: exactly 2 seats selected; HUD total matches `/pay`; boarding/drop-off chosen sensibly; reaches payment.
- Pass bar: ≤ 4 min (commuter) / ≤ 2.5 min (business traveler); 0 wrong-seat picks; total never mismatched.
- Baseline: P4 repeats the task in the 2D flow (`SeatSelect.jsx` via direct route) for a time/error delta.
- Captures: **intro-skip rate** (watched vs. skipped, time-to-skip), perceived intro length, WebGL/FPS telemetry.

**T3 — Recover from seats-taken (409) at checkout.**
*Scenario:* "Right as you press Book Now, the seat you picked gets grabbed by someone else. Recover your booking."
- Setup: moderator/observer holds a second session that locks the chosen seat just before the participant presses
  Book Now (deterministic 409).
- Success: notices the toast; loses only the affected seat; completes lock.
- Pass bar: ≤ 90 s to completed lock, ≤ 2 booking attempts; error = gives up, selects a booked seat, or re-searches.

**T4 — Get help about a refund.**
*Scenario:* "You cancelled a trip yesterday. Where do you find out when the refund arrives and how to reach a human?"
- Success: finds Cancellations & Refunds (3–5 business days); identifies one human channel (phone/email/assistant).
- Pass bar: ≤ 3 min; error = leaves /help or asks the moderator for the answer.

**T5 — Accessibility thread (keyboard / SR / reduced-motion).**
*Scenario:* "Using only your keyboard (or screen reader), and with motion reduced, select seat 14 and continue to
payment."
- Success: seat 14 selected (announced with state + fare), total announced, Book Now reachable, /pay reached.
- Pass bar: no focus loss to `body`, no unannounced state changes, no animation under reduced-motion (confetti
  included), full selection → lock ≤ 1 s transition to interactive after load.

### 4.5 Metrics to capture

| Metric | How | Instrument / target |
|---|---|---|
| Time-on-task | Per task stopwatch; T2 3D vs. 2D delta | Target: T2 ≤ 240 s (P1), ≤ 150 s (P2) |
| Task completion rate | Pass/fail, assisted/unassisted | ≥ 80% unassisted per task |
| Error rate | Wrong-seat picks, cap violations (7th seat), 409 re-picks, filter mistakes, total mismatch | ≤ 1 critical error per task |
| **Intro-skip rate** | Watched vs. skipped + time-to-skip | Target ≤ 40% watched on 2nd+ exposure; skip lands in interactive ≤ 0.35 s |
| Susceptibility to motion sickness | Self-report after T2/T5 (0–10) | Mean ≤ 2/10; any "3+" on reduced-motion OFF flagged |
| WebGL/FPS telemetry | `requestAnimationFrame` sampling, context-creation success, DPR | ≥ 45 fps on P1 device; 100% context success or clean 2D fallback |
| Data cost (route-tools) | DevTools network bytes for `/route-tools` + map + timetable | Document payload size at 2G; target < 1 MB initial |
| SUS score | Standard 10-item after all tasks | Target ≥ 70 overall; compare 3D vs. 2D on P4 |
| SEQ (1–7) per task | After each task | Target ≥ 5 on T1/T2/T3 |
| Trust of operator numbers | Debrief question P2/P3 | ≥ 2/3 can explain why a number is (un)trustworthy |
| Intro perception | Likability 1–5 + perceived length vs. actual | Flag if perceived > actual by > 2 s |

### 4.6 Prioritization matrix

| Tier | Fix | Evidence to watch in test | Gate |
|---|---|---|---|
| **Must-fix before ship** | R2: WebGL/low-FPS fallback to 2D `BusSeatMap` with same HUD + a11y (C18) | Blank/black canvas, crash, or < 45 fps on P1 | I5/C18 |
| | R5: seats keyboard-accessible + SR-named + `aria-pressed` + focus==hover (C2/C10/C24) | T5 fails focus/narration; Help pledge broken | C2/C24 |
| | R1: intro ≤ 9 s + universal skip (click/key/chip) (C3/A1) | P4 watches full intro; skip-rate < 50% on repeat | C3/A1 |
| | R8: glass ≥ 0.70 opacity + contrast audit + stable focus order (C1/C9) | HUD unreadable in daylight or over confetti | C1/C9 |
| | R9: per-seat 409 snap-back + toast focus + /pay reselect link (C20/E2) | T3 recovery > 90 s or reselects > 2 attempts | C20/E2 |
| | R4/R11: reduced-motion kills flight/confetti/shake; success dialog focus + announce (C4/C8) | T5 sees confetti/shake; SR misses "Seats locked" | C4/C8 |
| **High (first patch)** | R3: non-color seat cues + 4-state legend (C5/A18) | T2/T5 participants can't tell locked from booked | C5/A18 |
| | R10: 15 s + focus polling, reconcile selected (C19) | T3 409 rate artificially high | C19 |
| | R12: freeze seats while locking; payload from lock response (E15) | Double-click drift observed | E15 |
| | R13: restore last search on detour (E9) | T1→T2 chaining costs a re-search | E9 |
| **Later** | R6: `useRouteTools` adoption + caching (C17) | T1 slow on 2G | C17 |
| | R14: flavor icons (crown/heart/wheelchair) in 3D (A5) | P3 can't find accessible seat | A5 |
| | R7: operator phone "verified/last updated" labels | Trust answers in debrief | — |
| | R15: Sinhala/Tamil i18n (phase 2) | P1 struggles with English stop names | — |
| | R16: Help directory search for 100+ operators | P3 browse time on /help | — |

---

## 5. Accessibility research checklist (10 concrete checks)

Run each check **twice** — once on the 3D flow, once on the 2D fallback (contract I6). Each is binary pass/fail; the
Finish-Gate Reviewer and this research agree on the method. Cross-references: contract C#, game A#.

| # | Check | How to verify (concrete) | Pass criteria |
|---|-------|--------------------------|---------------|
| 1 | **Keyboard-only completion of a booking** | Tab through from Home → trip card → `/seat-select`. Complete T2 with keyboard only: HUD selectors, camera buttons, seat grid (row-major arrows, Enter/Space, Home/End), Book Now, success overlay → /pay. | Full 2-seat lock + navigation to `/pay` with zero mouse/touch; focus never lands on `body`; no dead-ends (C2/C9). |
| 2 | **Screen-reader narration of seat states** | NVDA/VoiceOver/TalkBack on the seat grid. Focus a seat: hear "Seat 12, available, LKR 850"; select: `aria-pressed` + live region "2 seats selected · LKR 1,700" (debounced ≤ 300 ms); 7th seat: "Maximum 6 seats."; 409: "Seat 12 was just taken — pick another." | All five announcements heard in order; no duplicate/empty announcements (C11/A16). |
| 3 | **Reduced-motion full flow** | Emulate `prefers-reduced-motion: reduce` (devtools) + confirm on a real OS. Load seats → pick → lock → success. | No flight (B1–B5), no bob/pulse/confetti/shake/vibrate; captions + state colors kept; load→interactive ≤ 1 s; confetti canvas absent from DOM (C4/A15). |
| 4 | **Focus order through intro skip** | Load with intro; press a key at 1 s, 5 s, 8 s; also click-anywhere and the Skip chip. After each skip: read `document.activeElement`. | Skip lands in `interactive` ≤ 0.35 s; focus moves to the first available seat in row-major order (left block → aisle → right); summary announces "Seat map ready. You can select up to 6 seats." (C3/C10). |
| 5 | **HUD contrast on glass over 3D background** | DevTools computed-color audit on every HUD token (route strip, times, totals, selectors, captions, Book Now label) at 3 camera poses (resting, rotated 180°, zoomed to a SELECTED green seat over confetti) in daylight-backdrop conditions. | Every token ≥ 4.5:1; panel background ≥ `slate-950/70` opacity so math holds; `text-slate-500` never used for captions (C1). |
| 6 | **Non-color seat-state cues** | Greyscale + deuteranopia/tritanopia emulation screenshot of the resting frame (and the legend). | States distinguishable without hue: LOCKED = lock glyph, BOOKED = dark/filled + contrast pattern, SELECTED = check + lift, AVAILABLE = seat number; VIP/Ladies/Accessible show crown/heart/wheelchair icons; legend swatches have text + icons (A5/A18/C5). |
| 7 | **Focus == hover on seats, no double ring** | Keyboard-focus a seat; screenshot. Pointer-hover the same seat; screenshot. Compare materials; check for a CSS outline on seat buttons. | Keyboard-focused seat renders the identical lift/glow/tooltip as hover; no extra CSS ring on seats; HUD controls keep the global focus ring (C24/A11). |
| 8 | **Canvas & SR behavior / pointer-focus integrity** | Inspect a11y tree for the scene; tab from a seat to the HUD; click a mesh, then press Tab. | Canvas exposes a clear accessible name/role; seats are individual focusable controls (or the 2D fallback is served to AT); clicking a mesh never strands focus; Tab order resumes HUD → grid → Book Now (C2/C9). |
| 9 | **Locking / conflict / success states announced + focusable** | Trigger each: lock in flight (`aria-busy` + "Locking seats…" `role="status"`); 409 (`role="alert"` toast receives focus, then the freed seat); success (`role="dialog"` receives focus, `aria-modal`, Escape continues, QR has accessible name + text fallback = booking ref + seats). | SR hears each state; focus moves per state; no trap; QR readable without vision (C7/C8/C9/C10). |
| 10 | **Mobile small-screen + touch ergonomics** | 390 px portrait and 844 px landscape: HUD P0 (route, count, total, Book Now) always visible; HUD sheet does not cover the front rows; every touch target ≥ 44×44 px (camera buttons are 36 px today — flag); safe-area bottom inset; sheet ≤ 45vh landscape (E6). | Thumb can select any seat without closing the sheet; P0 survives scroll; no target < 44 px on the booking path (C12/E6). |

---

## Appendix — one-line evidence map (quick reference)

| Finding | Where in code |
|---|---|
| Intro ≈ 10.1 s, chip-only skip | `BoardingSequence.jsx:61-86,31-34` |
| No WebGL/low-FPS fallback | `SeatSelect3D.jsx:342-388` (Canvas always mounts) |
| Seats not focusable; container keydown | `SeatSelect3D.jsx:334-341,193-205`; `Seat3D.jsx:106-125` |
| Color-only states; 7-swatch color-only legend | `Seat3D.jsx:24-46`; `SeatHud.jsx:11-19` |
| Glass 0.55 opacity | `SeatSelect3D.jsx:44`; `SeatHud.jsx:6` |
| 409 clears all; no snap-back | `SeatSelect3D.jsx:237-245` |
| No polling | `SeatSelect3D.jsx` (no 15 s/focus refresh) |
| Seats clickable while locking | `Seat3D.jsx` (no disabled path) |
| Success dialog unfocused; confetti un-gated | `SuccessScene.jsx:88-95,69-75` |
| RouteTools inline fetch, no `useRouteTools` | `RouteToolsPage.jsx:331-352` |
| No restore-last-search | `Home.jsx` (no `vygo_last_search`) |
| /pay lock-expiry has no reselect link | `Payment.jsx:99-131` |
| Help pledge vs. 3D reality gap | `HelpPage.jsx:133-154` vs. findings R5/R3/R11 |

---

*End of UX research v1.0 — validate via §4 before the Finish-Gate; re-run §5 twice (3D + 2D fallback) at gate time.*
