# VyGo 3D Seat Selection — Performance Strategy

**Scope:** Procedural luxury-coach seat picker (≈60 seats + interior) at `/seat-select`, built with Vite 5, React 18, three r169, React Three Fiber v8, drei, @react-three/postprocessing.
**Status:** Strategy document — budgets, rules, and acceptance criteria. Grounded in an audit of `SeatSelect3D.jsx`, `BusInterior3D.jsx`, `Seat3D.jsx`, `seatGeometry.js`, `seatMeta.js`, `BusSeatMap.jsx`, `main.jsx`, `vite.config.js`.
**Rule of engagement:** every change to the 3D path is measured against the acceptance numbers in §6. The scene's bottleneck is **draw calls and overdraw on the GPU**, not CPU compute — every decision below optimizes that, and none of it needs WebAssembly (see §4.5).

---

## Budget at a glance (the whole doc in one table)

| Resource | Hard budget | Today (audit) | Verdict |
|---|---|---|---|
| Scene triangles | **< 150k** | ~10–12k | 7% of budget — headroom is fine, guard the ceiling |
| Draw calls | **< 80** (target ≤ 25 after instancing) | ~105+ (60 seats + ~45 interior/shell) | **OVER BUDGET — headline fix: instancing** |
| Unique material definitions | **< 20** | ~18 | Near the wire; consolidate |
| Material instances | keep minimal (target: seats = 1) | ~110+ (60 seat mats + per-mesh `material-color` instances) | **OVER — the `material-color` prop pattern clones per mesh** |
| Texture memory | **< 40 MB** | 0 (fully procedural) | Free today; budget guards against a PBR GLTF landing |
| First-load 3D chunk | **< 1.5 MB gzip** | ~350–500 KB gzip expected after §4 | OK; must stay in its own chunk |
| FPS mid-range / low-end | **60 / ≥30** | unmeasured (no stats wired yet) | Wire §6 checklist before shipping |

---

## 1. Geometry & memory budget

### 1.1 Hard budgets

| Item | Budget | Rationale |
|---|---|---|
| Total scene triangles | **< 150k** | Comfortably above a coach scene; a dense PBR GLTF (20k+ tris per object) is the risk this guards against. Current procedural scene is ~10–12k. |
| Draw calls | **< 80 absolute**, **target ≤ 25** | On integrated GPUs, each draw call costs ~20–50 µs of driver+JS dispatch. 60 per-seat draws alone blows this; instancing collapses seats to **1**. |
| Unique materials | **< 20 definitions** | Each material = a program compile on first use (shader compile jank) plus uniform uploads. Keep the seat material at **exactly 1**. |
| Texture memory | **< 40 MB** | 1024² RGBA ≈ 4 MB, 2048² ≈ 16 MB. Rule: **never above 1024² per texture**; prefer KTX2/Basis or WebP if real textures ever land. |
| Geometry memory | < 8 MB | 150k tris × 32 B/vertex (position+normal+uv) ≈ 19 MB worst case non-indexed; indexed cuts ~40%. Our merged seat geometry is ~13k vertices — trivial. |

### 1.2 Current-state audit (what the code actually does today)

- **Seats:** `seatGeometry.js` already merges 6 boxes into one module-cached geometry (72 tris/seat → ~4.3k tris for 60 seats) and caches it — good. **But** `Seat3D.jsx` instantiates a `meshStandardMaterial` **per seat** (60 material instances) and each seat is its own mesh → **60 draw calls**, 60 per-frame `useFrame` closures, 60 per-frame uniform uploads.
- **Interior/shell:** `BusInterior3D.jsx` uses the `<mesh material-color={...}>` pattern, which makes R3F create a **new material instance per mesh** (~45 interior + shell meshes → ~45+ more material instances). Only the `shellMats` block is properly shared.
- **Triangle count is a non-issue.** The 150k ceiling is 15× today's scene. The real budget pressure is draw calls + material instances.

