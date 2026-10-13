# VyGo Design System — Expressway Remake

Additive design tokens + components for the E01/E03 expressway corridor
remake. All additions live in `frontend/src/index.css` (`@layer components`)
and `frontend/tailwind.config.js`. **Existing classes (`.card`, `.btn-*`,
`.input`, `.label`, `.badge`, `.fade-in`) are untouched and remain fully
supported.**

## Tokens

CSS custom properties are defined on `:root` in `frontend/src/index.css`.
Tailwind equivalents (e.g. `bg-expressway-600`, `rounded-card`,
`py-section`, `shadow-expressway-glow`) are generated from
`frontend/tailwind.config.js`.

| Token | Value | Notes |
| --- | --- | --- |
| `--expressway-300…900` | `#5eead4 … #134e4a` | Teal scale, distinct from primary emerald. 600 (`#0d9488`) is the anchor. |
| `--bg-base` | `#020617` | Page background (slate-950) |
| `--surface-1 / -2 / -3` | `#0f172a / #1e293b / #334155` | Cards → chips/inputs → raised/borders |
| `--border-default / --border-strong` | `#1e293b / #334155` | Card border / chip+input border |
| `--text-high / -mid / -muted / -subtle` | `#f1f5f9 / #cbd5e1 / #94a3b8 / #64748b` | Typography ramp |
| `--radius-tile / -card / -panel / -pill` | `0.75rem / 1rem / 1.5rem / 9999px` | 12px / 16px / 24px / pill |
| `--space-1 … -16` | `0.25rem … 4rem` | 4px grid |
| `--section-gap-sm / -gap / -gap-lg` | `3rem / 4.5rem / 6rem` | Section vertical rhythm |
| `--ring-color / -width / -offset` | `#2dd4bf / 2px / 2px` | Focus indicator |

## Components

### `.stat-tile` — metric card

```jsx
<div className="stat-tile">
  <p className="stat-tile-label">Trips this week</p>
  <p className="stat-tile-value">12,480</p>
</div>
```

Use `.stat-tile-value` (tabular numbers, high contrast) for the metric and
`.stat-tile-label` for the uppercase caption. Hover lifts the border.

### `.corridor-card` — expressway corridor card

```jsx
<a className="corridor-card focus-ring block" href="/routes/E01">
  <span className="expressway-badge">E01 · Expressway</span>
  <h3 className="section-title mt-3">Colombo → Katunayake</h3>
  <p className="mt-2 text-sm text-slate-400">45 min · AC Express</p>
</a>
```

Teal gradient accent bar across the top, teal border on hover. Corridor cards
are interactive — use a real `<a>`/`<button>` **or** add `.focus-ring` (and
`tabIndex` if a div) so the WCAG 2.2 focus indicator shows.

### `.expressway-badge`

Small teal badge. Composes with the existing `.badge` layout:
`className="badge expressway-badge"` works because `.badge` only sets layout
(no background/color).

### `.operator-chip` + `.operator-chip-avatar`

```jsx
<span className="operator-chip">
  <span className="operator-chip-avatar">SL</span>
  SLTB
</span>
```

Avatar circle (operator initials, 24px) + name. Hover lightens the chip.

### `.route-pill` (classic numbered route) / `.route-pill--expressway`

```jsx
<span className="route-pill">138</span>
<span className="route-pill route-pill--expressway">E01</span>
```

Monospace, compact. Classic routes stay neutral; expressway corridors use the
teal variant.

### `.section-title` + `.eyebrow`

```jsx
<div>
  <span className="eyebrow">Express corridors</span>
  <h2 className="section-title">Colombo ↔ Katunayake</h2>
</div>
```

`.eyebrow` is the small uppercase teal label; `.section-title` is the large
heading. Always use the pair in that order.

### `.trip-card` — enhanced trip result

```jsx
<div className="trip-card">
  <div className="flex justify-between">
    <span className="trip-card-time">07:30</span>
    <span className="trip-card-time">08:15</span>
  </div>
  <p className="trip-card-meta mt-1">Fort → Katunayake · Airport</p>
</div>
```

Times use `.trip-card-time` (tabular-nums, no jitter). Hover border shifts
toward expressway.

### `.divider` / `.divider--expressway`

```jsx
<hr className="divider" />
<hr className="divider--expressway" />
```

Neutral hairline, or an expressway-gradient hairline for corridor sections.

### Segmented control group (`role="group"` + `aria-pressed`)

The expressway-only / route-type toggles on Home and Routes are a button
group, **not** a native radio group: each button keeps `aria-pressed` so the
toggle state is announced, and the buttons are wrapped in a group labelled
by the visible (Home) or `sr-only` (Routes) caption.

```jsx
<div>
  <span id="road-type-label" className="label block">Road type</span>
  <div role="group" aria-labelledby="road-type-label" className="flex rounded-xl border border-slate-700 bg-slate-800/60 p-1">
    <button type="button" onClick={() => toggle('all')} aria-pressed={mode === 'all'}
      className="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors bg-primary-500 text-slate-950">
      All routes
    </button>
    <button type="button" onClick={() => toggle('expressway')} aria-pressed={mode === 'expressway'}
      className="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors text-slate-300 hover:text-white">
      Expressway only
    </button>
  </div>
</div>
```

