# VyGo Brand & Tokens Document — Premium System

> **Guardian**: Brand Guardian · **Status**: v1.0 · **Scope**: Dark UI (Tailwind 3) + React Three Fiber 3D scene + "Live Routes & Bus Contacts" directory
> **Companion files**: `frontend/tailwind.config.js` (primary/expressway scales), `frontend/src/index.css` (semantic tokens, surfaces, focus ring).
> **Rule of the document**: Specifies intent. Do not edit source files to make the app "match" the document — treat it as the source of truth for future work and the review standard for existing work.

---

## 1. Brand Positioning

**Positioning paragraph.** VyGo is Sri Lanka's premium bus booking experience — the enterprise-grade platform that makes public transport feel like a private travel service. The brand layers Apple Vision Pro / Tesla-grade polish — calm dark surfaces, restrained motion, surgical typography — onto a deeply trusted, real-world network of operators, live routes, expressways (E01–E03) and bus classes (Normal → Super Luxury). "Luxury" for VyGo is *premium restraint*: confidence expressed through reduction, not decoration. It never means gold trim, fireworks, or visual noise. "Trustworthy" is expressed through exactness: precise money formatting (LKR 1,250), live route data, explicit seat states, honest error copy. The two coexist because both are the same value: *we respect your time and your money, so every pixel is deliberate and every promise is kept.*

**Three brand values**

| Value | Definition | Behavioral manifestation |
|---|---|---|
| **Precision** | Every number, seat, and fare is exact and legible | tabular numerals, LKR 1,250 formatting, explicit seat-state semantics, no vague copy |
| **Calm luxury** | Premium restraint — one accent per view, 90% neutral surfaces, controlled motion | sparse accent color budget, glass panels, cinematic not flashy animation |
| **Trust** | The platform behaves predictably and speaks honestly | consistent voice, honest error/empty states, WCAG AA contrast, non-color seat cues |

**How luxury + trust coexist**: the 3D scene may feel cinematic (a slow camera flyover, a bus pulling up to the platform), but the HUD that carries booking decisions is the calmest part of the UI. Cinematics are *atmosphere*; the transaction is *glass and typography*.

---

## 2. Color System

Two synchronized systems share the same source tokens:

- **Dark UI** — Tailwind `slate` surfaces + `primary`/`expressway` accents (already in `tailwind.config.js`).
- **3D scene** — identical hexes passed as Three.js colors; render through a physically consistent `ACESFilmicToneMapping`-style exposure so emerald/teal never clip to neon.

### 2.1 Primary teal family

The brand anchor is the existing `primary` (emerald-teal) scale; `expressway` (teal) is the corridor accent. All values are locked to the config.

| Token | Hex | Role in dark UI | 3D scene use | Contrast vs `slate-950` |
|---|---|---|---|---|
| `primary-300` | `#6ee7b7` | large highlights, success tints | light rim on selectable geometry | ≈13.2:1 |
| `primary-400` | `#34d399` | selected/hover accents, icons | emissive highlight, glow core | ≈10.5:1 |
| `primary-500` | `#10b981` | **Brand primary** — CTAs, active states | main emissive lane light, bus underglow | ≈7.9:1 (AA for all text) |
| `primary-600` | `#059669` | hover on primary, pressed | material base of accent objects | ≈5.3:1 (AA) |
| `expressway-300` | `#5eead4` | expressway badge text | E01/E03 signage glow | ≈13.6:1 |
| `expressway-400` | `#2dd4bf` | focus ring (`--ring-color`), eyebrows | route corridor pulse | ≈10.8:1 |
| `expressway-500` | `#14b8a6` | route pills, hover borders | corridor edge line | ≈8.1:1 |
| `expressway-600` | `#0d9488` | corridor top-rule, avatar fill | mid-distance haze | ≈5.4:1 |

**Guardrail**: `primary` is for *brand actions*; `expressway` is for *route/corridor semantics*. Never swap them.

### 2.2 Surfaces (dark baseline)

| Token | Hex | Tailwind | Usage | Contrast note |
|---|---|---|---|---|
| `bg-base` | `#020617` | `slate-950` | page background, 3D void | baseline |
| `surface-1` | `#0f172a` | `slate-900` | cards, tiles, panels | ≥1.85:1 vs base — sufficient for chrome, not for text alone |
| `surface-2` | `#1e293b` | `slate-800` | chips, inputs, hover fills | hover/raised |
| `surface-3` | `#334155` | `slate-700` | strong borders, raised dividers | structural, decorative only |
| `border-default` | `#1e293b` | `slate-800` | card borders | 1px, calm |
| `border-strong` | `#334155` | `slate-700` | input/chip borders, dividers | visible boundary |
| `glass` | see §4 | — | float panels over scene | must sit on ≥10% dark underlay |

