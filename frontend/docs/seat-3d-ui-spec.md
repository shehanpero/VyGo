# VyGo 3D Seat-Booking UI Spec

**Consumer:** 3D agent implementing the React Three Fiber seat-booking scene.
**Source of truth (classes):** `frontend/src/index.css` — glass HUD utilities are ADDITIVE and already shipped.
**Palette reference:** `primary` (emerald: `400 #34d399`, `500 #10b981`, `600 #059669`), `expressway` (teal: `400 #2dd4bf`, `500 #14b8a6`), `slate` neutrals (`950 #020617`, `900 #0f172a`, `800 #1e293b`, `700 #334155`, `400 #94a3b8`, `300 #cbd5e1`, `100 #f1f5f9`).
**Coordinate with Brand Guardian:** glass recipe is locked — `backdrop-filter: blur(14px)`, bg `rgba(15,23,42,0.55)`, border `rgba(255,255,255,0.12)`, radius 20px, soft shadow.

---

## 0. Glass utility contract (already in `index.css`)

| Class | Purpose | Notes |
|---|---|---|
| `.glass` | Base glass surface | blur(14px) + `rgba(15,23,42,0.55)` bg + `rgba(255,255,255,0.12)` 1px border + `border-radius: 20px` + `0 20px 60px -20px rgba(0,0,0,0.6)` shadow |
| `.glass-panel` | Floating panel | Composes with `.glass` (`className="glass glass-panel"`); `@apply rounded-[24px] p-6` |
| `.hud-chip` | Small pill chip | `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-200`, glass bg, `rgba(255,255,255,0.1)` border, blur |
| `.seat-legend-dot` | 10px round swatch | `h-2.5 w-2.5 shrink-0 rounded-full border border-white/25` — always pair with a `bg-[#hex]` arbitrary utility |
| `.seat-glow` | Selected-seat glow | `box-shadow: 0 0 12px 2px rgba(34,197,94,0.55)` — matches Selected green `#22c55e` |
| `.hud-scroll` | Thin scrollbar | `::-webkit-scrollbar` 6px, thumb `#334155` (slate-700), transparent track — overrides the global 10px bar |
| ~~`.confetti-fallback`~~ | **Intentionally skipped** | SuccessScene uses canvas confetti — do NOT add or style this class |

Do not modify any existing class in `index.css`. All state colors below use Tailwind arbitrary utilities (`bg-[#3b82f6]`, etc.) so **no new CSS is required**.

---

## 1. Floating booking panel

### 1.1 Responsive behavior

| Breakpoint | Layout |
|---|---|
| Mobile `< 768px` | **Bottom sheet** — fixed `inset-x-0 bottom-0`, `rounded-t-[24px] rounded-b-none`, `p-4`, `max-h-[72dvh]`, scrolls internally, safe-area bottom padding. Sits above the 3D canvas. |
| Desktop `md+` | **Right-side floating panel** — fixed `right-4 top-1/2 -translate-y-1/2`, `w-[360px]`, `max-h-[calc(100dvh-2rem)]`, `rounded-[24px] p-6`, scrolls internally. |

Single responsive element (preferred — one panel, breakpoint classes switch placement):

```jsx
<aside
  aria-label="Seat booking panel"
  className="glass glass-panel hud-scroll fixed inset-x-0 bottom-0 z-30 max-h-[72dvh] overflow-y-auto rounded-b-none rounded-t-[24px] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-auto md:right-4 md:top-1/2 md:-translate-y-1/2 md:w-[360px] md:max-h-[calc(100dvh-2rem)] md:rounded-[24px] md:p-6"
>
  {/* sections below */}
</aside>
```

Fallback if one panel is impractical: two fixed siblings — mobile sheet `md:hidden`, desktop panel `hidden md:block`.

### 1.2 Trip header

```jsx
<header className="flex items-start justify-between gap-3">
  <div className="min-w-0">
    <h2 className="text-base font-bold text-slate-100">{from} → {to}</h2>
    <p className="mt-0.5 text-xs text-slate-400">Departs {time}</p>
  </div>
  {/* Classic numbered route, e.g. 138 → route-pill; expressway E01/E03 → route-pill route-pill--expressway */}
  <span className="route-pill route-pill--expressway shrink-0" aria-label={`Route ${routeNumber}`}>{routeNumber}</span>
</header>
```