### 1.3 Seats: `InstancedMesh` (recommended) vs merged geometry

**Recommendation: `InstancedMesh` for the 60 seats.** One draw call, one material, per-instance color for free. Do **not** use per-seat material clones (60 uniforms per frame = the current cost) and do **not** use a single merged geometry with vertex colors:

| Approach | Draw calls | Per-seat color | Per-seat transform (hover lift/scale) | Raycast → seat id | Verdict |
|---|---|---|---|---|---|
| Current: 60 meshes × shared geometry × own material | 60 | material clone each | easy | easy | ❌ material/uniform churn |
| **`InstancedMesh` + `setColorAt`** | **1** | `instanceColor` (free, no clones) | `setMatrixAt` per instance | `e.instanceId` → index | ✅ **do this** |
| One merged geometry + vertex colors | 1 | rewrite vertex-color buffer on change | none (single mesh) | face→seat mapping is manual | ❌ loses hover/select animation |

**How to color per instance without material clones — the exact mechanism:**

`THREE.InstancedMesh` has a built-in `setColorAt(instanceId, color)` which allocates an `instanceColor` attribute. In the shader (`USE_INSTANCING_COLOR`), the material color is **multiplied by** the instance color — so **one shared material + one draw call gives 60 distinct seat colors**. Updating a seat is a 3-float write plus `instanceColor.needsUpdate = true`:

```js
// seats are instances 0..capacity-1, index === seatNumber mapping held once in seatMeta
seatMesh.setColorAt(idx, SEAT_COLORS[category] ?? SEAT_COLORS.available)
seatMesh.setMatrixAt(idx, matrix) // hover lift/scale + position from seatPositionFor()
seatMesh.instanceColor.needsUpdate = true
seatMesh.instanceMatrix.needsUpdate = true
```

**Known trade-off — per-instance emissive:** `instanceColor` tints the material, it does **not** feed `emissive`. The current "selected glow" (per-seat `emissive` pulse in `Seat3D.jsx`) cannot be done per-instance in one draw call. Options, in order of preference:

1. **(Recommended) Drop the seat emissive pulse; express state via instance color only** — selected = brighter `#16a34a`-to-`#22c55e`, plus the existing bloom threshold (0.9) on the shared material if a glow read is wanted. Cheapest, one draw call.
2. **One extra additive overlay `InstancedMesh`** — a slightly larger, transparent, `AdditiveBlending` emissive shell, updated only for selected instances (max 6). +1 draw call, preserves the glow affordance. Do this only if product insists on the glow.

**Pointer events:** one raycast against the single `InstancedMesh` (R3F exposes `e.instanceId`) instead of 60 `onClick`/`onPointerOver` handlers — this is the interaction boundary being batched, the same discipline as batching JS↔Wasm crossings: one hit test, not sixty.

**What to do with the existing merged seat geometry:** reuse it as the instanced geometry (one geometry, `count: capacity`). Keep it **indexed** (`mergeGeometries(parts, false)` is currently non-indexed — 216 verts/seat; index it once for ~40% smaller index buffer and better cache behavior; trivial cost at build time).

### 1.4 Interior: merge static geometry, share materials

- Group static interior/shell meshes **by material** and merge each group into one geometry via `mergeGeometries` (already used in `seatGeometry.js`) — panels → 1 geometry, metal → 1, glass → 1, etc. Target: interior ≈ 6–10 draw calls instead of ~45.
- **Kill the `material-color` prop pattern.** Create the handful of shared material instances once (module-level or `useMemo` + dispose), exactly like `shellMats` already does, and assign them to merged geometries. This alone removes ~40 material instances.
- Keep `shellMats` (6 materials) as the shared shell set; the intro animation already reuses them per-frame — that's the correct pattern, extend it to the interior.

### 1.5 Memory hygiene rules