- Active segment: `bg-primary-500 text-slate-950` (≈7.9:1, matches
  `.btn-primary`). Do **not** use `text-white` on `primary-500` (≈2.6:1 —
  fails AA for normal text).
- Inactive segment: `text-slate-300 hover:text-white`.
- Reuse the `.label` / `sr-only` id in `aria-labelledby`; never leave the
  group label-less.

## Color & contrast guidance (dark baseline)

All ratios are vs the page background (`--bg-base`, slate-950) unless noted.

| Pair | Ratio | Use |
| --- | --- | --- |
| `--text-high` on base | ≈18.4:1 | Headings, primary text |
| `--text-mid` on base | ≈12:1 | Secondary text |
| `--text-muted` on base | ≈7.9:1 | Labels, hints (AA normal text ✓) |
| `--text-subtle` on base | ≈4:1 | Large text / decorative icons only |
| `expressway-400` text on base | ≈10.8:1 | Eyebrows, links, icons |
| `expressway-300` on `surface-1` | ≈12.1:1 | Badge / pill text on tinted bg |
| Focus ring `#2dd4bf` on base | ≈10.8:1 | ≥ 2:1 required — passes WCAG 2.2 (2.4.11) |

Rules:

- **Never** set small text in `expressway-600` on dark surfaces — reserve it
  for decorative accents, borders, avatars, and gradient bars.
- Teal (expressway) is the *corridor* accent; emerald (primary) remains the
  *action* color (buttons, selected states). Keep them in those roles so the
  two never compete.
- Tinted surfaces (`bg-expressway-500/10`) are decorative; put actual text in
  `--text-high` / `--text-mid` with teal reserved for the badge/pill text.

### Text colors & the slate-500 override (removed)

The global `.text-slate-500 { color: #94a3b8; }` override that used to exist
in `index.css` was **deleted** — it silently re-mapped Tailwind's `slate-500`
app-wide and let caption text slip below AA contrast. Today:

- `text-slate-500` renders Tailwind's real `#64748b` (`--text-subtle`, ≈4:1) —
  **large text and decorative icons only**. Never use it for small captions.
- Captions, hints, and metadata use **`text-slate-400`** (`--text-muted`,
  `#94a3b8`, ≈7.9:1 — AA for normal text). This is the expressway pages'
  caption color (`trip-card-meta`, `stat-tile-label`, operator "+N more",
  corridor "Served towns"/"Operators" labels, empty-state help).
- Decorative icons may stay `text-slate-500`, but on dark surfaces
  `text-slate-400` reads better and is the convention on Home/Routes.
- Do **not** reintroduce a global color override; if a component needs muted
  text it should use `text-slate-400` explicitly.

## Page-section rhythm (expressway pages)

1. **Container**: `max-w-7xl mx-auto px-4` for all sections.
2. **Hero / search**: `py-section-lg` (96px), panel radius `rounded-panel`.
3. **Corridor strip** (E01/E03): `grid gap-4 md:grid-cols-2 lg:grid-cols-3`
   of `.corridor-card`, preceded by `.eyebrow` + `.section-title`.
4. **Stat band**: `grid grid-cols-2 lg:grid-cols-4 gap-4` of `.stat-tile`
   after the corridors.
5. **Classic routes**: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` of
   `.route-pill` groups; separate corridor and classic content with
   `.divider--expressway`.
6. **Results**: `.trip-card` list at `gap-3`, section gap `py-section`.
7. Reduced motion is already respected globally (`.fade-in`,
   active transforms) — keep any new animations behind
   `prefers-reduced-motion: reduce` guards.

## Notes for the UI Designer

- Everything above is **additive**: `.card`, `.btn-*`, `.input`, `.label`,
  `.badge`, `.fade-in` are byte-for-byte unchanged. Compose freely.
- Prefer the component classes + Tailwind utilities over new inline styles so
  tokens stay the single source of truth.
- Use `tabular-nums` anywhere times/prices repeat vertically (already built
  into `.stat-tile-value` and `.trip-card-time`).
- For clickable cards that are not native links/buttons, always add
  `.focus-ring` (outline, not clipped by `overflow: hidden`).

### On-demand generation (important!)

Tailwind 3 is a JIT compiler: component classes with class-only selectors
(like `.stat-tile`, `.corridor-card`, `.expressway-badge`) are emitted **only
when the exact class name appears in your JSX content** — exactly like the
existing `.card`/`.btn-primary` classes work today. This is by design:

- **Write the real class name in markup** — `className="stat-tile"` (not a
  string-built/concatenated variant) — and it will be generated. Variants and
  child classes (`.stat-tile-value`, `.route-pill--expressway`,
  `.corridor-card::before`) are emitted alongside their base class when the
  base appears.
- **Always-present by nature**: the `:root` custom properties and the global
  `:focus-visible` indicator are unlayered/base rules, so they ship in every
  build regardless of content.
- If a class ever seems "missing" after a page build, double-check the class
  name spelling in JSX — JIT simply won't emit an unused candidate.
- Do **not** add these classes to `safelist` in `tailwind.config.js` unless a
  class is genuinely dynamic (built from variables).