### 2.3 Text tokens

| Token | Hex | Usage | Contrast vs `slate-950` | vs `slate-900` |
|---|---|---|---|---|
| `text-white` | `#f8fafc` | headings, HUD primary | ≈19:1 | ≈17.9:1 |
| `text-high` (`slate-100`) | `#f1f5f9` | body primary | ≈18.4:1 | ≈17.1:1 |
| `text-mid` (`slate-300`) | `#cbd5e1` | secondary text | ≈12:1 | ≈11.1:1 |
| `text-muted` (`slate-400`) | `#94a3b8` | labels, hints, captions | ≈7.9:1 | ≈7.3:1 |
| `text-subtle` (`slate-500`) | `#64748b` | disabled, de-emphasized | ≈4:1 | ≈3.7:1 |

**Contrast rule**: `slate-400` and lighter may be used for any text size (≥7:1). `slate-500` ≈4:1 passes AA only for large text (≥18.66px bold / 24px) and **WCAG-exempt disabled content** — never for essential instructions. `slate-600` and darker are decorative/structural only.

### 2.4 Seat-state semantics (single source of truth for 2D map AND 3D seats)

Seat colors are **reserved for seats** — they must never appear as page accents. Exact hexes:

| State | Hex | Name | 2D map fill | 3D material | Text on seat | Contrast vs `slate-900` | vs `slate-950` |
|---|---|---|---|---|---|---|---|
| Available | `#3b82f6` | blue | `#3b82f6` at 55–70% (rest), 100% hover | desaturated matte; brightens on hover | `#020617` | ≈4.9:1 | ≈5.5:1 |
| Selected | `#22c55e` | green | solid + check badge + glow | emissive lift + hover scale | `#020617` | ≈7.8:1 | ≈8.9:1 |
| Booked | `#ef4444` | red | `#ef4444` (non-interactive) | matte, dimmed, unlit | `#020617` | ≈4.7:1 | ≈5.4:1 |
| Locked | `#f97316` | orange | solid + lock glyph | pulsing rim (respect reduced-motion) | `#020617` | ≈6.4:1 | ≈7.2:1 |
| VIP | `#eab308` | gold | solid + crown glyph | metallic-ish roughness, no bloom | `#020617` | ≈9.3:1 | ≈10.5:1 |
| Ladies | `#ec4899` | pink | solid + person glyph | matte + soft rim | `#020617` | ≈5.1:1 | ≈5.7:1 |
| Accessible | `#a855f7` | purple | solid + wheelchair glyph | larger hit area + floor-mark cue | `#020617` | ≈4.5:1 | ≈5.1:1 |

**Text-on-seat rule**: seat numbers are always near-black `#020617` (≥4.5:1 on every state above; `#020617`-on-`#a855f7` ≈5.1:1 is the floor). Never white on the saturated seats — white on `#ef4444` is only ≈3.8:1.

**Colorblind / non-color cues (mandatory for 3D objects)**: color alone must never carry seat meaning. Each seat carries a **glyph + pattern + shape** cue rendered independently of hue:

| State | Glyph | Pattern / shape cue |
|---|---|---|
| Available | none (number only) | plain rectangle, low specular |
| Selected | ✓ check | scale-up + elevated plane + soft glow (brightness cue) |
| Booked | 🔒 lock icon (`FaLock`) | diagonal hash overlay (45°) across the seat face |
| Locked | 🔒 lock icon | dotted/segmented outline, subtle pulse |
| VIP | crown glyph | double outline border |
| Ladies | person glyph | paired vertical chevron `»»` at seat edge |
| Accessible | wheelchair glyph | circular seat footprint + floor contrasting zone |

Ships with a **legend that pairs icon + swatch + label** so the system reads in grayscale, duotone, and full color.

**State adjacency guardrail**: neighboring seats in the same row must differ in *lightness*, not just hue. Selected vs Available (green vs blue) pass; if a row mixes Locked (orange) and Booked (red), the glyphs carry the distinction — never rely on hue alone.