- **Everything procedural stays procedural.** Zero textures today means zero texture-memory pressure and zero decode time. If a PBR texture lands: max 1024², KTX2/Basis-compressed, and it counts against the 40 MB budget.
- **Geometry cache discipline:** `seatGeometry.js` caches at module scope — keep that pattern; `dispose()` on unmount (already wired for `shellMats`; extend to merged interior geometries and the instanced seat geometry).
- **Leak gate:** `renderer.info.memory.geometries/textures` must return to baseline when navigating away from `/seat-select` (React StrictMode double-mount makes this easy to check).

---

## 2. Frame discipline

The 3D scene is small; the discipline rules are what keep it small under change. These mirror the boundary-first rule of the Wasm playbook: **batch, don't chatter** — here the boundary is React ↔ R3F ↔ three, and the churn is 60 per-frame closures.

### 2.1 Render-loop rules

1. **Clamp the delta.** `useFrame((_, rawDt) => { const dt = Math.min(rawDt, 0.05) })` — already in `Seat3D.jsx`; make it the house rule for every `useFrame`. Prevents physics/lerp spikes when the tab was backgrounded and the clock jumps. The exponential-smoothing form `k = 1 - Math.exp(-dt * 8)` is correct — keep it.
2. **No allocations in `useFrame`.** No `new Vector3/Color/Matrix4`, no array literals, no object spreads. Preallocate scratch objects (`useMemo(() => ({...}), [])`) and reuse. Current `Seat3D.jsx` already hoists scratch state in `useMemo` — good; the `targets` `useMemo` runs on render, not per frame — also good. When instancing lands, **one** `useFrame` drives all 60 seats via scratch matrices/colors.
3. **No React state writes in `useFrame`.** `hovered` in `Seat3D.jsx` is React state → every hover triggers a re-render of the seat subtree. Replace with a ref + imperative instance-color write (with instancing this is a `setColorAt` — no re-render at all).
4. **Hoist the pulse clock.** `performance.now()` per seat per frame in the selected pulse — with instancing, compute one `t = clock.elapsedTime` in the single seat `useFrame` and drive all instances from it. Also gate the pulse to only run while something is actually selected/animated.
5. **Memoize row layout.** `computeLayout` is already in `useMemo([capacity, busType])` in `BusInterior3D.jsx` — keep. With instancing, **also memoize the instance table (index → seatNumber, position, category) once per `(capacity, busType)`**, independent of `selected` (today `placed` re-runs on every selection change; with instancing, selection updates are imperative `setColorAt`/`setMatrixAt`, not a re-map of 60 seats).
6. **Never re-create geometries on state change.** Inline `<boxGeometry args={...}>` in components that mount/unmount (e.g., intro → ready transitions) churns GPU buffers. Hoist to module-level `useMemo`/cached singletons (the `seatGeometry.js` pattern) or shared consts.
7. **Bound the DOM-from-3D churn.** drei `<Html>` labels (used for selected/focused seat numbers) mount real DOM nodes synced every frame — expensive, and exactly the wrong boundary crossing pattern. Limit to **≤ 2 visible labels** (selected + focused), and/or swap to a sprite/`Text` billboard if the count grows.

### 2.2 DPR strategy

- **Keep `dpr={[1, 1.75]}` as the mid/high default.** 1.75 is the sweet spot: retina-quality without the 2.25× fill-rate bill of `devicePixelRatio: 3` on MacBooks. Framebuffer cost scales as **dpr²** — and every post-processing pass renders at that resolution (see §3).
- **Low tier: `dpr={[1, 1.5]}`**, or `[1, 1]` on the lowest tier.
- Cap absolute dpr at 2: `dpr={[1, Math.min(2, devicePixelRatio || 1)]}` on high tier.

### 2.3 Antialias policy

