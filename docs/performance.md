# VyGo Frontend — Performance Audit & Build Optimization

> Scope: `frontend/` (React 18 + Vite 5 + Tailwind 3 SPA). The backend is Spring Boot; this document covers **client-side** weight and delivery, not server metrics. Baseline and "after" numbers are from `npm run build` output (`vite v5.4.21`) on 2026-08-03.

---

## 1. Current page-weight drivers (baseline)

### 1.1 Route-splitting posture — already good

`src/main.jsx` already lazy-loads 17 of 18 routes via `React.lazy`/`Suspense`. Only **Home** is eager. That is the right shape: the passenger/operator/admin/conductor flows are already code-split, so a passenger never downloads recharts or admin code. The remaining work is about *what goes in each chunk and how long it stays cached*.

### 1.2 Critical-path (eager) weight drivers

The eager graph is `Home` + `Layout` + `AuthContext` + `ProtectedRoute` + `Brand` + `AiAssistant`, which transitively pulls in:

| Driver | Why it's on the first paint | Weight (min / gz) |
|---|---|---|
| React 18 + `react-dom` | Foundation, unavoidable | inside `index` chunk below |
| `react-router-dom` + `@remix-run/router` | Routing + `AuthContext` guards | inside `index` chunk below |
| **axios** (`src/api/client.js`) | Eager `AuthProvider` calls `/auth/me` | ~48 kB / ~19 kB |
| `react-icons/fa` | `Layout` + `Home` use icons (tree-shaken, but in path) | ~30 kB / ~10 kB |
| App code (Home, Layout, context, routes, Tailwind components) | — | ~30 kB / ~9 kB |

### 1.3 Lazy route payloads

| Route(s) | Heavy dependency | Why it's heavy |
|---|---|---|
| `/admin`, `/operator/reports` | **recharts** + d3 graph (shared) | ~383 kB min / ~106 kB gz — only downloaded by admin/reports users |
| `/seat-select` and ticket flows | `qrcode.react` | **installed but not imported anywhere yet** (dead weight in the dependency graph, not in the bundle) |
| Every page | `react-icons` | imported in ~all pages; tree-shaken to used icons, but the shared icon graph crosses eager + lazy boundaries |
| `/routes` (future) | `react-leaflet` / `leaflet` | **not installed yet** — plan the lazy import before adding it |

### 1.4 Non-JS weight (the biggest single payload on the site)

| Asset | Size | Problem |
|---|---|---|
| `public/image.jpg` (hero on Home) | **1,112,472 B (~1.06 MiB)** | Raw JPEG, no responsive/WebP/AVIF derivative, no `width`/`height`, no `fetchpriority`. It is the likely **LCP element** on mobile and dwarfs the entire JS bundle. |
| `public/vygoicon.png` | 167,050 B | App icon way oversized for a favicon (needs ~64 px + SVG maskable). |
| Tailwind CSS (`index-*.css`) | 33.7 kB / 6.4 gz | Fine. No action needed. |

### 1.5 Baseline build log (before this change)

```
assets/index-TPw5XEJH.js      273.65 kB │ gzip:  91.02 kB   ← React+router+axios+icons+ALL app code in one chunk
assets/AreaChart-CAycPMY8.js  383.14 kB │ gzip: 105.66 kB   ← recharts+d3, auto-named shared chunk
assets/<21 page chunks>        0.65–11.48 kB                 ← lazy routes (good)
assets/index-*.css             33.68 kB │ gzip:   6.42 kB
```

**Problem:** the entire vendor graph lives in the entry `index` chunk. Every app-code deploy changes `index-*.js` and re-downloads ~274 kB of React/router/axios that never changed. The recharts chunk is auto-named (`AreaChart-*`), so its filename is unstable to refactors.

---

## 2. The change made — `frontend/vite.config.js`

### 2.1 `build.rollupOptions.output.manualChunks`

Added stable vendor chunk families (function form, applied to `node_modules` only; app code stays in entry chunks):