**Selected-vs-brand note**: `#22c55e` (selected) is close to `primary` emerald `#10b981` in green family. Keep them apart by never using `primary` fills inside the seat map — the check badge + elevation + glow on Selected is the separator. Reserve `primary` for buttons/CTAs outside the map.

---

## 3. Typography

**Stack** (matches `frontend/tailwind.config.js`): `font-sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']`. Inter is loaded by the app; fallback order lets Windows resolve Segoe UI and macOS SF Pro naturally.

```css
--font-sans: 'Inter', 'Segoe UI', 'SF Pro Text', -apple-system, BlinkMacSystemFont,
  'ui-sans-serif', 'system-ui', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
--font-mono: ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace;
```

**Scale** (4px grid; `tracking-tight` on display sizes, `tabular-nums` on all numbers):

| Step | Size / weight | Usage | Tone |
|---|---|---|---|
| `display` | 36–48px · extrabold · `tracking-tight` | hero headline over 3D scene | white |
| `page-title` | 30px · extrabold · `tracking-tight` | page headings (Routes, Contacts) | white |
| `section-title` | 24px · bold · `tracking-tight` | section headers | `slate-50` |
| `card-title` | 18–20px · semibold | trip/operator cards | `slate-50` |
| `body` | 14–16px · regular · `leading-relaxed` | paragraphs, descriptions | `slate-100/300` |
| `hud` | 14px · semibold · `tabular-nums` | float-panel values, fares, times | white / `slate-300` |
| `label` | 10–12px · semibold · `uppercase tracking-widest` | eyebrows, field labels, seat legend | `slate-400` / `expressway-400` |
| `seat-no` | 12–14px · bold · `font-mono tabular-nums` | seat numbers, route pills | per seat contrast rule |

**Rules**: numbers are always `tabular-nums` (fares, seats, times, distances). Labels are uppercase-tracking (never body copy). HUD values are semibold white on glass; supporting text `slate-300`. No script, display, or "techy" fonts.

---

## 4. Glassmorphism Recipe (HUD / float panels)

Glass sits over the 3D scene and over `slate-950` backgrounds. It is **always a translucent dark layer** — never colored glass. Underlying content must carry ≥10% dark opacity below the glass (the scene vignette + `--shadow` provides this).

```css
/* Base recipe */
.glass {
  background: rgba(15, 23, 42, 0.55);       /* slate-900 @ 55% */
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(148, 163, 184, 0.14); /* slate-400 @ 14% */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),   /* top inner highlight */
    0 24px 48px -12px rgba(2, 6, 23, 0.6);      /* deep soft drop */
}
```

**Three variants**

| Variant | Blur / saturate | bg rgba | border rgba | shadow | radius | Used for |
|---|---|---|---|---|---|---|
| **Panel** | `blur(24px) saturate(160%)` | `rgba(15,23,42,0.55)` | `rgba(148,163,184,0.14)` | `inset 0 1px 0 rgba(255,255,255,0.06)` + `0 24px 48px -12px rgba(2,6,23,0.6)` | `1.5rem` (`--radius-panel`) | HUD float panel, seat summary, booking bar |
| **Chip** | `blur(16px) saturate(150%)` | `rgba(30,41,59,0.6)` | `rgba(148,163,184,0.16)` | `0 4px 12px rgba(2,6,23,0.35)` | `9999px` (pill) or `0.75rem` (tile) | seat legend chips, route pills, live badges |
| **Modal** | `blur(32px) saturate(180%)` | `rgba(2,6,23,0.72)` | `rgba(148,163,184,0.18)` | `0 40px 80px -16px rgba(2,6,23,0.8)` + `inset 0 1px 0 rgba(255,255,255,0.08)` | `1rem` (`--radius-card`) | dialogs, confirmations, seat-detail popover |

**Implementation notes**
- Always pair `-webkit-backdrop-filter` with the standard property (Safari/older Chrome).
- If `backdrop-filter` is unsupported, the `rgba` fill alone must remain readable (it does — ≥1.7:1 over `slate-950`).
- Never apply glass to interactive inputs on Windows Chrome where blur can jank; fall back to `surface-2` solid.
- Glass edges: 1px border only, no outer glow on panels — glow is for *active* seats and *selected* corridors only.

---

## 5. Motion Language

### 5.1 Duration scale