- **Mid/high:** `gl={{ antialias: true }}` as today. If the `EffectComposer` is active, set `multisampling={0}` on the composer — **one AA pass, not two** (composer multisampling + context antialias double the cost).
- **Low tier:** `antialias: false`. At dpr 1 with bloom off, a 1280×720 coach is still crisp enough; the ~1–2 ms saved per frame is the difference between 30 and 60 fps on an Intel UHD.

### 2.4 `frameloop`: always vs demand

- **Intro/boarding + active interaction: `frameloop="always"`.** The bus shell animation, camera damping (`enableDamping`), hover lerp, and the selected pulse all need continuous frames. This is the default state today — fine.
- **Static isometric idle state: switch to `frameloop="demand"`** after N seconds of no pointer/selection activity. The settle camera view is static; rendering it 60×/s is pure battery burn on laptops.
  - R3F v8 wiring: `frameloop="demand"` on `<Canvas>`, and `invalidate()` on every thing that changes: OrbitControls `onChange`, selection/hover writes, and a short self-invalidating timer while the ~300 ms color/position lerp runs after a change.
  - **Recommendation:** implement demand-mode for the ready state behind the tier check (low/mid default on, high can stay `always`), and gate it — with drei `<Html>` labels in the scene, a stray DOM update still needs an `invalidate`.

---

## 3. Post-processing cost

### 3.1 Cost model on integrated GPUs

Every `EffectComposer` effect is a fullscreen render pass at **dpr² × canvas** resolution:

| Effect | Extra fill per frame | Est. iGPU cost (1280×800, dpr 1.5) | Verdict |
|---|---|---|---|
| Scene base | — | 1–3 ms | fine |
| **Bloom** (`mipmapBlur`) | ~1.33× framebuffer (½→¼→⅛ downsample chain) | 2–4 ms | acceptable, **keep default** |
| **DepthOfField** (bokeh) | 2–3× framebuffer (depth-aware, multi-tap) | 4–10 ms | **too expensive by default** |
| ContactShadows (intro only) | 1 extra scene-depth pass | 2–5 ms | intro-only; drop on low tier |

Budget check at 60 fps: 16.7 ms/frame. Base scene + bloom ≈ 6–8 ms → comfortable. + DoF ≈ 12–18 ms → **at or over the edge on integrated GPUs**. This matches the current code's instinct (DoF gated behind `hardwareConcurrency >= 8 && !mobile`) — that gate is directionally right but too blunt; upgrade it to the tier function below.

### 3.2 Recommendation

- **Default: single `EffectComposer`, Bloom only, subtle.** Current settings (`luminanceThreshold 0.9, intensity 0.35, mipmapBlur`) are exactly right — near-zero visual change on a dark interior, near-zero cost. Keep them.
- **DoF: off by default, high-tier only** via the tier heuristic.
- **Low tier: no composer at all** (conditional render — an empty composer still costs a buffer + resolve).
- **Never add** SSAO, SMAA, or lens effects to this scene — they're the single biggest integrated-GPU killer and this interior doesn't need them.

### 3.3 Tier heuristic (shared with §5)

```js
// deviceTier.ts — one function drives post, DPR, shadows, antialias, fallback
export function deviceTier() {
  if (typeof navigator === 'undefined') return 'mid'
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const mobile = /Mobi|Android/i.test(navigator.userAgent)
  if (mobile || cores < 4 || mem <= 2) return 'low'
  if (cores < 8 || mem <= 4 || dpr < 1.5) return 'mid'
  return 'high'
}
// high → Bloom + DoF; mid → Bloom only; low → no composer, antialias off, dpr [1,1], shadows off
```

This replaces the current `dofEnabled` boolean (`SeatSelect3D.jsx` line 76) with the same decision, plus drives the rest of the settings from one source of truth.

---

## 4. Loading & bundling

### 4.1 Code-split the 3D page — already done, keep it

`main.jsx` already lazy-loads `SeatSelect3D` (`const SeatSelect3D = lazy(() => import('./pages/SeatSelect3D'))`) under the route-level `<Suspense>`. This means the three.js family is **never downloaded for users who never open seat selection**. This is the single biggest loading win and must not regress. The fallback path (§5) must keep both the 3D and 2D pages lazy.