| Chunk | Contents | Notes |
|---|---|---|
| `react-vendor` | react, react-dom, scheduler, react-router, react-router-dom, @remix-run/router, loose-envify | Eager — the React core. Changes only when React/router upgrades. |
| `charts` | recharts, recharts-scale, react-smooth, victory-vendor, d3-\*, internmap, clsx, decimal.js-light, eventemitter3, lodash, prop-types, react-is, react-transition-group, dom-helpers, fast-equals, tiny-invariant, @babel/runtime | Lazy — only `/admin` + `/operator/reports`. Fully self-contained so Rollup emits no circular-chunk warning. |
| `icons` | react-icons (all subpaths) | Crosses eager + lazy; stable cache unit. |
| `http` | axios | Eager via `AuthContext`; rarely changes, so it deserves its own immutable-cache unit. |
| `qrcode` | qrcode.react | Emits nothing today (unused dep); ready for ticket/QR flows. |
| `leaflet` | leaflet, react-leaflet | Emits nothing today (not installed); ready for the Routes map work. |

Implementation notes:
- **d3- packages must be matched as `d3-[^/]+`** (the names are `d3-shape`, `d3-path`, …). A naive `d3-\/` never matches and silently dumps all of d3 into the generic vendor bucket, splitting the recharts graph and triggering Rollup's `Circular chunk` warning.
- The recharts family is listed explicitly so the `charts` chunk needs nothing from a leftover `vendor` bucket. With the current dependency graph, **no generic `vendor` chunk is even emitted** — every bundled `node_modules` module lands in a named family.
- `leaflet`/`qrcode` rules are future-proofing: they cost nothing until the deps arrive.

### 2.2 Other `build` settings

- `target: 'es2020'` — modern-browser baseline. The codebase uses optional chaining / nullish coalescing / async iterators; all native in any browser from 2020. Smaller output than ES5 legacy, faster to parse.
- `minify: 'esbuild'` (Vite default, kept explicitly) — fastest build, best size for this codebase.
- `sourcemap: false` (Vite default, kept explicitly) — sourcemaps are dev/debugging weight only.
- `chunkSizeWarningLimit: 600` — the `charts` family legitimately sits at ~383 kB raw (d3 + recharts); 600 keeps the warning meaningful for real regressions without false positives.

Dev/HMR is **not affected**: `rollupOptions`/`manualChunks` are build-time only, and the dev server was smoke-tested (HTTP 200, HMR client injected).

---

## 3. Expected vs. measured bundle impact

### 3.1 After build log

```
assets/index-By-t883s.js      30.31 kB │ gzip:   9.18 kB    ← app code only (was 273.65 kB)
assets/react-vendor-*.js     164.93 kB │ gzip:  53.69 kB    ← NEW stable core chunk
assets/http-*.js              48.54 kB │ gzip:  18.63 kB    ← NEW stable axios chunk
assets/icons-*.js             29.94 kB │ gzip:   9.99 kB    ← NEW stable icons chunk
assets/charts-BVuX5vK8.js    383.16 kB │ gzip: 105.63 kB    ← renamed from auto `AreaChart`, now stable
assets/<21 page chunks>        0.69–11.52 kB
assets/index-*.css             34.57 kB │ gzip:   6.90 kB
✓ built — no warnings
```

### 3.2 Initial-load (eager) totals

| Metric | Before | After | Δ |
|---|---|---|---|
| Eager JS raw | 273.65 kB (1 chunk) | 273.72 kB (4 parallel chunks) | ~0 |
| Eager JS gzip | 91.02 kB | 91.49 kB | +0.5% |
| App-code-only chunk | — | 30.31 kB | **new small `index` chunk** |

### 3.3 What actually improved

Chunking does **not** shrink total bytes (React+axios+recharts dominate and cannot be reduced by splitting). It changes **cacheability and delivery semantics**:

