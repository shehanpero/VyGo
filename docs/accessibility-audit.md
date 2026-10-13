# VyGo Frontend — Accessibility Audit (WCAG 2.2 AA)

**Date:** 2026-08-03 (pass 1); pass 2 (label-association sweep) same day.
**Scope:** `frontend/` — the expressway-corridor remake (Home, Routes, Payment, SeatSelect, MyBookings, BookingDetail, Login, Register; Layout/Brand/AiAssistant/ExpresswayCorridors/OperatorChips/RouteMap/HeroScene3D; `index.css`).
**Baseline:** `npm run build` passes before and after this pass. Contrast ratios below were computed from the actual hex values in `tailwind.config.js` / `index.css` against the actual surfaces (`slate-900` card = `#0f172a`, `slate-950` page = `#020617`).
**Note:** VyGo is not a US government site; USWDS components were deliberately *not* installed. The audit applies WCAG 2.2 AA rigor (the same rigor USWDS encodes) to the existing React/Tailwind codebase.
**Pass 2 status:** This revision documents pass 2 — a systematic label-association, grouped-control, and live-region sweep. Files edited in pass 2: `Login.jsx`, `Register.jsx`, `SeatSelect.jsx`, `Payment.jsx`, `BookingDetail.jsx`, `MyBookings.jsx`, `Notifications.jsx`, `ConductorApp.jsx`, `OperatorSchedules.jsx`, `OperatorBuses.jsx`, `OperatorReports.jsx`, `OperatorDashboard.jsx`, `AdminDashboard.jsx`, `AdminOperators.jsx`, `AdminComplaints.jsx`, and `components/BusSeatMap.jsx`. `Home.jsx`, `Routes.jsx`, and `components/RouteMap.jsx` remain owned by another agent and are still open there (see §2.1 / §2.2). Contrast-only rows below marked **still open** were intentionally *not* changed in pass 2 because they require Tailwind class changes, which are out of scope for the attribute-only sweep (and `index.css` / `tailwind.config.js` are owned by another agent).

---

## Summary

| Severity | Fixed here | For other reviewer | Design-system / residual |
| --- | --- | --- | --- |
| High | 0 | 4 (missing label associations on forms) | 1 (`.btn-primary` text contrast) |
| Medium | 9 | 11 | 2 |
| Low | 0 | 7 | 2 |

**After pass 2 (label-association sweep):** all four High form-label findings are resolved — `Home.jsx` labels by the Home owner, `Login.jsx` / `Register.jsx` / `SeatSelect.jsx` labels in this pass (see §7). The Medium/Low items listed in §2.3–§2.6 that were in pass-2 scope are now fixed (marked below); the two `text-slate-500` contrast rows are **still open** (class changes, out of pass-2 scope), and §2.1 / §2.2 remain with the other agent.

The strongest patterns are already present and were verified, not changed: global `:focus-visible` ring (2.4.11), `.focus-ring` on clickable cards, real `<button>`/`<Link>` semantics for chips/cards, `role="log"`/`role="status"` in the assistant, `aria-pressed` on the Home "Road type" toggle, and `prefers-reduced-motion` guards.

---

## 1. Issues FIXED in this pass

### 1.1 Layout.jsx