### 4.2 Dedicated `three-vendor` chunk (add to `vite.config.js`)

Today `three`, `@react-three/*`, `drei`, and `postprocessing` don't match any rule in `vendorChunkGroups`, so they land in the **generic `vendor` bucket** — meaning the 3D route drags unrelated shared deps with it and every non-3D dep invalidates the 3D chunk's cache. Add a dedicated family so the entire 3D stack is one stable, cacheable, lazy-loaded unit:

```js
'three-vendor': /node_modules\/(three|three-stdlib|@react-three|@pmndrs|postprocessing|maath|its-fine|zustand|use-sync-external-store|suspend-react|troika|potpack|ktx2-encoder)\//,
```

Place it **before** the generic `return 'vendor'` fallback in the `manualChunks` function. Budget: the whole family (three r169 + fiber + drei + postprocessing, tree-shaken) lands **~350–500 KB gzip** — well inside the **< 1.5 MB gzip** acceptance. Verify with `npm run build` + gzip-size check in CI (§6.3).

### 4.3 three tree-shaking notes

- three ships ESM with `sideEffects: false` → **named imports only** (`import { Color, Vector3, InstancedMesh } from 'three'`). The existing `import * as THREE from 'three'` in scene files is tolerated by Rollup (unused namespace members get dropped), but prefer named imports in new code to keep esbuild/Rollup analysis trivial.
- Avoid deep `three/examples/jsm/...` imports that pull large unshaken modules — `BufferGeometryUtils.mergeGeometries` is fine (small, pure), keep it; prefer drei's re-exports over raw three-stdlib imports to avoid duplicate module copies.
- drei (9.x) already aligns with r3f 8 / three 0.169 — keep the three version pinned; a major three bump can silently double the payload if drei re-exports a different stdlib copy.

### 4.4 Texture preload & placeholder substitution

- The scene is **procedural — zero textures today, zero load cost**. Preserve that unless product explicitly wants PBR materials.
- If textures are added: preload with drei `useTexture` inside a `<Suspense>` boundary, and swap **placeholder solid-color materials** in until load completes (never block first paint on texture decode). Enforce the 1024² / KTX2 rules from §1.1.

### 4.5 WebAssembly — NOT needed here (short answer + honest reasoning)

**Short answer: no. This workload should not involve WebAssembly.**

**Reasoning:** WebAssembly accelerates **CPU compute** — pure math running on the main or worker thread. The bottleneck in this scene is on the **GPU side (draw calls, fill rate, overdraw)** and the **JS↔renderer dispatch cost**, not arithmetic. The per-frame work is trivial: ~10k triangles, ~100 transforms, and 60 instance colors — a few hundred thousand FLOPs that JS executes in well under a millisecond. Shipping a Wasm module would add a toolchain, a module download, and a marshalling boundary for **zero measurable gain** — the exact anti-pattern of porting glue code to Wasm on faith instead of a benchmark.

The discipline that *does* apply here is the Wasm boundary-first lesson, translated: **batch, don't chatter**. The current churn is 60 per-seat `useFrame` closures, 60 material uniform uploads, and per-frame drei `<Html>` DOM syncs — the JS↔DOM equivalent of a thousand tiny boundary crossings. Fixing that (instancing, shared materials, ≤2 labels) is where the real performance lives.

**When WASM *would* matter** (none of these are true today, revisit if one lands):
1. **Physics at scale** — vehicle dynamics, cloth, or a 60-seat crowd sim via a WASM engine (e.g., Rapier). Physics is exactly the CPU-bound, boundary-light workload Wasm wins on.
2. **Procedural mesh generation at scale** — generating tens of thousands of vertices/tris per frame (terrain, particle meshes, morphing) inside the module, crossing the boundary once with typed-array buffers.
3. **Geometry/asset compression** — meshopt/quantized-vertex or codec work to shrink downloads (the < 1.5 MB gzip chunk budget could benefit if a heavy GLTF ever lands).
4. **CPU route/pathfinding optimization** at booking scale.

