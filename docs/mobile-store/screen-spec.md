# VyGo — Google Play Screenshot Specification

Purpose: 6–8 screenshot frames for Google Play that walk a stranger from *problem* to
*QR-in-hand*. Every frame is a real screen in the React app (`frontend/src/pages/*`), so the
capture team can reproduce each one under a seeded demo account.

**Total deliverable**: 7 screenshots (Play allows up to 8; we ship 7 to stay above the "at least
2" floor but keep the CVR-tested set tight).

---

## 1. Output format & sizes

| Property | Value |
|----------|-------|
| Format | PNG (lossless), sRGB |
| Primary size | **1080 × 2320 px** (27:58 ratio — Play's recommended tall/portrait for modern phones) |
| Fallback size | 1080 × 2340 px if device preview shows letterboxing |
| Legacy-compatible | Also export a **1080 × 1920 px** set if targeting the full Play screenshot canvas in older consoles |
| Max count | 8 (we use 7) |
| Min dimension | 320 px wide for thumbnails; we far exceed |
| File size | target < 1.5 MB each |

Layout rules:
- Keep the **top 300 px safe** — it gets cropped/shortened in some shelves.
- No emoji in screenshot text; use plain English (si/ta localization later).
- Use the **dark slate `#0f172a` / slate-950 `#020617` background** that the app already renders;
  do not restyle screens. Teal `#2dd4bf` accent for callouts.
- Caption text goes in the top-third UI copy (real screenshot) or as an overlay bar — never crop
  into the tab bar area.

---

## 2. The 7 screenshot sequence

### Screenshot 1 — HERO: "Book your seat, skip the queue"
**Capture**: route `/` (Home) at phone viewport. Show the hero + search card with expressway chips
E01/E03, quick route pills, and the stat strip (146 routes · 16 operators).
**Caption (overlay, top-left)**: `Book Sri Lanka bus tickets in seconds`

### Screenshot 2 — DEEP SEARCH: "Filter, sort, pick the right bus"
**Capture**: Home search results after a seeded search. Use the URL pattern
`?from=Colombo&to=Kandy&date=<today>&type=EXPRESSWAY` for a real results list — capture with
bus-type select + road-type toggle visible.
**Caption**: `Compare SLTB & private operators, live fares and seat counts`

### Screenshot 3 — SEAT PICK (2D): "Choose your exact seat"
**Capture**: `/seat-select` in 2D view mode (mobile default). Show the 2D seat map grid with
Available/Selected/Locked/Booked states, seat chips, boarding point dropdown, and Continue button.
**Caption**: `Pick window or aisle — pick once, pay once`

### Screenshot 4 — SEAT PICK (3D): "Walk the aisle in 3D"
**Capture**: `/seat-select` in 3D mode — the GLB bus interior (Viking/Yutong-C12), seats rendered
in the cabin, selected seat lifted in cyan, HUD on the right.
**Caption**: `Look inside the actual coach before you book`

### Screenshot 5 — CHECKOUT: "Pay safe, lock your seat"
**Capture**: `/pay` — the Payment screen with trip summary (departure/arrival, operator, boarding
point names), seat list, total LKR, and the Pay Now / card button. (Do not capture the PayHere
sandbox page itself; capture the VyGo summary.)
**Caption**: `Secure pay with PayHere, seats held while you pay`

### Screenshot 6 — TICKET: "Your QR ticket, ready at the gate"
**Capture**: `/bookings/:ref` Booking Detail view for a CONFIRMED booking — itinerary, seat
numbers, and the QR e-ticket in the white card.
**Caption**: `Board with a QR e-ticket — verified by the conductor`

### Screenshot 7 — MY JOURNEYS: "All bookings, one place"
**Capture**: `/bookings` — the bookings list with status chips (Upcoming/Completed), booking
refs, route, boarding times, and quick access to tickets.
**Caption**: `Refunds, cancellations and updates in one inbox`

> Optional 8th: the assistant FAB (`Need help? Ask VyGo`) for AI trip planning — add if we
> later include location/seasonal copy.

---

## 3. Auto-count & order rationale

| Order | Frame | Goal | CTA |
|-------|-------|------|-----|
| 1 | Hero search | Trigger + block "bus tickets" | scroll |
| 2 | Results/filter | Comparison & trust signals | next |
| 3 | 2D seat map | Feature unveil | next |
| 4 | 3D bus | Wow / differentiate | next |
| 5 | Payment | De-risk money step | next |
| 6 | QR ticket | Closure proof | download tap |
| 7 | Bookings list | Retention / value | open |

1st screenshot is the conversion gate — keep it warm, real UI, no mock compositing. Frames 3+4 both
sell the same selector: keep 3D dominant because it is unavailable in competitors.

---

## 4. Concrete capture instructions for the QA/design team

1. **Login**: use a seeded passenger account with: exactly one CONFIRMED booking for `/bookings`
   capture, route with real seat map for `/seat-select`, a PENDING for `/pay` demo path.
2. **Date stability**: set QA clock to a fixed weekday; use seeded bus trips so result counts are
   stable across retakes.
3. **No staging**: verify no `Demo build` banner, no `sandbox`, no `dev` labels anywhere during
   capture (the header currently leaks dev copy in `Payment.jsx`; fix before release).
4. **Capture at 1x**: capture at device native resolution, then downscale to 1080 max-width; verify
   no blur or text cramming.
5. **Emulator**: Pixel 7 AVD, Android 14, 1080×2400 logical → crop to 1080×2320.
6. **Localization later**: keep all overlays in a Photoshop/figma file to allow si/Ta swaps without
   re-screenshoting the UI.

---

*Spec authored 2026-08-07 · consistent with `store-metadata.md` primary name and short description.*