| File:Line | Criterion | Severity | Fix |
| --- | --- | --- | --- |
| `Layout.jsx:31` | 2.4.1 Bypass Blocks (A) | Medium | **No skip link.** Added `<a class="skip-link" href="#main-content">Skip to main content</a>` as the first focusable element; `<main>` now has `id="main-content"` + `tabIndex={-1}` (Layout.jsx:135). Supporting `.skip-link` utility added to `index.css`. |
| `Layout.jsx:113-120` | 4.1.2 Name (A) | Medium | "My space" button's only accessible name was the `title` tooltip (fragile per the AccName algorithm — `title` is a last-resort fallback). Added `aria-label="Go to my space"`. |
| `Layout.jsx:121-128` | 4.1.2 Name (A) | Medium | "Sign out" icon-only button named only via `title`. Added `aria-label="Sign out"`. |
| `Layout.jsx:143` | 1.4.3 Contrast (AA) | Medium | Footer caption `text-slate-500` on `slate-950` = **4.24:1** — below the 4.5:1 AA minimum for normal text. Changed to `text-slate-400` (**7.87:1**). |
| `Layout.jsx:140` + `Brand.jsx:3-13` | 1.1.1/4.1.2 (A) | Low | Footer announced "VyGo" twice (img `alt="VyGo"` + adjacent "VyGo" text). `BrandIcon` now accepts an `alt` prop (default `"VyGo"`, backward-compatible) and the footer passes `alt=""` so the mark is decorative next to the visible name. |

### 1.2 AiAssistant.jsx

| File:Line | Criterion | Severity | Fix |
| --- | --- | --- | --- |
| `AiAssistant.jsx:333-339` | 4.1.2 State + Disclosure pattern (AA) | Medium | The assistant FAB is a disclosure (toggles a panel) but had no `aria-expanded`. Added `aria-expanded={open}` and `aria-controls="vygo-assistant-dialog"`; the dialog now carries `id="vygo-assistant-dialog"` (AiAssistant.jsx:191). This pairs with the existing `aria-label` switch and focus-return-to-FAB behavior. |

### 1.3 ExpresswayCorridors.jsx

| File:Line | Criterion | Severity | Fix |
| --- | --- | --- | --- |
| `ExpresswayCorridors.jsx:128` | 1.4.3 Contrast (AA) | Medium | "Served towns" label, `text-slate-500` on `slate-900` = **3.75:1** (fails). → `text-slate-400` (**6.96:1**). |
| `ExpresswayCorridors.jsx:138` | 1.4.3 Contrast (AA) | Low | "+N more" caption, `text-slate-500` = **3.75:1**. → `text-slate-400`. |
| `ExpresswayCorridors.jsx:143` | 1.4.3 Contrast (AA) | Medium | "Operators" label = **3.75:1**. → `text-slate-400`. |
| `ExpresswayCorridors.jsx:210` | 1.4.3 Contrast (AA) | Medium | "All classic numbered routes" label on page bg = **4.24:1**. → `text-slate-400`. |
| `ExpresswayCorridors.jsx:115-121, 166-171` | 2.4.4 / 2.4.9 Link Purpose (A/AAA) | Medium | Corridor cards are whole-card `<Link>`s whose accessible name was the **entire card text** (badge + heading + tagline + summary + 8 town chips + operator chips) — an unparseable wall for screen-reader users. Added concise data-driven names: `aria-label="E01 Southern Expressway — search trips from Colombo to Kataragama"` (and E03 / A9 equivalents). The visible rich content is unchanged for sighted users. |

### 1.4 OperatorChips.jsx

| File:Line | Criterion | Severity | Fix |
| --- | --- | --- | --- |
| `OperatorChips.jsx:32` | 1.1.1 / 4.1.2 (A) | Low | The avatar initials duplicated the operator name in the AT output ("SL SLTB"). Initials are decorative duplicates of the adjacent name → `aria-hidden="true"` on the avatar circle. |

### 1.5 index.css

| File:Line | Criterion | Severity | Fix |
| --- | --- | --- | --- |
| `index.css:172-186` | 2.4.1 Bypass Blocks (A) | Medium | Added additive `.skip-link` component (token-driven, `--primary-500` bg with `#020617` text = **7.95:1** AA, off-screen until keyboard focus, never clipped by `overflow`). No existing rules changed. |

---

## 2. Issues for the OTHER reviewer (files NOT edited here)

Ownership boundary: Home.jsx, Routes.jsx, Payment.jsx, SeatSelect.jsx, BookingDetail.jsx, MyBookings.jsx, Login.jsx, Register.jsx, HeroScene3D.jsx, RouteMap.jsx, BusSeatMap.jsx.