| Token | Duration | Range | Used for |
|---|---|---|---|
| `fast` | **120ms** | hovers, focus rings, press states, seat hover brighten | micro-feedback; must feel instant |
| `base` | **240ms** | panel fade/slide, tab switches, seat state change, toast in/out | default UI transition |
| `slow` | **480ms** | section reveals, list reorder, modal entrance, corridor emphasis | scene-to-content handoffs |
| `cinematic` | **900–9000ms** | 3D camera intro, bus pull-up, route flyover | atmosphere only — never carries information |

### 5.2 Easing tokens

| Token | Value | Used for |
|---|---|---|
| `easeOut` | `cubic-bezier(0.16, 1, 0.3, 1)` | all UI entrances/exits, panel float-in, hover states — "arrive and settle" |
| `power3.inOut` | `cubic-bezier(0.87, 0, 0.13, 1)` | 3D camera moves, long cinematic pans, bus pull-up — no ease-in-out on UI |
| `spring-ui` | `stiffness: 300, damping: 30, mass: 1` | small interactive elements (seat selection pop, toggle) |
| `spring-entrance` | `stiffness: 120, damping: 20, mass: 1` | modal/panel entrance, subtle overshoot of brand moments only |

### 5.3 When to use which

- **UI micro-interactions** (< 300ms): hovers, focus, press, seat brighten, toggle — `fast`/`base` + `easeOut`.
- **Transitions** (240–480ms): panel show/hide, tab changes, selection feedback — `base`/`slow` + `easeOut`; never animate layout-shifting content without purpose (collapse/expand is allowed once per action, 240ms).
- **Cinematics** (3–9s): exactly three sanctioned moments — 3D intro "Preparing your bus…", route flyover in Live Routes, and the booking-complete celebratory pull-up. Keep camera velocity constant; decelerate with `power3.inOut`.
- **Reduced motion**: honor `prefers-reduced-motion: reduce` — render a static frame (as `HeroScene3D.jsx` already does), fade-only at ≤300ms, no continuous pulses, no camera travel.

### 5.4 Rules (non-negotiable)

1. UI < 300ms, cinematic 3–9s — nothing in between as a default.
2. Never animate layout-shifting content without purpose; never reflow text, grids, or seats during reading.
3. Motion communicates **state** (selected, locked, loading) — it is never decorative noise.
4. One motion idea per view: a hero cinematic OR a panel entrance, not both simultaneously.
5. Spring overshoot only on micro-elements; panels and modals settle with `easeOut`, no bounce.

---

## 6. Naming & Copy Voice

**Voice**: calm, exact, assured — a well-run airline counter, not a carnival announcer. Short sentences. No hype adjectives ("amazing", "incredible"). Numbers are facts; facts build trust.

**Money formatting (consistent everywhere)**
- Always `LKR` + non-breaking space + thousands separator, no decimals: **`LKR 1,250`**, **`LKR 42,000`**.
- Totals: `Total · LKR 5,000`. Never "Rs.", "Rs", "LKR5000", or "LKR 1,250.00".

**Bus classes** (capitalized, never lowercase slang)
- `Normal`, `AC` (not "A/C"), `Luxury`, `Super Luxury`.
- Copy: "Super Luxury · AC · 36 seats".

**Expressways**
- Full: `Southern Expressway (E01)`, `Outer Circular Expressway (E02)`, `Colombo–Katunayake Expressway (E03)`.
- Compact: `E01 · Southern Expressway` (badge/pill). Never "Sth. Exp.", "E-1", or "Southern Express Way".

**Product voice samples**

| Context | Copy |
|---|---|
| Success | "Your seats have been successfully reserved." |
| Success (with amount) | "Payment successful. LKR 5,000 — receipt sent to your email." |
| Error | "We couldn't complete your booking. Please check the details and try again." |
| Error (seat conflict) | "Seat 12 is no longer available. Please select another seat." |
| Empty (routes) | "No buses found on this route today. Try adjusting your travel date." |
| Empty (contacts) | "No operators are listed for this route yet. Check back soon." |
| 3D intro | "Preparing your bus…" → "Your journey awaits." |
| Loading seats | "Loading seats…" |
| Locked seat | "Seat 12 is reserved for another passenger until 2:30 PM." |
| CTA (primary) | `Book Now` · `Reserve Seats` · `Continue to Payment` · `Select Seats` |
| CTA (secondary) | `View Live Routes` · `Download Route Map` |
| Tab names | `Live Routes` · `Bus Contacts` · `Schedules` · `My Bookings` |
| Nav/helper | "Live" (dot + text, never "LIVE!!" or "hot") |

