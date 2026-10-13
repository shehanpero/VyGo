# VyGo — Luxury Coach Texture & Asset Pack Spec

**Document:** `frontend/docs/texture-asset-pack.md`
**Author:** Image Prompt Engineer (VyGo)
**Audience:** 3D & Scene Developer (React Three Fiber), Asset Producer, Finish-Gate Reviewer
**Version:** 1.0 · **Status:** Build-ready · **Date:** 2026-08-03
**Scope:** Production spec for the texture/material pack the 3D developer needs to build the luxury coach interior (`/seat-select` intro scene + resting isometric frame, hero intro rotation) and the QR-ticket success backdrop.

> **What this document is:** an *asset contract*. I (the Image Prompt Engineer) cannot generate images — I specify exactly what must be produced, in what resolution/format, with which PBR channels, how it tiles, and a **ready-to-paste AI image-generation prompt** for every texture. The 3D developer or an asset producer runs the prompts, lands the files into `frontend/public/tex/`, and wires them per the slot table below.
>
> **Rules of the document:** do not edit source files to "match" this spec. Align with the brand document (`docs/brand-premium.md`): calm luxury, premium restraint, ~90% neutral + ~10% `primary`/`expressway` accent. No gold-everywhere, no neon, no decorative noise.

---

## 0. Master Rules (apply to every asset)

1. **Style anchor** — every generation prompt ends with this exact suffix, verbatim:

   > `photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture`

2. **Seamlessness** — all tileable textures are generated with "seamless tileable texture" and must pass a 3×3 tiling review in-engine (no visible seams, no luminance jump, no duplicate-visible tile 4px feature). Tileable in all directions unless noted.
3. **Map style** — albedo maps ship with **no baked lighting/shadows** (flat, even illumination); all shading comes from the engine lights and tone mapping (`ACESFilmicToneMapping` per brand doc).
4. **Formats** — JPG for color/roughness/emissive (sRGB for albedo/emissive; linear-encoded but stored JPG for roughness/normal/metallic — mark these in the loader as `flipY: false` where the engine requires it and use non-sRGB texture format for map channels). Normal maps are DirectX-style by default (three.js expects OpenGL/Y-up; flip green if needed).
5. **Budget** — total pack ≤ **40 MB** for mobile builds (§6). One 4K EXR is the only "heavy" file and it is optional at load (see §4, item 9b).
6. **No text** — absolutely no lettering, logos, numbers, or watermarks inside any texture. Livery stripes, brand marks, and seat-number plates are added as **separate vector/decal layers** in code, never baked into textures.

### 1.1 Texture-slot naming convention

Every slot follows `tex/<material>_<map>.<ext>`. Map suffixes are fixed:

| Suffix | Channel | Colorspace | Notes |
|---|---|---|---|
| `_albedo` | Base color / diffuse | sRGB | no baked AO or shadows |
| `_rough` | Roughness (0=glossy … 1=matte) | linear, single channel packed in RGB | store in all three channels for compatibility |
| `_normal` | Normal map (tangent space) | linear | DirectX-style; flip G if engine complains |
| `_metal` | Metallic mask (0=dielectric … 1=metal) | linear | only for metal-bearing slots |
| `_ao` | Ambient occlusion | linear | optional; usually derived in-engine from albedo, use only when needed |
| `_emissive` | Self-illumination | sRGB | keep emission ≤ 1.0 EV (brand guardrail); most slots have none |
| `_opacity` | Alpha / cutout | linear | curtains only, optional |
| `_height` | Bump/displacement | linear | only where parallax desired (seat fabric, brushed metal); most slots skip it |

Example slots produced in this pack:

