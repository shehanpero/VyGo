# VyGo — 3D Seat-Select Performance Budget

**Document:** `frontend/docs/3d-performance-budget.md`
**Author:** Frontend Performance Engineer
**Audience:** 3D & Scene Developer, UI Engineer, Finish-Gate Reviewer
**Companion docs:** `frontend/docs/seat-3d-flow-architecture.md` (UX/state contract), `seat-3d-ux-spec.md` (creative authority), `seat-3d-ui-spec.md` (UI spec)
**Version:** 1.0 · **Status:** Build-ready · **Date:** 2026-08-03

> **Baseline note:** `three` and friends are declared in `package.json` but were **not installed** when this doc was authored. Every number below is a target derived from known library sizes; the first `npm install && npm run build` after install produces the **measured baseline** — replace the estimates in §1 with real `dist/` sizes and record them in the PR.

---

## 0. Non-Negotiable Invariant

`SeatSelect3D` is a `React.lazy` route. **No three.js / R3F / gsap / framer-motion byte may ever enter the eager entry bundle** (`index-*.js`, `react-vendor-*.js`). The chunk split in `frontend/vite.config.js` enforces this: all three-ecosystem and motion code lands in the lazy `three-vendor` and `motion` chunks, which are requested only when the 3D seat picker route mounts.

---

## 1. Chunk budgets (gzip — network cost the user pays)

| Chunk | Target gzip | Hard ceiling gzip | What's inside |
|---|---|---|---|
| `three-vendor` | ≤ 380 kB | **500 kB** | three core + `three/examples/jsm/…` (~150 kB), @react-three/fiber + drei + three-stdlib (~120 kB), postprocessing + @react-three/postprocessing (~25 kB), gsap (~30 kB), remaining R3F glue (zustand, maath, react-reconciler, @react-spring, … ~60 kB) |
| `motion` | ≤ 25 kB | **35 kB** | framer-motion + @motionone engine (only `SuccessScene` overlay uses it) |
| `SeatSelect3D` route chunk (app code) | ≤ 60 kB | 80 kB | page + `seat3d/*` components, seat layout meta, HUD, audio |
| **Incremental 3D route total** (route + three-vendor + motion) | ≤ 500 kB | **600 kB** | the extra bytes the network pays after the base app chunk |

Notes:

- Raw (un-gzipped) `three-vendor` will legitimately exceed Vite's warning threshold. `vite.config.js` sets `chunkSizeWarningLimit: 1100` so the warning fires only on real regressions. **Gzip is the budget that matters; keep it under the ceiling.**
- If `three-vendor` gzip lands above 500 kB, do **not** raise the budget — cut weight (drop unused drei helpers, import `three/examples/jsm/…` selectively, avoid full-library `three` imports that can be tree-shaken).

---

## 2. First-load budget — 3D seat-picker route (mobile, throttled 4G)

| Metric | Target | How checked |
|---|---|---|
| LCP | ≤ 2.5 s | Lighthouse mobile; LCP element is the WebGL canvas |
| INP | ≤ 200 ms | intro/HUD interactions (orbit, seat select, camera controls) |
| CLS | ≤ 0.1 | canvas has a fixed height (`min(calc(100vh - 10.5rem), 820px)`); overlays must never reflow the stage |
| 3D route JS downloaded | ≤ 500 kB gzip | Network tab, throttled profile |
| Time to first WebGL frame | ≤ 1.5 s after route JS executes | `requestAnimationFrame` after `Canvas` mounts (tracing) |
| Entry bundle (main app) | **no growth** from adding the 3D page | compare `index-*.js` + `react-vendor-*.js` before/after |

---

## 3. Lazy-loading rules