**Microcopy style rules**
- Buttons are verb-first, two words max: `Book Now`, `Reserve Seats`.
- Ellipsis `…` for in-progress states only (`Preparing your bus…`).
- No exclamation marks except true celebratory moments; no emoji in UI copy — icons are vector glyphs from the brand set.
- Titles: sentence case ("Live routes", "Bus contacts") for body; tabs stay title case.

---

## 7. Anti-Patterns (what looks cheap/unbranded)

| Anti-pattern | Why it breaks the brand | Guardrail |
|---|---|---|
| Over-saturation / neon clamps | Scene + UI start glowing; calm luxury dies | Keep emissives ≤ 1.0–1.2 EV above mid-gray; clamp materials via tone mapping; never raise scene saturation |
| Rainbow gradients | Multi-hue gradients read "public transport ad", not premium | One gradient per view max, and only within the `primary`/`expressway` family (emerald→teal); never violet/red/cyan mixes |
| Excessive bloom | Every light blooming = garish; loses the one highlight that matters | Bloom only on selected seats, brand emissives, and the horizon line; reduce in HUD-heavy views |
| Clashing neon accents | Pink/purple/orange page chrome competes with seat semantics | The seat palette (§2.4) is **seat-only**; page accents come from the primary family only |
| Emoji in UI copy | Breaks typographic calm and renders inconsistently | No emoji; use inline SVG icon set (fa/heroicons) for glyphs |
| "Luxury trap" (gold everything, bevels, glossy skeuomorphism) | Fake premium — cheap in seconds | VIP gold is a *seat state*, not a page theme; flat surfaces + restrained glass only |
| All-caps shouting / mixed-case slang (`BOOK NOW!`, "ac bus") | Erases enterprise trust | Labels uppercase-tracked at ≤12px; body sentence case; bus classes per §6 |
| More than one accent color per view | Fragmentation — the core brand sin | 90/10 budget: ~90% neutrals, ~10% accent; one accent family per screen |
| Layout-shifting animation | Reflowing text mid-read breaks trust and triggers motion sickness | Motion rules §5.4; animate opacity/transform only |
| Disabled = low-contrast gray | Suggests brokenness, not availability | Use `slate-500` for disabled (AA-large ok) + keep label text nearby |
| Unbranded third-party chrome (default browser styles, unfocused focus rings) | Breaks polish at the edges | Global `:focus-visible` ring (`--ring-color: #2dd4bf`, 2px, 2px offset) on everything custom |

**The single sentence**: *If a choice adds noise, saturation, or shine that the transaction didn't ask for, cut it — VyGo earns "premium" by removing, not adding.*

---

## Appendix A — Token Table (quick reference)

| Group | Token | Value |
|---|---|---|
| Brand | `primary-500` | `#10b981` |
| Brand accent | `expressway-400` | `#2dd4bf` |
| Surface base | `bg-base` | `#020617` |
| Surface 1 | `surface-1` | `#0f172a` |
| Surface 2 | `surface-2` | `#1e293b` |
| Surface 3 | `surface-3` | `#334155` |
| Text high | `text-high` | `#f1f5f9` |
| Text muted | `text-muted` | `#94a3b8` |
| Seat · Available | — | `#3b82f6` |
| Seat · Selected | — | `#22c55e` |
| Seat · Booked | — | `#ef4444` |
| Seat · Locked | — | `#f97316` |
| Seat · VIP | — | `#eab308` |
| Seat · Ladies | — | `#ec4899` |
| Seat · Accessible | — | `#a855f7` |
| Radius · tile/card/panel | — | `0.75rem / 1rem / 1.5rem` |
| Radius · pill | — | `9999px` |
| Shadow · corridor glow | — | `0 8px 24px -8px rgba(13,148,136,0.4)` |

## Appendix B — Motion Quick Rules

- **Durations**: fast 120ms · base 240ms · slow 480ms · cinematic 900–9000ms.
- **Easing**: UI `easeOut cubic-bezier(0.16,1,0.3,1)`; camera `power3.inOut`; springs only for micro-interactions.
- **Thresholds**: UI < 300ms; cinematic 3–9s; never animate layout-shifting content without purpose; honor `prefers-reduced-motion` (static frame + ≤300ms fades only).