```
tex/seat-fabric_albedo.jpg      tex/seat-fabric_rough.jpg      tex/seat-fabric_normal.jpg
tex/coach-floor_albedo.jpg      tex/coach-floor_rough.jpg      tex/coach-floor_normal.jpg
tex/headliner-trim_albedo.jpg   tex/headliner-trim_rough.jpg   tex/headliner-trim_normal.jpg
tex/window-glass_albedo.jpg     (optional, 1K)
tex/curtains_albedo.jpg         tex/curtains_rough.jpg         tex/curtains_normal.jpg   tex/curtains_opacity.jpg (optional)
tex/dashboard-gloss_albedo.jpg  tex/dashboard-gloss_rough.jpg
tex/dashboard-metal_albedo.jpg  tex/dashboard-metal_rough.jpg  tex/dashboard-metal_normal.jpg  tex/dashboard-metal_metal.jpg
tex/driver-seat_albedo.jpg      tex/driver-seat_rough.jpg      tex/driver-seat_normal.jpg
tex/door-panel_albedo.jpg       tex/door-panel_rough.jpg       tex/door-panel_normal.jpg
tex/handrail_albedo.jpg         tex/handrail_rough.jpg         tex/handrail_normal.jpg    tex/handrail_metal.jpg
tex/coach-paint_albedo.jpg      tex/coach-paint_rough.jpg      tex/coach-paint_normal.jpg tex/coach-paint_metal.jpg
tex/coach-livery_albedo.jpg     (optional accent decal, 2K)
tex/qr-ticket-backdrop_albedo.jpg  tex/qr-ticket-backdrop_rough.jpg
tex/env-nightcity_4k.exr        (background HDR environment, optional load)
```

---

## 2. Interior Texture Slots

### 2.1 Seat upholstery — luxury woven fabric (dark navy/teal, subtle diamond stitching)