### 1.3 Meta rows — departure / operator / bus registration

```jsx
<dl className="mt-4 space-y-2.5">
  <div className="flex items-center justify-between gap-3">
    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Departure</dt>
    <dd className="text-sm font-semibold text-slate-100 tabular-nums">{departureTime}</dd>
  </div>
  <div className="flex items-center justify-between gap-3">
    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Operator</dt>
    <dd className="text-sm font-medium text-slate-100">{operatorName}</dd>
  </div>
  <div className="flex items-center justify-between gap-3">
    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Bus</dt>
    <dd className="font-mono text-sm font-medium text-slate-100 tabular-nums">{busReg}</dd>
  </div>
</dl>
```

### 1.4 Boarding + dropoff selectors

Use the existing `.label` + `.input` classes. **a11y ids are contract:** `boarding-stop` and `dropoff-stop` (must match labels `htmlFor`). Two-up on `sm+`, stacked on mobile.

```jsx
<div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
  <div>
    <label htmlFor="boarding-stop" className="label">Boarding</label>
    <select id="boarding-stop" name="boarding-stop" className="input" aria-label="Boarding stop" defaultValue="">
      <option value="" disabled>Select stop…</option>
      {/* options: stop name + pickup time */}
    </select>
  </div>
  <div>
    <label htmlFor="dropoff-stop" className="label">Dropoff</label>
    <select id="dropoff-stop" name="dropoff-stop" className="input" aria-label="Dropoff stop" defaultValue="">
      <option value="" disabled>Select stop…</option>
      {/* options: stop name + dropoff time */}
    </select>
  </div>
</div>
```

### 1.5 Selected-seat chips row

`hud-chip` pills, each with a `.seat-legend-dot` swatch in the **Selected green** (`#22c55e`) plus `.seat-glow`; removable via an `×` button.

```jsx
<div className="mt-5">
  <p className="label" id="selected-seats-label">Selected seats</p>
  <div className="flex flex-wrap items-center gap-2" role="list" aria-labelledby="selected-seats-label">
    {selectedSeats.map((seat) => (
      <span key={seat.id} role="listitem" className="hud-chip">
        <span className="seat-legend-dot bg-[#22c55e] seat-glow" aria-hidden="true" />
        {seat.label}
        <button
          type="button"
          aria-label={`Remove seat ${seat.label}`}
          className="-mr-1 ml-0.5 grid h-4 w-4 place-items-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
          onClick={() => onRemoveSeat(seat.id)}
        >×</button>
      </span>
    ))}
  </div>
</div>
```

Empty selection: render a single muted chip — `<span className="hud-chip text-slate-400">No seats selected</span>`.

### 1.6 Divider + passenger count + total

```jsx
<div className="divider my-4" role="separator" />

<div className="flex items-baseline justify-between gap-3">
  <span className="text-sm text-slate-300">{passengerCount} passengers</span>
  <span className="text-2xl font-bold text-primary-400 tabular-nums">Rs. {total.toFixed(2)}</span>
</div>
```

The total is the **large primary number** — `text-2xl font-bold text-primary-400 tabular-nums` (`primary-500` also acceptable; `400` reads better on dark glass).

### 1.7 Footer — camera controls, mute, Book Now

```jsx
<footer className="mt-5 space-y-3">
  <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Camera controls">
    <button type="button" className="btn-secondary px-1 py-2 text-[11px]" onClick={onRotate}>Rotate</button>
    <button type="button" className="btn-secondary px-1 py-2 text-[11px]" onClick={onZoomIn}>Zoom in</button>
    <button type="button" className="btn-secondary px-1 py-2 text-[11px]" onClick={onZoomOut}>Zoom out</button>
    <button type="button" className="btn-secondary px-1 py-2 text-[11px]" onClick={onPan}>Pan</button>
    <button type="button" className="btn-secondary px-1 py-2 text-[11px]" onClick={onResetCamera}>Reset</button>
  </div>
  <div className="flex items-center justify-between gap-3">
    <button
      type="button"
      className="btn-secondary px-3 py-2.5 text-sm"
      onClick={onToggleMute}
      aria-pressed={muted}
    >
      {muted ? 'Sound off' : 'Sound on'}
    </button>
    <button
      type="button"
      className="btn-primary flex-1"
      disabled={selectedSeats.length === 0}
      onClick={onBookNow}
    >
      Book Now{selectedSeats.length > 0 ? ` · ${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''}` : ''}
    </button>
  </div>
</footer>
```