**Pass 2 update:** the ownership boundary above is the pass-1 boundary. In pass 2, `Payment.jsx`, `SeatSelect.jsx`, `BookingDetail.jsx`, `MyBookings.jsx`, `Login.jsx`, `Register.jsx`, and `BusSeatMap.jsx` were edited for label association / live regions / `aria-pressed` (see §7), so the rows below that are now resolved are marked **→ FIXED (pass 2)**. Remaining open here: §2.1 (Home, owned by other agent), §2.2 (Routes/RouteMap, owned by other agent), and the two contrast rows marked **still open** in §2.4 / §2.6.

### 2.1 Home.jsx

| File:Line | Criterion | Severity | Finding |
| --- | --- | --- | --- |
| `Home.jsx:199-209, 222-234, 235-248, 252-261` | 1.3.1 / 4.1.2 / 3.3.2 (A) | **High** | **From / To / Date / Bus type labels are not programmatically associated.** The `<label class="label">` elements have no `htmlFor` and the inputs have no `id`. Accessible names fall back to placeholders — and the **Date input has no placeholder, no `aria-label`, and no association → an unnamed control**. Fix: give each label `htmlFor` and each input/select a matching `id` (or `aria-label`). |
| `Home.jsx:293-302` | 4.1.2 State (A) | Medium | Corridor chips are real `<button>`s with text names (good) but the *selected* chip is shown only by `route-pill--expressway` color/border — no `aria-pressed`. Add `aria-pressed={corridor === c.code}`. (The "Road type" toggle at `Home.jsx:266-282` already does this correctly.) |
| `Home.jsx:329-341` | 4.1.3 Status Messages (AA) | Medium | Results count ("N trips found") updates with no live region — a screen-reader user who triggers a search hears nothing. Add `role="status"`/`aria-live="polite"` to the count or wrap it. |
| `Home.jsx:463-476` | 4.1.3 Status Messages (AA) | Medium | The "Searching trips…" loading block has no live region. Add `role="status"` to the section/h2. |
| `Home.jsx:323` | 4.1.3 Status Messages (AA) | Low | Search error `<p>` has no `role="alert"`. |
| `Home.jsx:395-399, 447, 358, 367` | 1.4.3 Contrast (AA) | Medium | `text-slate-500` at 11–14px on card surfaces = **3.75:1** (fails). Bump to `text-slate-400` (6.96:1). |

### 2.2 Routes.jsx / RouteMap.jsx