| Field | Value |
|---|---|
| **Purpose** | Seat back + cushion + headrest covers. The single most visible surface in the resting isometric frame; carries the "premium restraint" message (dark, woven, softly stitched — never glossy). |
| **Resolution** | **2K** (2048×2048) — do not exceed; seats are small in frame. |
| **Format** | `seat-fabric_albedo.jpg`, `seat-fabric_rough.jpg`, `seat-fabric_normal.jpg` — JPG quality 88–92. |
| **Channels** | **Albedo** (sRGB): deep navy `#0b1f2a`-to-teal `#123b42` woven base, very subtle tone variation, diamond-quilt stitching in slightly lighter thread `#2a4a52` (low contrast — pattern must be *felt*, not shout). **Roughness** (linear): 0.70–0.85; slightly lower (0.6) in the stitch grooves to suggest thread sheen. **Normal** (linear): fine yarn weave micro-bump + 4–5 mm diamond stitching recess (~0.15–0.25 depth); no sculpted quilting (seat padding is geometry). **Emissive**: none. |
| **Tiling** | Seamless tile; in-engine UV repeat ~4×4 on seat back, ~2×3 on cushion, ~1×1.5 on headrest. Diamond motif must tile on a clean 2×2 grid. |
| **Prompt** | `Macro texture of luxury coach seat upholstery, dark navy-teal woven fabric with subtle diamond quilt stitching, fine yarn weave, matte premium textile, even flat lighting, top-down orthographic view, seamless tileable texture, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |

### 2.2 Floor covering — rubber/vinyl coach floor with subtle pattern

| Field | Value |
|---|---|
| **Purpose** | Coach aisle + seat-area floor. Subtle texture reads "maintainable premium", not "office carpet". |
| **Resolution** | **2K** (2048×2048). |
| **Format** | `coach-floor_albedo.jpg`, `coach-floor_rough.jpg`, `coach-floor_normal.jpg` — JPG quality 88. |
| **Channels** | **Albedo** (sRGB): dark charcoal-slate `#131a24` with a barely-there repeating micro-motif (fine diagonal rib or low-relief hex) in `#1b2531`; no bright noise. **Roughness** (linear): 0.50–0.65 (vinyl slightly sheeny), with slight variation along ribs. **Normal** (linear): 0.5–1 mm ribs/grooves, low strength (~0.10) so the floor stays flat under the aisle-walk camera. **Emissive**: none. |
| **Tiling** | Seamless tile; UV repeat ~10×14 across the bus floor (fine tile, many repeats — that is normal for floors). |
| **Prompt** | `Seamless tileable texture of luxury coach rubber vinyl floor, dark charcoal slate with subtle low-relief diagonal rib pattern, fine micro-grooves, matte semi-gloss vinyl, even flat lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |

### 2.3 Ceiling + luggage rack trim — dark matte plastic with fine graining

| Field | Value |
|---|---|
| **Purpose** | Headliner panels above windows + the luggage-rack housing trim. One shared material tone keeps the cabin calm; the rack keeps a marginally higher sheen so its outline reads. |
| **Resolution** | **2K** (2048×2048). |
| **Format** | `headliner-trim_albedo.jpg`, `headliner-trim_rough.jpg`, `headliner-trim_normal.jpg` — JPG quality 88. |
| **Channels** | **Albedo** (sRGB): near-black warm slate `#14181c` with faint mottled grain (fine injection-molded plastic texture). **Roughness** (linear): 0.85–0.92 for ceiling; use 0.75–0.82 for the rack (a second material instance or a darker tinted copy — same map, different roughness value). **Normal** (linear): fine sandpaper-grade grain, strength ~0.08–0.12; never visible from 1 m. **Emissive**: none. |
| **Tiling** | Seamless tile; UV repeat ~3×20 along ceiling strips and rack lengths (1D stretching acceptable — keep grain direction consistent, ideally aligned with bus length). |
| **Prompt** | `Seamless tileable texture of dark matte injection-molded plastic interior trim, fine subtle grain, near-black warm charcoal, premium coach ceiling panel, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |

### 2.4 Window glass / windshield — reflective tint (+ HDR recommendation)

| Field | Value |
|---|---|
| **Purpose** | Window panes and windshield. **This is a material, not a texture problem.** In React Three Fiber use `MeshPhysicalMaterial` (or `MeshStandardMaterial` with `metalness: 0`, `roughness: 0.04–0.08`) with `transmission: 1` (or `transparent + opacity` on low tier), tint color, and an environment map for reflections. |
| **Resolution** | **1K** optional `window-glass_albedo.jpg` only if you want a subtle tint/grime base (near-black green-tinted gradient, `#0a1a17` → `#0d2320`); otherwise set `color: #0a1a17` in the material and skip the file. |
| **Format** | Material recipe (no heavy file). Optional 1K JPG quality 85. |
| **Channels** | **Albedo** (optional): subtle dark green tint + faint vertical smudge streaks. **Roughness**: 0.04 (glass) with a barely-lighter film on edges. **Normal**: skip (glass is flat; reflections do the work). **Emissive**: none. |
| **Tiling** | None — per-pane UV, no repeat. |
| **HDR recommendation** | Do **not** try to fake reflections with a texture. Use the **night-city HDR environment (§2.9b)** as the scene environment map (`scene.environment` and `scene.background` on the intro frame). This single file gives every window, the windshield, and the coach paint their reflections for free. On LOW tier, disable `transmission` and fall back to a `MeshStandardMaterial` with `metalness: 0.1`, `roughness: 0.1`, dark tint — the window reads as smoked glass. |
| **Prompt (optional albedo)** | `Seamless tileable texture of dark smoked glass with subtle dark green tint, faint vertical smudge streaks, no reflections baked, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |

### 2.5 Curtains — soft fabric, champagne/charcoal

| Field | Value |
|---|---|
| **Purpose** | Window strip drapes. Two-tone: champagne (`#d8c9a8`) for the luxury-priority rows and charcoal (`#2a3038`) for standard rows — or one neutral champagne tone with a charcoal accent band. Choose ONE palette and apply to all strips for calm (brand 90/10 rule). |
| **Resolution** | **2K** (2048×2048). |
| **Format** | `curtains_albedo.jpg`, `curtains_rough.jpg`, `curtains_normal.jpg` — JPG quality 88. Optional `curtains_opacity.jpg` (1K, linear) if the pleats are made as cutouts rather than geometry. |
| **Channels** | **Albedo** (sRGB): soft woven plain-weave fabric, champagne `#d8c9a8` (or charcoal `#2a3038`), subtle horizontal/vertical weave, gentle vertical fold shading baked *very* lightly (≤5% luminance variation — fabric needs a hint of drape). **Roughness** (linear): 0.90–0.95 (matte woven). **Normal** (linear): fine weave bump, strength ~0.15; fold relief only if geometry can't carry it. **Opacity** (optional): white with dark pleat seams if cutting pleats out of a strip. **Emissive**: none. |
| **Tiling** | Seamless tile; UV repeat ~2×12 per window strip (repeat across the strip length, tile across each pleat). |
| **Prompt** | `Seamless tileable texture of soft woven curtain fabric, champagne beige plain weave with gentle vertical fold shading, matte premium drapery textile, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |

### 2.6 Dashboard / console — black gloss + brushed aluminum accents

| Field | Value |
|---|---|
| **Purpose** | Driver dash + center console area seen during the intro doorway shot and from the front rows. Two materials: glossy black plastic base + brushed aluminum accent strips. |
| **Resolution** | **1K** (1024×1024) — small on screen. |
| **Format** | `dashboard-gloss_albedo.jpg`, `dashboard-gloss_rough.jpg`, `dashboard-metal_albedo.jpg`, `dashboard-metal_rough.jpg`, `dashboard-metal_normal.jpg`, `dashboard-metal_metal.jpg` — JPG quality 88. |
| **Channels** | **Gloss black**: Albedo (sRGB) `#0c0e10` with a very soft sheen gradient; Roughness 0.30–0.40 (reflective but not mirror); Normal: none or 0.05 speckle; Emissive: none. **Brushed aluminum**: Albedo (sRGB) light silver `#b9c1c7`; **Metal** (linear) = 1.0; **Roughness** 0.28–0.35 with anisotropic direction (three.js `anisotropy` on `MeshPhysicalMaterial` pointing along the brush direction); **Normal** (linear) carries fine 0.1–0.2 mm brushed grooves, strength ~0.3. **Emissive**: none. |
| **Tiling** | Seamless tile; gloss repeats ~2×4; metal repeats ~1×6 along accent strips (brush runs along the strip length). |
| **Prompt (gloss)** | `Seamless tileable texture of glossy black automotive dashboard plastic, near-black with soft sheen gradient, smooth premium piano black finish, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |
| **Prompt (brushed metal)** | `Seamless tileable texture of brushed aluminum metal, fine unidirectional brush lines, light silver, satin anodized finish, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |

### 2.7 Driver seat — darker leather

| Field | Value |
|---|---|
| **Purpose** | Driver's seat. Reads darker than the passenger fabric seats (visual hierarchy: driver area recedes, cabin upholstery leads). |
| **Resolution** | **2K** (2048×2048). |
| **Format** | `driver-seat_albedo.jpg`, `driver-seat_rough.jpg`, `driver-seat_normal.jpg` — JPG quality 88. |
| **Channels** | **Albedo** (sRGB): near-black warm leather `#101114` → `#1a1c1f` with natural hide mottle; subtle piping seam in `#23262b`. **Roughness** (linear): 0.40–0.55 (leather sheen, not shine); seam slightly lower (0.35). **Normal** (linear): fine grain + faint seam groove, strength ~0.2. **Emissive**: none. |
| **Tiling** | Seamless tile; UV repeat ~2×2 on backrest, ~1.5×2 on cushion. |
| **Prompt** | `Seamless tileable texture of dark black leather automotive seating, near-black with subtle natural hide grain and faint piping seam, matte premium leather, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |

### 2.8 Door panels + hand rail — brushed steel/aluminum

| Field | Value |
|---|---|
| **Purpose** | Interior door cards (rear door + emergency door) and the aisle grab rail / stanchions. Metal handling is the spec here. |
| **Resolution** | Door panel **2K** (2048×1024 or 2048×2048); hand rail **1K**. |
| **Format** | `door-panel_albedo.jpg`, `door-panel_rough.jpg`, `door-panel_normal.jpg`, `handrail_albedo.jpg`, `handrail_rough.jpg`, `handrail_normal.jpg`, `handrail_metal.jpg` — JPG quality 88. |
| **Channels** | **Door panel**: Albedo (sRGB) dark slate `#1a2026` with a subtle horizontal brush on the lower half; Roughness 0.55–0.65; Normal fine grain 0.1; Emissive none. **Hand rail**: Albedo (sRGB) brushed steel `#aab2b8`; **Metal = 1.0**; Roughness 0.30–0.40; **Normal** carries unidirectional 0.2 mm brush grooves along the rail length (strength ~0.35). **Specular/roughness note:** do not set metalness on the door card (dielectric), only on the rail (metal). If using `MeshPhysicalMaterial`, enable `anisotropy` on the rail with the vector aligned to the rail's long axis so brush streaks track the rail under the aisle-walk camera. |
| **Tiling** | Door panel: tileable, repeat ~1×3 per door. Hand rail: repeat ~2×8 along each rail segment (brush direction = length). |
| **Prompt (door panel)** | `Seamless tileable texture of dark slate coach door panel with subtle horizontal brushed finish on lower half, matte automotive interior trim, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |
| **Prompt (hand rail)** | `Seamless tileable texture of brushed stainless steel handrail, fine unidirectional brush lines along length, satin steel, premium coach grab rail, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |

---

## 3. Exterior Hero Slots

### 3.9a Hero coach exterior — luxury Sri Lankan coach in dark studio

| Field | Value |
|---|---|
| **Purpose** | The intro B1 turntable hero shot (yaw sweep) and the resting frame backdrop. A stylized but credible super-luxury coach body: deep metallic teal-navy paint (brand `primary`-family restraint) with a thin `expressway` teal accent stripe, chrome trim, tinted glass, alloy wheels. |
| **Resolution** | **2K** (2048×2048) per map. |
| **Format** | `coach-paint_albedo.jpg`, `coach-paint_rough.jpg`, `coach-paint_normal.jpg`, `coach-paint_metal.jpg`, optional `coach-livery_albedo.jpg` (2K accent-stripe decal). JPG quality 88. |
| **Channels** | **Paint albedo** (sRGB): deep metallic teal-navy `#0a3a3d` → `#072a33`, very low-frequency mottle for flake; **Metal** (linear): 0.7 (painted metal body, but treated as dielectric-with-clearcoat in three.js: use `MeshPhysicalMaterial` with `clearcoat: 1`, `clearcoatRoughness: 0.06` and `metalness: 0.7`); **Roughness** 0.25–0.35 under clearcoat; **Normal** (linear): paint-level smoothness, strength ~0.05 only (do not sculpt body panels — that is geometry); **Emissive**: none. **Livery** (optional): a thin horizontal `expressway` teal `#14b8a6` stripe with a matte band; keep it 10% accent at most. Chrome bumpers/trim and alloy wheels use procedural metallic materials (metalness 1, roughness 0.1–0.2) — no texture needed. |
| **Tiling** | Paint tileable; UV repeat ~1×2 along the body side (side panels only — the front/hood use distinct unwraps, repeat 1×1). |
| **Prompt (paint)** | `Seamless tileable texture of deep metallic teal-navy automotive paint with fine metallic flake, subtle pearl sheen, premium luxury coach body color, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |
| **Prompt (livery)** | `Seamless tileable texture of a thin horizontal teal accent stripe on dark metallic navy paint, minimal elegant livery band, low contrast, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |

### 3.9b Background HDR environment — night city / rain-slicked depot

| Field | Value |
|---|---|
| **Purpose** | (1) Ambient reflections on all glass + paint via `scene.environment`; (2) the intro backdrop behind the coach (`scene.background` or a skydome). A night-city / rain-slicked depot gives strong soft color sources (cool city lights, warm sodium, wet-floor streaks) without screaming neon. |
| **Resolution** | **4K** (4096×2048 equirectangular) for desktop/HIGH tier. |
| **Format** | `env-nightcity_4k.exr` (EXR, half-float) — **the only heavy file in the pack**; alternatively `env-nightcity_2k.exr` (~4 MB) for the default build. Do **not** ship an HDR as a JPG (kills dynamic range the glass needs). |
| **Channels** | This is an environment map, not a PBR map. Keep peak luminance moderate (≤ 4–8 EV above mid-gray) so brand emissives stay the brightest thing in frame (brand guardrail). |
| **Tiling** | None — equirectangular 2:1, spherical mapping. |
| **Prompt** | `Equirectangular HDR environment map of an empty night bus depot after rain, wet asphalt with soft reflections, distant city lights, warm sodium street lamps, cool blue shadows, dark clean industrial atmosphere, premium cinematic lighting, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark` |

---

## 4. UI / Success Screen Slot

### 4.10 QR ticket card backdrop — premium dark-tile pattern

| Field | Value |
|---|---|
| **Purpose** | The background tile behind the QR e-ticket card on the success screen (and reusable as the `/pay` review backdrop). Should read "premium stationery", never "wallpaper". |
| **Resolution** | **1K** (1024×1024) is enough; 2K if used as a full-screen CSS layer at high DPI. |
| **Format** | `qr-ticket-backdrop_albedo.jpg`, `qr-ticket-backdrop_rough.jpg` — JPG quality 85. |
| **Channels** | **Albedo** (sRGB): dark slate `#0f172a`→`#131c2c` with a very subtle geometric diamond/micro-tile lattice in `#1a2436` (contrast ≤ 8% — the QR and card text must dominate). **Roughness** (linear): 0.7 uniform (used if this backdrop is a 3D plane; as a CSS background it is flat). **Emissive**: none. **Normal**: skip (flat). |
| **Tiling** | Seamless tile; CSS `background-repeat: repeat`, tile size ~64–96 px for a fine grain. |
| **Prompt** | `Seamless tileable texture of a premium dark slate background with a very subtle geometric diamond lattice pattern, near-black blue-grey, ultra low contrast elegant tile, flat even lighting, top-down orthographic view, photorealistic, octane render, studio lighting, premium, ultra clean, no text, no watermark, seamless texture` |