Note: utility classes (`px-1 py-2 text-[11px]`) are in the `utilities` layer and therefore override `btn-secondary`'s component padding/size without `!important`.

---

## 2. Seat legend — 7 states

Legend dots use `.seat-legend-dot` + a `bg-[#hex]` arbitrary utility. **These hexes are the contract** — use the same values for the WebGL seat mesh materials.

| State | Color | Hex | Class |
|---|---|---|---|
| Available | Blue | `#3b82f6` | `seat-legend-dot bg-[#3b82f6]` |
| Selected | Green | `#22c55e` | `seat-legend-dot bg-[#22c55e] seat-glow` |
| Booked | Red | `#ef4444` | `seat-legend-dot bg-[#ef4444]` |
| Locked | Orange | `#f97316` | `seat-legend-dot bg-[#f97316]` |
| VIP | Gold | `#eab308` | `seat-legend-dot bg-[#eab308]` |
| Ladies | Pink | `#ec4899` | `seat-legend-dot bg-[#ec4899]` |
| Accessible | Purple | `#a855f7` | `seat-legend-dot bg-[#a855f7]` |

Legend panel (floating, glass, 2-col grid; 4-col on `sm`, back to 2-col on `md` to fit the side panel column):

```jsx
<div className="glass rounded-2xl p-3" role="complementary" aria-label="Seat legend">
  <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Legend</p>
  <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 md:grid-cols-2">
    {legendItems.map(({ state, hex }) => (
      <li key={state} className="flex items-center gap-1.5">
        <span className={`seat-legend-dot bg-[${hex}]`} aria-hidden="true" />
        <span className="text-xs text-slate-300">{state}</span>
      </li>
    ))}
  </ul>
</div>
```

Placement:
- **Desktop (`md+`):** `fixed bottom-4 left-4 z-20 w-56`.
- **Mobile:** collapsible inside the bottom sheet — `<details className="mt-4">` with a `hud-chip` summary "Seat legend"; keeps the sheet uncluttered.

---

## 3. Intro overlay (cinematic)

Full-screen glass loader over the scene while the bus model/seat map loads. Status captions swap during the cinematic; each caption uses the existing `.fade-in` animation (300ms). Total cinematic ≤ 4s; with `prefers-reduced-motion`, skip straight to the map (existing CSS already disables `.fade-in`).

```jsx
<div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60" role="status" aria-live="polite">
  <div className="glass glass-panel flex w-[280px] flex-col items-center gap-4 text-center">
    <div
      className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-primary-400"
      aria-hidden="true"
    />
    <div>
      <p className="text-sm font-semibold text-slate-100">Preparing your bus…</p>
      <p key={caption} className="mt-1 text-xs text-slate-400 fade-in">{caption}</p>
    </div>
    <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={onSkipIntro}>
      Skip intro
    </button>
  </div>
</div>
```

- **Skip intro placement:** primary action at the bottom of the loader card (above). Optional ghost skip pinned top-right of the overlay: `<button className="btn-secondary absolute right-4 top-4 px-3 py-2 text-xs">Skip intro</button>`.
- **Caption sequence (examples):** "Loading bus model…" → "Placing seats…" → "Applying interior materials…" → "Calibrating camera…" → "Ready".
- Reuse the same overlay for initial data fetch errors (swap content per §5).

---

## 4. Success scene

After booking succeeds, show a full-screen overlay (dims the 3D scene) with the QR ticket + CTA. Confetti is **canvas-based** in the SuccessScene — brand colors only. `.confetti-fallback` is deliberately unused.