| File:Line | Criterion | Severity | Finding |
| --- | --- | --- | --- |
| `Routes.jsx:186-208` | 4.1.2 State (A) | Medium | Route-type filter buttons (All / Normal / Expressway) convey selection by `bg-primary-500` only — no `aria-pressed` (Home's equivalent toggle does this right). |
| `Routes.jsx:255-257` | 4.1.3 Status Messages (AA) | Medium | "N routes found / Loading routes…" is not in a live region. |
| `Routes.jsx:337` | 1.4.3 Contrast (AA) | Medium | `text-[10px] text-slate-500` km label on `slate-800/50` = **≈3.75:1** (fails). |
| `RouteMap.jsx:211` | 1.1.1 / 1.4.1 (A) | Medium | The map **legend is `aria-hidden="true"`**, so screen-reader users never get the corridor color/key. Leaflet maps are not fully accessible — the required pattern is a **text alternative beside the map**. The corridor cards rendered below in `Routes.jsx:149` (`ExpresswayCorridors`) already list codes, towns, and operators — wire them as the alternative: e.g. `aria-describedby` from the map section to a sr-only corridor list (or the visible legend), plus an `aria-label` on the map container that says the corridor cards below are the accessible text list. |
| `RouteMap.jsx:208` | 1.1.1 / 2.4.4 (A) | Medium | Map container has only `aria-label="Sri Lanka bus route map"`; the pan/zoom controls and tile canvas are largely inaccessible to keyboard/SR. Provide the text alternative per above and mark the region so assistive tech users can skip it (`role="region"` + label, or make the wrapper focusable-off). |

### 2.3 SeatSelect.jsx / BusSeatMap.jsx

| File:Line | Criterion | Severity | Finding |
| --- | --- | --- | --- |
| `SeatSelect.jsx:148-175` | 1.3.1 / 4.1.2 / 3.3.2 (A) | **High** | **→ FIXED (pass 2)** — boarding/drop-off labels now associated: `htmlFor="seatselect-boarding"` / `id="seatselect-boarding"`, `htmlFor="seatselect-dropoff"` / `id="seatselect-dropoff"`. |
| `BusSeatMap.jsx:53-77` | 4.1.2 State (A) | Medium | **→ FIXED (pass 2)** — seat buttons now carry `aria-pressed={unavailable ? undefined : isSelected}`; booked/locked seats stay disabled. |
| `SeatSelect.jsx:180-181` | 4.1.3 Status Messages (AA) | Low | **→ FIXED (pass 2)** — loading gets `role="status"`, error `role="alert"`; lock-conflict error at `SeatSelect.jsx:226` also `role="alert"`. |

### 2.4 Payment.jsx

| File:Line | Criterion | Severity | Finding |
| --- | --- | --- | --- |
| `Payment.jsx:179-188` | 1.4.3 Contrast (AA) | Medium | **STILL OPEN** — `text-xs text-slate-500` boarding/drop-off labels = **3.75:1** (fails). Requires a Tailwind class change (`text-slate-400`), out of pass-2 attribute-only scope. Now at `Payment.jsx:197-206`. |
| `Payment.jsx:239` | 3.2.5 / G201 (AA) | Low | **→ FIXED (pass 2)** — "Open PayHere" link now has `aria-label="Open PayHere (opens in a new tab)"`. |
| `Payment.jsx:191` | 4.1.3 Status Messages (AA) | Low | **→ FIXED (pass 2)** — error box now has `role="alert"` (`Payment.jsx:209`). |
| `Payment.jsx:138-154` | 1.3.1 (A) | Low | **→ FIXED (pass 2)** — current step `<li>` now carries `aria-current={step === s.num - 1 ? 'step' : undefined}`. |

### 2.5 Login.jsx / Register.jsx

| File:Line | Criterion | Severity | Finding |
| --- | --- | --- | --- |
| `Login.jsx:48-53` | 1.3.1 / 4.1.2 / 3.3.2 (A) | **High** | **→ FIXED (pass 2)** — `htmlFor="login-email"` / `id="login-email"`, `htmlFor="login-password"` / `id="login-password"`. |
| `Login.jsx:55` | 4.1.3 (AA) | Low | **→ FIXED (pass 2)** — error text now has `role="alert"`. |
| `Register.jsx:60-108` | 1.3.1 / 4.1.2 / 3.3.2 (A) | **High** | **→ FIXED (pass 2)** — all 10 passenger/operator labels now associated (`register-fullname`, `register-email`, `register-mobile`, `register-password`, `register-company-name`, `register-registration-no`, `register-license-no`, `register-address`, `register-contact-person`, `register-phone`). |
| `Register.jsx:47-56` | 4.1.2 State (A) | Medium | **→ FIXED (pass 2)** — Passenger/Operator toggle buttons now have `aria-pressed={role === r}`. |
| `Register.jsx:113` | 4.1.3 (AA) | Low | **→ FIXED (pass 2)** — error text now has `role="alert"`. |

### 2.6 MyBookings.jsx / BookingDetail.jsx

| File:Line | Criterion | Severity | Finding |
| --- | --- | --- | --- |
| `MyBookings.jsx:46-47` | 4.1.3 (AA) | Low | **→ FIXED (pass 2)** — loading gets `role="status"`, error `role="alert"`. |
| `BookingDetail.jsx:176` | 1.4.3 Contrast (AA) | Medium | **STILL OPEN** — `text-xs text-slate-500` "Show this QR…" on `slate-900` = **3.75:1** (fails). Requires a Tailwind class change, out of pass-2 attribute-only scope. Line unchanged: `BookingDetail.jsx:176`. |
| `BookingDetail.jsx:175` | 1.1.1 (A) | Low | **→ FIXED (pass 2)** — QR image `alt` is now descriptive: `alt={QR ticket for ${t.ticketRef} — seat ${t.seatNumber}}`. |
| `BookingDetail.jsx:197` | 4.1.3 (AA) | Low | **→ FIXED (pass 2)** — cancel error now has `role="alert"`; loading (`BookingDetail.jsx:70`) also `role="status"`. |

---

## 3. Design-system level / residual (needs a decision, not a line fix)

| File:Line | Criterion | Severity | Finding & rationale |
| --- | --- | --- | --- |
| `index.css:15-17` (`.btn-primary`) | 1.4.3 Contrast (AA) | **High** | **White text on `primary-500` = 2.54:1 — fails.** Affects every primary button in the app (Search trips, Sign in, Create account, Continue…). Pre-existing, and `docs/design-system.md` declares existing classes byte-for-byte unchanged, so it was *not* changed here. Evidence of the fix pattern already in-tree: the segmented toggles (`Home.jsx:269`) use `text-slate-950` on `primary-500` = **7.95:1**. Recommend `.btn-primary` → dark text (`text-slate-950`) or `bg-primary-600` (`#059669`, white = 3.86:1 — still short; dark text is the reliable fix). |
| `index.css:73-75, 122` | 1.4.3 Contrast (AA) | Medium | `--text-subtle` (`slate-500`, ≈4:1) is used as small (11–14px) text across many pages; it only passes for large text. The design-system doc already flags it as "large text only". This pass fixed the occurrences in owned files; remaining instances are listed in §2. Recommend reserving `slate-500` for large/disabled text or re-tokenizing to `slate-400`. |
| `tailwind.config.js:7` | (informational) | Low | `primary-300` (and 100/200) is referenced in JSX (`AiAssistant.jsx:274`, `Home.jsx:317,485`, `Routes.jsx:234`, `BusSeatMap.jsx:74`) but **not defined** in the Tailwind config, so those utilities are never generated and the tinted emerald color silently falls back to inherited text color. No contrast failure (inherited color is high-contrast), but a design inconsistency. Add `300` to the config or replace with `400`. |
| `Layout.jsx:38-131` | 1.4.10 Reflow (AA) | Medium | On ≤360px, an authenticated OPERATOR/ADMIN/CONDUCTOR header (4+ nav links + user block) overflows horizontally. Needs a responsive nav (hamburger) — larger change, left for a design pass. The `hidden sm:block` user name already helps at ≥640px. |
| `AiAssistant.jsx:190-195` | 1.3.1 / APG dialog pattern (A) | Low | The dialog is non-modal (`role="dialog"` without `aria-modal`); keyboard focus can tab into the background. This is acceptable for a non-modal chat widget; if the product wants modal behavior, add `aria-modal="true"` + a focus trap. |
| `ExpresswayCorridors.jsx` / `OperatorChips.jsx` | 1.4.3 | Low (accepted) | `.operator-chip-avatar`: white initials on `expressway-600` = **3.74:1**. Kept by design: the initials are decorative duplicates of the adjacent operator name (now `aria-hidden`), and `docs/design-system.md` explicitly reserves `expressway-600` for avatars. Flagging for completeness. |

---

## 4. What was verified as already conformant (no change needed)

- **2.4.11 Focus Appearance**: global `:focus-visible` (2px teal `#2dd4bf` outline, 2px offset; ≈10.8:1 vs page) plus `.focus-ring` on corridor/trip cards; native `<Link>`/`<button>` focus everywhere else.
- **4.1.2 / 1.3.1 semantics**: corridor chips are real `<button>`s; trip cards and corridor cards are real `<Link>`s; `Swap cities` has `aria-label`; Home "Road type" toggle has `aria-pressed`; `sort` select has `aria-label`; Routes search has `aria-label`.
- **Heading order**: Home (h1→h2), Routes (h1→h2→h2/h3→h2), Payment/BookingDetail (h1→h2) — no skipped levels. `ExpresswayCorridors` section heading pair is `.eyebrow` (span) + `h2`, cards use `h3`.
- **Landmarks**: single `<header>`/`<nav>`/`<main>`/`<footer>`; `<main id="main-content">` added for bypass.
- **Live regions in AiAssistant**: conversation `role="log" aria-live="polite"`, typing indicator `role="status"`; Escape closes dialog; focus returns to the FAB.
- **2.3 / motion**: `prefers-reduced-motion: reduce` disables `.fade-in`, active transforms, and HeroScene3D's animation loop; HeroScene3D canvas is `aria-hidden` + `role="presentation"`.
- **Badge/pill/card contrast (the new teal system)**: `expressway-300` badge/pill text on its tinted surfaces ≈7.7–10.4:1, `expressway-400` accents ≈9.6–10.8:1, `primary-400` fares/badges ≈7.4–9.3:1, town-chip `slate-300` ≈10.7:1 — all pass.

---

## 5. Keyboard & screen-reader test script

### Keyboard (no mouse)

1. **Home (logged out)**: press `Tab` from page load. First stop must be **Skip to main content**; `Enter` moves focus to `<main>`. Continue tabbing: header nav → hero search card (From → To → Date → Bus type → Road type toggle → Search trips) → corridor chips → popular routes → results/trip cards. Confirm every focusable gets the 2px teal outline.
2. **Road type + corridor chips**: `Space`/`Enter` triggers; focus stays in place; results update.
3. **Routes**: tab through filter buttons/select; arrow keys in the select; focus order through corridor cards (E01, E03, A9), featured route links, then catalogue cards and their "Search trips" links.
4. **Seat selection**: tab through the seat grid; `Space` toggles a seat (state changes must be audible/announced); Continue button.
5. **AiAssistant**: `Enter` on the FAB opens the dialog and moves focus to the message input; type + `Enter` sends; `Esc` closes and returns focus to the FAB. Confirm the FAB announces "Open/Close VyGo Assistant" with expanded state.
6. **At 400% zoom (200%×200%)**: no horizontal scrolling on Home/Routes/SeatSelect (logged-out Home and SeatSelect are the tight ones).

### Screen reader (NVDA + Firefox / VoiceOver + Safari)

1. Landmark navigation (`D`/`Tab` with rotor): banner → navigation → main → contentinfo; "Skip to main content" is the first link.
2. Search form: announce "From, edit text, Departure city or stop" (once Home labels are associated by the other reviewer — currently the date field is silent). Tab announces `Date, edit text` with no name → **this is the expected current failure to re-test after fix**.
3. Road type toggle: "All routes, toggle button, pressed".
4. Search results: after pressing Search trips, hear "Searching trips…" then "N trips found" (after live regions land).
5. Trip card: hear the concise route summary, then "LKR 1,250"; operator reads as one chip name (initials not double-read).
6. Corridor card on Routes: announce `E01 Southern Expressway — search trips from Colombo to Kataragama, link` (aria-label), not the full town list.
7. Leaflet map: confirm the map region is announced with its label and that a screen-reader user can get corridor info from the cards/legend below (text alternative to be wired by the Routes reviewer).
8. AiAssistant: opening announces "VyGo Assistant dialog"; incoming assistant replies are announced (polite); the typing indicator announces "VyGo is checking…".
9. Seat buttons: "12, button" and selected seats announce "pressed" (once `aria-pressed` lands).

---

## 6. Verification

`npm run build` (Vite) succeeds after all changes — no lint/runtime regressions from the edits.

---

## 7. Pass 2 — label-association & live-region sweep (2026-08-03)

Attribute-only sweep (ids, `htmlFor`, `aria-*`, `role` — no class/behavior/markup-order changes). Verified with a scoped build to `dist-verify-a11y` (`npm.cmd run build -- --outDir dist-verify-a11y`) then deleted; default `dist/` untouched.

### 7.1 Label associations added (id + htmlFor)

| File | Labels associated |
| --- | --- |
| `Login.jsx` | `login-email`, `login-password` |
| `Register.jsx` | `register-fullname`, `register-email`, `register-mobile`, `register-password`, `register-company-name`, `register-registration-no`, `register-license-no`, `register-address`, `register-contact-person`, `register-phone` |
| `ConductorApp.jsx` | `conductor-trip-date`, `conductor-passenger-name`, `conductor-passenger-mobile`, `conductor-payment-method`, `conductor-amount-paid`, `conductor-boarding-point-id`, `conductor-dropoff-point-id`, `conductor-seats-sold`, `conductor-cash-collected`, `conductor-notes` |
| `OperatorSchedules.jsx` | `opsched-route`, `opsched-bus`, `opsched-departure`, `opsched-arrival`, `opsched-effective-from`, `opsched-effective-to`, `opsched-route-from-city`, `opsched-route-to-city`, `opsched-route-distance`, `opsched-route-duration` |
| `OperatorBuses.jsx` | `opbus-registration`, `opbus-type`, `opbus-capacity`, `opbus-model`, `opbus-year` |
| `OperatorReports.jsx` | `opreports-from`, `opreports-to` |
| `AdminOperators.jsx` | `adminops-reason` (modal) |
| `AdminComplaints.jsx` | `complaint-${complaint.id}-status`, `complaint-${complaint.id}-assigned`, `complaint-${complaint.id}-resolution` (per-card unique) |
| `SeatSelect.jsx` | `seatselect-boarding`, `seatselect-dropoff` |
| `BookingDetail.jsx` | `cancel-reason` was already associated (pass 1); verified. |

**Total: 45 `id`/`htmlFor` pairs added** (2 Login + 10 Register + 10 ConductorApp + 10 OperatorSchedules + 5 OperatorBuses + 2 OperatorReports + 1 AdminOperators + 3 AdminComplaints + 2 SeatSelect). On top of those: 3 group labels via `role="group"` + `aria-labelledby` (see 7.2), 6 `aria-label`s on repeatable boarding-point inputs, and 3 standalone `aria-label`s (see 7.3).

### 7.2 Grouped controls

- `Register.jsx:47-56` Passenger/Operator toggle → `aria-pressed={role === r}` (radio-like single-select, kept button semantics).
- `AdminOperators.jsx:94-107` status tabs → `aria-pressed={status === tab}`.
- `OperatorSchedules.jsx:227-228` "Days of week" chip group → `role="group"` + `aria-labelledby="opsched-days-label"` on the container; label element now carries the `id`.
- `OperatorBuses.jsx:181-182` "Amenities" chip group → `role="group"` + `aria-labelledby="opbus-amenities-label"`.
- `OperatorSchedules.jsx:283-284` "Boarding points" repeatable group → `role="group"` + `aria-labelledby="opsched-bp-label"`; the three per-row inputs (name/city/time offset) get `aria-label={`Boarding point ${idx + 1} …`}` instead of repeated ids (no duplicate-id risk in a `.map`).
- `ConductorApp.jsx` payment-method `<select>` is a disabled single-value read-only select (not a radio group) — left as a labeled select.
- `BusSeatMap.jsx:53-77` seat buttons → `aria-pressed={unavailable ? undefined : isSelected}` (booked/locked stay `disabled`).

### 7.3 Live regions / alerts / missing names added

- **`role="alert"`**: `Login.jsx:55`, `Register.jsx:113`, `SeatSelect.jsx:181` + `:226`, `Payment.jsx:209`, `BookingDetail.jsx:74` + `:197`, `MyBookings.jsx:47`, `Notifications.jsx:59`, `ConductorApp.jsx:204`, `OperatorSchedules.jsx:186` + `:245` + `:294`, `OperatorBuses.jsx:143` + `:198`, `OperatorReports.jsx:82`, `OperatorDashboard.jsx:74`, `AdminDashboard.jsx:119`, `AdminOperators.jsx:109`, `AdminComplaints.jsx:81`.
- **`role="status"`** (async success/loading regions): `SeatSelect.jsx:180`, `BookingDetail.jsx:70`, `MyBookings.jsx:46`, `Notifications.jsx:58`, `ConductorApp.jsx:379` (booking success) + `:407` (validation result) + `:476` (reconcile success), `OperatorSchedules.jsx:185` (message).
- **Missing accessible names**: `ConductorApp.jsx:402` QR textarea → `aria-label="Paste QR content"`; `OperatorBuses.jsx:149` icon-only Close button → `aria-label="Close"`; `Payment.jsx:260` "Open PayHere" new-tab link → `aria-label="Open PayHere (opens in a new tab)"`.
- **State conveyance**: `Payment.jsx:156-171` step indicator current step → `aria-current="step"`.

### 7.4 Files verified, no change needed

`Layout.jsx` (skip link, aria-labels already present, no form controls), `Brand.jsx` (Logo link already `aria-label="VyGo home"`; used only with `link` default), `AiAssistant.jsx` (FAB `aria-expanded`/`aria-controls`, dialog label, message input `aria-label`, `role="log"`/`role="status"` already present), `NotFound.jsx` (no form controls or unlabeled interactive elements).

### 7.5 Still open (file:line)

| File:Line | Criterion | Finding |
| --- | --- | --- |
| `Home.jsx:293-302` | 4.1.2 State | Corridor chips still need `aria-pressed` — **owned by the Home agent**. |
| `Home.jsx:329-341, 463-476` | 4.1.3 | Results count + "Searching trips…" not in live regions — **owned by the Home agent**. |
| `Home.jsx:323, 395-399, 447, 358, 367` | 4.1.3 / 1.4.3 | Search error `role="alert"` + `text-slate-500` contrast — **owned by the Home agent**. |
| `Routes.jsx:186-208, 255-257, 337` | 4.1.2 / 4.1.3 / 1.4.3 | Filter buttons `aria-pressed`, live region, km-label contrast — **owned by the Routes agent**. |
| `RouteMap.jsx:208-211` | 1.1.1 / 2.4.4 | Legend `aria-hidden`, map text alternative — **owned by the Routes agent**. |
| `Payment.jsx:197-206` | 1.4.3 Contrast | `text-slate-500` boarding/drop-off labels 3.75:1 — class change, deferred. |
| `BookingDetail.jsx:176` | 1.4.3 Contrast | "Show this QR…" 3.75:1 — class change, deferred. |
| §3 residuals | — | `.btn-primary` white-on-primary 2.54:1; `--text-subtle` small-text usage; `primary-300` undefined in config; header overflow ≤360px; non-modal dialog; operator-chip avatar 3.74:1 — unchanged. |

### 7.6 Verification

`npm.cmd run build -- --outDir dist-verify-a11y` **succeeded** (Vite 5.4.21, 923 modules, built in 5.24s); `dist-verify-a11y/` was then deleted. Default `dist/` was not touched. Duplicate-id check (per-file `id="…"` scan across all edited files) found zero duplicates; the only dynamic ids are `AdminComplaints.jsx` complaint-scoped ids, which are unique per complaint.