1. **Deploys now invalidate ~30 kB, not ~274 kB.** A one-line change to Home re-hashes only `index-*.js`; `react-vendor`/`http`/`icons` stay byte-identical for returning users (provided the host sends immutable cache headers — see rec #3).
2. **Deterministic chunk names.** `charts-*` no longer flips name when imports shift (auto-named `AreaChart-*` before).
3. **Route-targeted vendor loads are explicit.** Passenger routes physically cannot download `charts`; admin/reports routes fetch it once and reuse it across both pages.
4. **The generic `vendor` bucket is empty.** No junk chunk.

---

## 4. Five prioritized follow-up recommendations

### 1. Keep heavy libraries behind lazy routes — and make leaflet lazy from day one
- Recharts is already correct (only imported by lazy `/admin` + `/operator/reports`). Do **not** move it into `Layout` or a shared component.
- When `react-leaflet`/`leaflet` land (Routes map), import them **inside `pages/Routes.jsx`** only — the `leaflet` manual chunk already exists, so it will isolate automatically. Import leaflet CSS via the component (or a lazy CSS), not globally.
- Bonus: OSM tile requests (`tile.openstreetmap.org`) should be preceded by `<link rel="preconnect">`; consider vector tiles to cut tile payloads on mobile.

### 2. Preconnect to the backend API origin
- Dev proxies `/api` and `/uploads` to `localhost:8080`. In prod the SPA and API are likely different origins. Add to `index.html`:
  ```html
  <link rel="preconnect" href="https://api.<vygo-domain>" crossorigin>
  ```
- This removes the DNS + TLS round trip before the first `AuthProvider` `/auth/me` request — cheap, measurable LCP/INP win on cold loads.

### 3. Correct caching headers for `/dist/` (complements manualChunks)
- All `dist/assets/*` filenames are content-hashed → serve **`Cache-Control: public, max-age=31536000, immutable`**.
- `index.html` → **`Cache-Control: no-cache`** (must revalidate so new hashes are picked up).
- `public/image.jpg`, `robots.txt`, `llms.txt` → short revalidate (e.g. `max-age=86400`), and don't let the 1 MiB hero get a forever TTL unless it becomes content-hashed too.
- Configure this in the Spring Boot static-resource/controller layer. Without it, the stable chunks from §2 are wasted on `max-age=0` revalidation of every asset.

### 4. Security headers for a public bearer-token SPA (CSP + CORP)
- Strict-ish production CSP (apply on the server response, not in dev where Vite needs eval/inline):
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.<vygo-domain>; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  ```
  (`img-src data:` is needed if `qrcode.react` renders QR as a data URL; `'unsafe-inline'` styles cover Tailwind/injected critical CSS.)
- `Cross-Origin-Resource-Policy: same-origin` on `dist/` assets (relax to `cross-origin` only if a separate CDN serves them), and `X-Content-Type-Options: nosniff`.
- Revisit when adding third-party scripts (analytics/chat) — gate them behind the CSP allowlist rather than widening it.

### 5. Image pipeline — the single biggest asset on the site
- `public/image.jpg` is **1.06 MiB** of the first paint and is the likely **mobile LCP element**. Fix:
  1. Deliver responsive, modern-format derivatives (WebP/AVIF) via the backend or a build-time image step — e.g. a ~1200 px hero at 80–150 kB.
  2. Add explicit `width`/`height` to the `<img>` to eliminate CLS (currently absent in `Home.jsx`).
  3. Set `fetchpriority="high"` on the hero (it is the LCP element) and `loading="lazy"` on every below-fold image.
  4. Right-size the favicon (`vygoicon.png` 167 kB → ~64 px PNG + SVG maskable).

---

## 5. Regression process

- **Every build:** `npm run build` must emit **no** chunk warnings (the `chunkSizeWarningLimit: 600` ceiling still catches regressions above 600 kB).
- **Every dependency change:** re-run `npm run build` and confirm new `node_modules` families land in a named chunk, not an accidental `vendor` bucket or a circular-chunk warning.
- **After deploy:** verify with Lighthouse mobile (throttled) — target LCP < 2.5 s, CLS < 0.1, INP < 200 ms — and check real-user CrUX data; the hero-image work (rec #5) is the highest-impact next step for those numbers.