If any of these arrive: the design rule is unchanged — hot loop inside the module, hand it **big typed-array buffers once per frame**, never per-element calls, and benchmark against the JS baseline before committing.

---

## 5. Fallback path

### 5.1 Detection

Run once per route mount (module-singleton cached). Checks, in order:
1. **No WebGL** — `canvas.getContext('webgl2') || 'webgl' || 'experimental-webgl'` all return null (blocked, disabled, or headless).
2. **Software renderer** — `WEBGL_debug_renderer_info` reports SwiftShader / llvmpipe / software rasterizer. Even "working" software WebGL is unusable at 60 fps; fall back.
3. **Low devicePixelRatio / weak device** — dpr < 1 (tiny/legacy screens) combined with low cores/memory → fall back or degrade.

```js
// detect3D.ts — singleton, safe in SSR/StrictMode
let cached = null
export function detect3D() {
  if (cached) return cached
  if (typeof window === 'undefined') return (cached = { supported: false, tier: 'none', reason: 'no-window' })
  let result
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) { result = { supported: false, tier: 'none', reason: 'no-webgl' } }
    else {
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : ''
      if (/swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(renderer)) {
        result = { supported: false, tier: 'none', reason: 'software-renderer', renderer }
      } else {
        const dpr = Math.min(window.devicePixelRatio || 1, 3)
        const cores = navigator.hardwareConcurrency || 4
        const mem = navigator.deviceMemory || 4
        const mobile = /Mobi|Android/i.test(navigator.userAgent)
        const tier = mobile || cores < 4 || mem <= 2 || dpr < 1 ? 'low'
                   : cores < 8 || mem <= 4 ? 'mid' : 'high'
        result = { supported: true, tier, dpr, mobile, renderer }
      }
    }
  } catch (err) {
    result = { supported: false, tier: 'none', reason: 'webgl-error', error: err }
  }
  cached = result
  return cached
}
```

### 5.2 Feature-flag shape

- **Config:** `FEATURES.seat3D = { enabled: true, minTier: 'low' }` in one constants file — the kill-switch if a GPU regression ships.
- **User override:** `?view=2d` query param and/or `localStorage['vygo:view3d'] = '0'` (persisted, wins over detection) — required because a detection miss (enterprise lockdown GPU, odd remote-desktop) must never strand a user in an unusable 3D view. Mirror it: `?view=3d` to force 3D for QA.
- **Route wiring:** `/seat-select` renders a tiny `<SeatPicker/>` wrapper (keep both pages lazy):

```jsx
// SeatPicker.jsx
const SeatSelect3D = lazy(() => import('./pages/SeatSelect3D'))
const SeatSelect2D = lazy(() => import('./pages/SeatSelect'))
export default function SeatPicker() {
  const [view] = useViewPreference() // reads ?view= / localStorage, falls back to detection
  if (view === '2d') return <SeatSelect2D />
  return <SeatSelect3D />           // SeatSelect3D internally reads tier for reduced settings
}
```

### 5.3 Decision table

| Detection result | Action |
|---|---|
| `no-webgl` / `software-renderer` / `webgl-error` | **Hard fallback → 2D `BusSeatMap` page** (`SeatSelect.jsx`). Reuse the identical `/trips/:id/seats` data + lock flow; only the renderer differs. |
| `low` tier (dpr < 1, < 4 cores, ≤ 2 GB, or mobile) | **Fallback to 2D by default** per requirement; if product wants to keep 3D on capable-but-old screens, allow reduced-3D via `FEATURES.seat3D.allowLowTier3D` — reduced settings: dpr `[1,1]`, `antialias: false`, no shadows, no composer, `frameloop="demand"`, no intro animation. |
| `mid` tier | Full 3D, **Bloom only**, dpr `[1,1.5]`. |
| `high` tier | Full 3D, Bloom + DoF, dpr `[1,1.75]`. |