```jsx
<div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/70 backdrop-blur-sm">
  <div className="flex min-h-full items-center justify-center p-4">
    <div className="w-full max-w-sm">
      {/* success headline */}
      <p className="text-center text-2xl font-bold text-slate-50 fade-in">Booking confirmed!</p>
      <p className="mt-1 text-center text-sm text-slate-400">Show this QR when boarding.</p>

      {/* QR ticket card */}
      <div className="glass glass-panel hud-scroll mt-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100">{from} → {to}</p>
            <p className="mt-0.5 text-xs text-slate-400">Route {routeNumber} · Departs {time}</p>
          </div>
          <span className="route-pill route-pill--expressway shrink-0">{routeNumber}</span>
        </div>
        <div className="divider my-4" />
        <div className="mx-auto grid w-fit place-items-center rounded-2xl border border-white/10 bg-white p-3">
          <img src={qrUrl} alt="Boarding QR code" className="h-40 w-40" />
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <span className="text-sm text-slate-300">{seatCount} passengers · {seatLabels}</span>
          <span className="text-xl font-bold text-primary-400 tabular-nums">Rs. {total.toFixed(2)}</span>
        </div>
      </div>

      <button type="button" className="btn-primary mt-5 w-full" onClick={onContinueToPayment}>
        Continue to Payment
      </button>
    </div>
  </div>
</div>
```

**Confetti palette (brand only):** `['#10b981', '#34d399', '#2dd4bf', '#22c55e', '#eab308', '#f1f5f9']` — primary emerald, expressway teal, selected green, gold, and a slate-100 sparkle.

---

## 5. Empty / error / 409 states

All states reuse `.glass` + existing classes. **No new CSS.**

### 5.1 Missing trip (no trip data before 3D)

```jsx
<div className="glass glass-panel mx-auto w-full max-w-sm text-center" role="status">
  <p className="text-sm font-semibold text-slate-200">No trip selected</p>
  <p className="mt-1 text-xs text-slate-400">Choose a trip from the search results to load the seat map.</p>
  <button type="button" className="btn-secondary mt-4 w-full" onClick={onBackToSearch}>Back to search</button>
</div>
```

### 5.2 Seat-map empty (API returned no seats)

Render in place of the seat grid inside the booking panel body:

```jsx
<div className="py-8 text-center" role="status">
  <p className="text-sm font-semibold text-slate-200">Seat map unavailable</p>
  <p className="mt-1 text-xs text-slate-400">Seats are not assigned for this bus yet.</p>
</div>
```

Disable `Book Now` and clear the selected-seats chips.

### 5.3 Seats-taken / 409 conflict (stale selection)

Glass toast with a red accent bar. `role="alert"` + insertion announcement; give the toast `tabIndex={-1}` and focus it on mount so SRs announce immediately. On 409: remove the conflicted seat from selection, re-fetch the seat map, re-render chips.

```jsx
<div
  ref={toastRef}
  tabIndex={-1}
  role="alert"
  className="glass fade-in fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border-l-4 border-l-red-500 px-5 py-4"
>
  <p className="text-sm font-semibold text-red-300">Seat {conflictedSeat} was just booked</p>
  <p className="mt-0.5 text-xs text-slate-400">Pick another seat or refresh the map.</p>
</div>
```

Generic error variant (network failure, etc.): same toast without the red accent bar, `text-slate-200` headline, auto-dismiss after 5s.

---

## 6. Implementation notes (a11y + polish)

- **z-index scale:** scene canvas `0` → legend `20` → booking panel `30` → intro/success overlays `40` → toast `50`.
- **Focus:** rely on the global `:focus-visible` ring (teal, 2px/2px) — already WCAG 2.2 AA. Ensure overlay content traps focus (set `inert` on the scene + panel while an overlay is open).
- **Reduced motion:** existing CSS disables `.fade-in` and button scale under `prefers-reduced-motion`; also skip the intro cinematic and camera auto-rotate.
- **Numbers:** all money/time/seat figures use `tabular-nums`.
- **Labels/ids contract:** `boarding-stop`, `dropoff-stop`, `selected-seats-label`, panel `aria-label="Seat booking panel"`, legend `role="complementary"`, toasts `role="alert"`.
- **Safe areas:** bottom sheet reserves `env(safe-area-inset-bottom)` (already in the container recipe, §1.1).