1. Keep the route behind `React.lazy` (already the case in `main.jsx`). Never import three/R3F from eager modules, `Layout`, or any shared component used by non-3D routes.
2. All three imports live in the lazy route and `src/components/seat3d/*`. The `manualChunks` rule routes them to `three-vendor`; the rule must not be bypassed with `/* @vite-ignore */` or dynamic path tricks.
3. `three/examples/jsm/…` imports must come from the `three` package itself (same chunk). Never vendor a second copy of three or a hand-copied jsm util.
4. **Optional preload only:** prefetch the route chunk (and only then `three-vendor`) on hover/idle of the "Select seats" trigger — never block the search/results first load, and never prefetch on mobile data-unaware flows.
5. Keep one route-level chunk for scene sub-parts unless a part is genuinely heavy and conditionally used (e.g. postprocessing passes); premature `import()` splitting adds requests without saving bytes.

---

## 4. Texture limits

| Limit | Value |
|---|---|
| Max texture resolution | 2048×2048 scene-critical (seats, interior panels); 1024×1024 repeatable/diffuse-only; 256 for LUT/noise |
| Total scene texture memory | ≤ 64 MB mobile (Σ width × height × 4 bytes per mip chain; one 2048 RGBA ≈ 16 MB) |
| Formats | Prefer KTX2 (Basis) or WebP for large maps; `THREE.SRGBColorSpace` on color maps **only** (never roughness/normal/data maps) |
| Reuse | One material/map set shared across all seats; no per-seat unique textures; bake static detail |

---

## 5. DPR / quality heuristics

- Renderer pixel ratio cap: `min(devicePixelRatio, 1.75)` — already set via `dpr={[1, 1.75]}` on `<Canvas>`.
- Mobile / high-DPR phones: cap at 1.5. Treat `hardwareConcurrency < 8` as the low tier.
- Quality tiers:
  - **low** — dpr 1, shadows off (or 512 map), no postprocessing, static lighting
  - **medium** — dpr 1.5, shadow map 512, Bloom only
  - **high** (desktop + strong device) — dpr 1.75, shadow map 1024, Bloom + DepthOfField
- Gate DepthOfField to non-mobile with ≥ 8 cores (already `dofEnabled` in `SeatSelect3D.jsx`).
- Honor `prefers-reduced-motion`: skip the intro timeline and land in interactive mode (already handled).
- If GPU-bound: drop MSAA/antialias and use a post FXAA pass instead; instance repeated seats rather than cloning meshes; keep draw calls bounded.

---

## 6. Ship checklist — 8 checks before ship

1. **Chunk split confirmed** — `npm run build` output lists `three-vendor-*.js` and `motion-*.js` in `dist/assets`.
2. **3D route code-split** — `SeatSelect3D-*.js` exists as its own chunk and is fetched only when navigating to the 3D seat picker (Network tab on the route).
3. **No three in main bundle** — `index-*.js` / `react-vendor-*.js` contain no three/R3F/gsap exports; entry chunk size unchanged vs. pre-3D build.
4. **No duplicate vendor copies** — exactly one `three` build in `dist/` (no `three.js` + `three.min.js`, no second framer-motion/@motionone copy).
5. **Gzip sizes within budget** — `three-vendor` ≤ 380 kB gzip (hard 500), `motion` ≤ 25 kB gzip (hard 35), incremental route total ≤ 500 kB gzip — measured with a gzip report, recorded in the PR.
6. **Font/icon costs** — only tree-shaken `react-icons` glyphs ship to the route; no new font-face/webfont weight from the 3D page; any webfont uses `font-display: swap` and is preloaded only if it paints the LCP.
7. **WebGL fallback exists** — non-WebGL / low-tier devices degrade gracefully (canvas probe → 2D `BusSeatMap` with the same HUD); verified by disabling WebGL in DevTools.
8. **Build warnings zero** — `npm run build` exits clean: no unresolved imports, no circular-chunk warnings, no duplicate-exports warnings. (Chunk-size warnings are only allowed for the documented heavy lazy chunks, and the threshold is already tuned.)

---

## 7. Budget enforcement

- The measured `dist/` listing + one Lighthouse mobile run (throttled 4G) on `/seat-select` is a **required** artifact in the PR that lands this page.
- Re-run checks 1–8 on any change that touches `vite.config.js`, adds a three-ecosystem dep, or edits `SeatSelect3D.jsx`/`seat3d/*`.
- Any new heavy dependency must land in its own lazy chunk (extend `vendorChunkGroups`), never in the eager bundle.