The 2D path is already battle-tested (`BusSeatMap.jsx`, used by `SeatSelect.jsx`) and shares the exact seat-state model — this is a renderer swap, not a feature downgrade.

---

## 6. Measurements

### 6.1 FPS / GPU test checklist

Run before every 3D milestone and on any scene/three/drei version bump:

1. **three stats** — mount drei `<Stats/>` (or `three/addons/libs/stats.module.js`): record **FPS, draw calls, triangles, geometries, textures** in `renderer.info` for 60 s at rest + 60 s orbiting.
2. **DevTools Performance** — 10 s recording of orbit + selection flow: check the main-thread breakdown is **script ≈ render ≈ paint** with no long task > 50 ms; hunt GC pauses (the instancing change should remove the per-hover re-render churn).
3. **GPU verification** — `chrome://gpu` (or Edge://gpu): confirm hardware acceleration is active (not SwiftShader) on the test machines; verify the chosen tier logs match expectations.
4. **Overdraw audit** — Spector.js capture or `renderer.debug` overlays: confirm no heavy transparent-overlap areas; check the bloom chain resolutions are the downsample sizes expected.
5. **Memory** — heap snapshot before/after mount, navigate away, snapshot again: geometries/textures must dispose back to baseline (StrictMode double-mount catches leaks early).
6. **Frame-time distribution** — instrument `useFrame` with a rolling p50/p95 (three `PerformanceMonitor` can gate quality automatically if we later want dynamic DPR).
7. **Load audit** — `npm run build`; report gzip size of `three-vendor` chunk + route chunk; verify via DevTools Network that 2D-only flows never request the three chunks.

### 6.2 Acceptance numbers

| Metric | Budget |
|---|---|
| FPS, mid-range (2020+ laptop iGPU — Iris Xe / Vega, dpr ≥ 1.5) | **60 fps sustained**, p95 frame ≤ 16.7 ms |
| FPS, low-end (Intel UHD 620 / entry Android, dpr ≤ 1) | **≥ 30 fps**, p95 frame ≤ 33 ms |
| Draw calls | **< 80 absolute; ≤ 25 after instancing** (1 seat instance + ≤ 10 interior groups + shell) |
| Scene triangles | **< 150k** (today ~10k) |
| Unique materials | **< 20** (target 10–12 after consolidation) |
| Texture memory | **< 40 MB** (0 today) |
| First-load 3D chunks (three-vendor + route) | **< 1.5 MB gzip total**, fetched only on `/seat-select` |
| Interaction latency | click→color response < 100 ms; selection lerp completes < 400 ms |
| Long-run stability | no heap growth > 10% over 10 min of seat-churn interaction; dispose on navigation |

### 6.3 Regression gates (CI)

- Add a size budget check for the `three-vendor` chunk (gzip bytes) to the build — fail the build at > 1.5 MB gzip.
- Add a smoke benchmark (headless Chrome + Puppeteer, three stats) that fails on draw calls > 80 or p95 > 33 ms on the low-tier profile.
- Track the numbers in the PR description for any 3D change — **no port/optimization on faith, only on measurement**.

---

## Appendix — The three changes with the highest ROI (ordered)

1. **Instanced seats** (§1.3): 60 draw calls → 1, 60 materials → 1, 60 `useFrame` closures → 1. Biggest single win; unlocks everything else.
2. **Interior merge + shared materials** (§1.4): ~45 draw calls → ~6–10; kills the `material-color` clone pattern.
3. **Tier-driven settings + 2D fallback** (§3.3, §5): one function gates post/DPR/shadows/fallback — the difference between "works everywhere" and "white screen on a bus terminal kiosk".