---

## 5. Budget Table (target ≤ 40 MB, mobile)

Sizes are *targets* at the stated quality; tune JPG quality down (to 82) rather than resolution to stay under budget.

| # | Slot | Files | Resolution | Target size |
|---|---|---|---|---|
| 1 | Seat upholstery | albedo, rough, normal | 2K ×3 | 3.9 MB |
| 2 | Coach floor | albedo, rough, normal | 2K ×3 | 3.3 MB |
| 3 | Ceiling / rack trim | albedo, rough, normal | 2K ×3 | 2.8 MB |
| 4 | Window glass | albedo (optional) | 1K ×1 | 0.3 MB |
| 5 | Curtains | albedo, rough, normal (+ opacity opt.) | 2K ×3 | 3.7 MB |
| 6 | Dashboard / console | gloss (2) + metal (4) | 1K ×6 | 2.2 MB |
| 7 | Driver seat | albedo, rough, normal | 2K ×3 | 3.4 MB |
| 8 | Door panels + hand rail | door (3) + rail (4) | 2K + 1K ×7 | 4.0 MB |
| 9a | Coach paint + livery | paint (4) + livery (opt.) | 2K ×5 | 4.1 MB |
| 9b | Night-city HDR | 1 EXR | 4K / 2K | 8.0 MB |
| 10 | QR backdrop | albedo, rough | 1K ×2 | 0.9 MB |
| | **Total** | | | **≈ 36.6 MB** |

**Loader notes**
- Stream **9b last** and non-blocking (`<Suspense>` / lazy); everything else is small enough to preload with the seat payload.
- On LOW tier (FPS < 45 per game spec §6.2) skip 9b, load 2K variants, and use procedural materials for metal slots.

---

## 6. Fallback Note — Procedural Color Substitution (no assets yet)

If textures are **not yet available** (or the page is in reduced-motion / low-tier / WebGL-fallback mode), every slot degrades to a procedural color material with **zero image assets**. Keep this map in one module (`lib/coachMaterials.js` or similar) so it can be swapped to the texture pack with one flag.

| Slot | Procedural fallback (MeshStandardMaterial) |
|---|---|
| Seat upholstery | `color: #0f2a33`, `roughness: 0.8` |
| Coach floor | `color: #141b24`, `roughness: 0.6` |
| Ceiling / rack trim | `color: #15191d`, `roughness: 0.9` |
| Window glass | `MeshPhysicalMaterial`, `color: #0a1a17`, `transmission: 1`, `roughness: 0.05` (or `transparent + opacity: 0.7` on LOW tier) |
| Curtains | `color: #d8c9a8`, `roughness: 0.95` |
| Dashboard gloss | `color: #0c0e10`, `roughness: 0.35` |
| Dashboard metal | `color: #b9c1c7`, `metalness: 1`, `roughness: 0.3` (+ `anisotropy` if available) |
| Driver seat | `color: #141619`, `roughness: 0.5` |
| Door panel | `color: #1a2026`, `roughness: 0.6` |
| Hand rail | `color: #aab2b8`, `metalness: 1`, `roughness: 0.35` |
| Coach paint | `MeshPhysicalMaterial`, `color: #0a3a3d`, `metalness: 0.7`, `roughness: 0.3`, `clearcoat: 1`, `clearcoatRoughness: 0.06` |
| QR backdrop (CSS) | `background: linear-gradient(135deg, #0f172a, #131c2c)` with a subtle repeating-linear-gradient lattice at 3% opacity |
| Environment (fallback) | drei `<Environment preset="city" />` (built-in) — never block the scene on the EXR |

---

*End of asset pack v1.0 — run the prompts, land files into `frontend/public/tex/`, wire per slot table, stay ≤ 40 MB, and keep the procedural fallback wired for the first build.*
