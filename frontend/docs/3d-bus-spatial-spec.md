# VyGo 3D Coach Interior — Spatial & Lighting Specification

> **Guardian**: Unreal World Builder (spatial / lighting specialist) · **Status**: v1.0 · **Scope**: React Three Fiber coach-interior scene in `frontend/src/components/seat3d/` (the `BusInterior3D` shell + seats that render behind the booking HUD).
> **Companion files**: `frontend/docs/brand-premium.md` (tokens, seat-state semantics, motion), `frontend/docs/seat-3d-flow-architecture.md`, `frontend/docs/seat-3d-ui-spec.md`, and the live sources `BusInterior3D.jsx`, `seatMeta.js`, `seatGeometry.js`.
> **Rule of the document**: Specifies intent and target numbers. It is the review standard for the 3D scene — treat it as guidance for future work, not as a mandate to rewrite shipped geometry.

---

## 0. Conventions

| Convention | Value |
|---|---|
| Scene units | 1 scene unit = **1 meter** (the current shell is already authored in meters) |
| Axis X | Lateral width: **left = −X, right = +X** (driver side −, entrance side +) |
| Axis Y | Up: **floor Y = 0**, ceiling ≈ 2.03–2.06 |
| Axis Z | Length: **front = −Z** (windshield ≈ −6.25), **rear = +Z** (tail ≈ +6.25) |
| Row 1 position | First row centerline at **Z = −4.15** (matches `ROW_START_Z`) |

**Realism note (driver side).** Sri Lanka drives on the left, so the production fleet is right-hand-drive: driver sits on the **right**, kerb entrance on the **left**. The VyGo scene deliberately adopts the mirrored arrangement — **driver cabin left, entrance right** — to match the existing component's coordinate system and to read better from the isometric settle camera. This is an accepted scene convention. If hard real-world fidelity is ever required, mirror X (the spec numbers stay identical).

**Number key** used throughout: **[HARD]** = legal/safety/ergonomic floor — treat as fixed. **[FLEX]** = believable range, tune to art. **[GUIDE]** = best-practice for camera/readability, not physically enforced.

---

## 1. Dimensions & Ergonomics

### 1.1 Bus-level envelope

| Dimension | Value | Rule | Notes |
|---|---|---|---|
| Overall length | **12.0–12.5 m** | HARD: ≤ 12.5 m is the practical coach maximum (expressway classes) | Scene shell: 12.5 m box + bumpers ✓ |
| Overall width | **2.50 m** | HARD: legal maximum, body panels included | Scene shell: 2.5 m ✓ |
| Interior width (wall-to-wall) | **2.34 m** | HARD: keep this exact number — the seat layout math in `seatMeta.js` keys off it | `interiorW = 2.34` ✓ |
| Overall height | 3.3–3.5 m | FLEX | Roof pod carries the AC pack; not part of the interior set |
| Interior ceiling height above **aisle** | **1.90–2.00 m** | HARD: never below 1.85 m standing clearance + margin | Scene ceiling ≈ 2.03–2.06 ✓ |
| Interior ceiling height above **seat rows** | 1.70–1.80 m | FLEX | Only headroom while seated matters here |
| Floor thickness | 0.05–0.08 m | FLEX | Floor top must sit at **Y = 0**; everything above it is interior |

### 1.2 Aisle and standing space

| Dimension | Value | Rule | Notes |
|---|---|---|---|
| Aisle clear width (between armrests / seat edges) | **0.40–0.45 m** | HARD: never below 0.40 m | The scene's 0.58 m *floor marker* is fine, but armrests and seat-box bulk must constrict the walkable corridor to 0.40–0.45 m |
| Aisle floor marker strip | 0.50–0.60 m wide | GUIDE | Painted/walk-off strip, slightly recessed (Y ≈ 0.005) — existing strip ✓ |
| Aisle headroom | **1.90–2.00 m** | HARD | Lowest light/rack protrusion must clear this |
| Overhead luggage rack bottom | 1.65–1.75 m above floor | FLEX | Racks run over the seats, **not** over the aisle, so aisle headroom stays clean |
| Step-well (entry) step height | 0.25–0.38 m | FLEX | Two-step entry from ground to floor level |

### 1.3 Seats and rows

| Dimension | Value | Rule | Notes |
|---|---|---|---|
| Seat pitch (identical point → identical point, row to row) | **0.70–0.80 m** (28–31.5 in) | HARD: **constant** across the cabin, ±2 mm | Luxury 0.70–0.76; Super Luxury recliners 0.78–0.80. Scene `ROW_PITCH = 0.85` is roomier than the luxury band — acceptable only as a "spacious" choice; tighten to ≤ 0.80 for authenticity |
| Seat cushion width | **0.43–0.46 m** | FLEX | Scene `seatW = 0.44` ✓ |
| Cushion top height above floor | 0.45–0.48 m | FLEX | Existing seat base (0.05) + cushion (0.21) ≈ 0.26 — **raise the cushion so the seat eye-line is realistic** |
| Backrest height above cushion | 0.68–0.75 m | FLEX | Existing 0.60 is close |
| Headrest | 0.14–0.16 m tall, ~0.10 above backrest top | FLEX | |
| Armrest width | 0.05–0.07 m each | FLEX | Center armrests between aisle seats; these are what make the aisle read as 0.40–0.45 m |
| Leg space under front seat | ≥ 0.16 m clear | FLEX | Footwell must be visually empty |
| Row count (12.5 m luxury) | 11–13 rows + rear bench | GUIDE | At 0.76 m pitch ≈ 12 rows before the rear |

**Seat-pitch rule in practice.** Seat pitch is the *planning* distance. The visible gap between seat backs will be pitch minus seat depth (≈ 0.30–0.39 m). Do not tune "legroom" by widening the gap on one row — that breaks the perspective rhythm the isometric camera depends on.

### 1.4 Door, entry, and exits

| Item | Value | Rule | Notes |
|---|---|---|---|
| Entrance door side | **Right side** (project convention, X ≈ +1.27) | HARD for this scene | Door in front of row 1 (Z ≈ −5.12, row 1 at −4.15) ✓ |
| Door leading edge from front bumper | **1.1–1.5 m — ahead of the front axle** | HARD: door must be ahead of front axle (axle ≈ 1.6–1.9 m from bumper) | Scene door at Z ≈ −5.12 → well ahead ✓ |
| Clear opening width | 0.80–0.90 m (double leaf) | FLEX | Scene: two 0.42 m leaves + 0.86 m fixed panel ≈ right scale ✓ |
| Clear opening height | 1.85–1.95 m | FLEX | Scene door 2.0 m tall ✓ |
| Door swing | Outward / folding — **never into the aisle** | HARD | The door must not intersect the aisle corridor or row 1 when animating open |
| Rear emergency exit | Rear wall or rear-left, 0.70–0.90 m wide, ≥ 1.20 m tall | HARD: present + **labeled** + path unobstructed | Scene has the rear wall + green exit light ✓ |
| Roof escape hatch | Above the rear third | GUIDE | Small emissive frame; the green exit sign is the visible cue |
| Entry step-well | At the door, 2 steps | FLEX | Add a step-well block + grab handle beside the door — makes the entrance read as real |

### 1.5 Driver cabin

| Item | Value | Rule | Notes |
|---|---|---|---|
| Cabin side | **Left** (project convention, X ≈ −0.65) | HARD for this scene | Scene dash cluster at Z ≈ −5.15 ✓ |
| Partition | Wall + sliding window between cabin and cabin 1 | GUIDE | Keeps the driver's screen glow from spilling onto the seats |
| Dashboard screen | Cool cyan glow (≈ #22d3ee), low intensity | GUIDE | Existing screen ✓ — it is a *practical* light source, not a key light |

### 1.6 Layout schematic (top view, meters)

```
            FRONT  (Z ≈ −6.25) — windshield band
 ┌────────────────────────────────────────────────┐
 │ left wall X=−1.25                              │
 │   driver cabin │   [row1] [row2] ... [row11]   │
 │   dash/screen  │   [1L][1R]  [2L][2R]  ...     │
 │   partition    │        ▲ aisle 0.40–0.45 m    │
 │                │   [row1] [row2] ... [row11]   │
 │ right wall X=+1.25   door (X≈+1.27, ahead of   │
 │                      front axle)               │
 └────────────────────────────────────────────────┘
            REAR  (Z ≈ +6.25) — [ EMERGENCY EXIT ]
```

---

## 2. Lighting Rig

Two lighting layers coexist: **practical** (diegetic coach lights the camera can see) and **film** (the 3-point rig that makes the scene read on camera). Every practical light should exist as an emissive mesh so the film light feels motivated.

### 2.1 Practical coach lighting (all diegetic)

| Light | Placement | Color / temp | Emissive intensity | Purpose |
|---|---|---|---|---|
| Ceiling LED strips — **2–3 full-length rows** | Two strips along the aisle edges (X ≈ ±0.35, Y ≈ 2.00), optional 1 center row; recessed so nothing protrudes below 1.95 m | Warm **3600 K** (3200–4000 K range) | 1.2–1.6 | Main cabin light, day & evening |
| Row downlights | One small recessed dome above each row pitch (Z at each row) | Warm 3200 K | 0.9–1.2 | Reads the row rhythm; aids the seat grid |
| Amber aisle night lights | Thin continuous strips at Y ≈ 0.15–0.30 along both sidewalls at floor level | **Amber 2300 K** (#ffb020 family) | 0.5–0.8 | Night mode; protects driver night vision — standard on intercity coaches |
| Teal accent strips | **Under-seat edge strips** (pointing down, both sides of the aisle) or window-sill edge below the curtain line | **Expressway-400 `#2dd4bf`** (brand teal; *not* seat blue) | 0.6–0.8 (never above 1.0) | The "luxury" cue — calm, low, reflective on the floor |
| Dashboard screen glow | Driver cabin screen (X ≈ −0.78, Z ≈ −5.67) | Cool cyan `#22d3ee` | 1.2–1.4 | Practical; must be blocked from the seats by the partition |
| Door courtesy light | Step-well, at the entrance | Warm 3000 K | 0.8 | Makes the entrance read; frames the front of the aisle |
| Rear exit sign | Rear wall above the exit | Green `#4ade80` | 1.0 | End-of-aisle anchor point (visual full-stop) |

**Night mode** (recommended): when the product wants an "overnight express" feel, drop ceiling strips to 0, keep amber aisle lights + teal accents + exit sign. This is the authentic overnight-coach look on E01/E03 and it makes the selected-seat emissive pop.

### 2.2 Camera-friendly 3-point film rig (plausible, not neon)

| Role | Position | Temp / color | Intensity vs key | Motivation |
|---|---|---|---|---|
| **Key** | Front-left, high, outside the coach (above the windshield), angled ~45° down the aisle | Warm 3200 K | 1.0 | Station canopy / morning light coming in the front |
| **Fill** | Front-right, low (entry side), soft | Neutral 4500–5000 K | 0.3–0.5 | Doorway glow / dawn ambient |
| **Rim / back** | Behind the rear bench, above the rear wall | Cool 6500 K or neutral | 0.4 | Separates the last row from the rear wall; prevents the rear from reading flat |
| Practical bounce | Teal under-seat strips double as bounce fill for seat undersides | #2dd4bf | — | No extra light needed |

### 2.3 Exposure & bloom (subtle, per brand guardrail §7)

- Tone mapping: **ACES Filmic** (r3f: `gl.toneMapping = THREE.ACESFilmicToneMapping`).
- Exposure: **1.0–1.2** (`gl.toneMappingExposure = 1.05`). If highlights clip, lower exposure before touching bloom.
- Bloom (drei `Bloom`): `intensity = 0.15–0.3`, `luminanceThreshold ≈ 1.0`, `mipmapBlur` on. Only the practical lights bloom — **never** the seat-state colors (selected-seat glow stays a material emissive, not bloom).
- Emissive ceiling: keep practical emissive intensities **≤ 1.0–1.2 EV above mid-gray** (per brand: calm, not neon). The only permitted bright elements are the LED strips, exit sign, and dashboard.

---

## 3. Materials Reference

Three.js (`meshStandardMaterial` / `meshPhysicalMaterial`) values. Roughness is the dominant realism lever; metalness only on metal.

| Material | Roughness | Metalness | Clearcoat | Notes |
|---|---|---|---|---|
| Fabric (seat cushions, curtains) | **0.9** | 0.0 | — | Diffuse, matte; no sheen. Velvet-ish curtains can drop to 0.85 |
| Leather (headrests, armrests, trim) | **0.5** | 0.0 | 0.2 | Slight sheen via clearcoat; keep roughness 0.45–0.6 |
| Soft plastic (wall panels, dash, rack trim) | **0.4** | 0.0 | — | The default interior panel look |
| Brushed metal (grab rails, poles, door frame, hinges) | **0.35** | 1.0 | — | Anisotropy optional; a plain `#94a3b8` metalness 0.9–1.0 is fine |
| Glass (windows, partition) | **0.05** | 0.0 | **1.0** | Use `meshPhysicalMaterial`, `transmission ≈ 0.9`, `transparent`, low opacity in scene (0.2–0.35) |
| Rubber (floor mat) | 0.8 | 0.0 | — | Anti-slip mat, subtly lighter than the floor |
| Carpet (aisle marker) | 0.9 | 0.0 | — | Matches existing aisle strip |
| Aluminum (ceiling panels, optional) | 0.4 | 0.85 | — | Only if the art wants a lighter ceiling |

**Brand-token color mapping** (single source of truth: `brand-premium.md`):

| Surface | Token / hex | 3D use |
|---|---|---|
| Seat · Available | `#3b82f6` | seat-state base color (from `SEAT_COLORS`) |
| Seat · Selected / Booked / Locked / VIP / Ladies / Accessible | `#22c55e` / `#ef4444` / `#f97316` / `#eab308` / `#ec4899` / `#a855f7` | seat-state materials only — never page chrome |
| Interior wall panels | `surface-2` `#1e293b` | side panels, partitions |
| Interior floor | `surface-2` darkened (`#1b2536`) | floor box |
| Aisle marker | darker than floor (`#0f1826`) | recessed walk-off strip |
| Ceiling | `surface-2` (`#1b2536`) | ceiling panel |
| Accent / trim | `surface-3` `#334155` → `expressway-400` `#2dd4bf` (light accents) | trim strips, under-seat LEDs |
| Teal accent light | `expressway-400` `#2dd4bf` | under-seat / window-edge strips (brand corridor family — matches §7 "one accent family") |
| Metal | `#94a3b8` | poles, rails, door frame |
| Curtain | warm dark (`#5b3345`) or charcoal | curtains — keep warm, never teal |

**r3f notes**: share a small material pool (create in `useMemo`, dispose on unmount — the scene already does this). Use `meshPhysicalMaterial` only for glass and leather; everything else `meshStandardMaterial` to keep the frame budget. Seat numbers must stay near-black `#020617` on every state (brand §2.4 — white fails on the saturated states).

---

## 4. Camera-Friendly Framing

Target composition: the isometric settle camera sits **front-left, above the windshield**, pitched ~25–35°, aimed down the aisle toward the rear exit sign, with both row-banks partially visible and the aisle as the leading line.

### 4.1 Window & curtain placement

- **Glass band**: window glass from Y ≈ 1.0 (belt line) to Y ≈ 1.8 (cant rail). Seat backrests (≈ 0.5–1.05 m) must sit **below the glass line** so rows read as solid silhouettes with sky/glass above.
- **Curtains**: hang from the top of the glass band (Y ≈ 1.75–1.85), valance style, and **draw them only in the front 1–2 bays and the rear bay**. Keep the middle 2–3 bays open so daylight motivates the key, and so curtains never slice across a seat row in the frame.
- Window bays: 6–8 per side on a 12.5 m coach; the scene's 6 are acceptable.

### 4.2 Aisle clutter rule

- **Nothing between Y = 0.02 and Y = 0.50 inside the aisle corridor** (X from ≈ −0.25 to +0.25, full length) except the recessed floor strip and the flush amber night strips. No baggage, no cables, no stage geometry.
- Footwells must be visually open; the eye must run from the door step to the rear exit sign without interruption.

### 4.3 Handrail placement

- Vertical poles: keep at the **door** and the **driver partition** (Z ≤ −4.0), and at row gaps — but always offset to the aisle edge (X ≈ ±0.30–0.35, *not* X = 0) so they hug the seat row they serve.
- **Settle-angle rule**: no pole may sit on the ray between the settle camera and any seat face. Check the four existing poles (Z ∈ {−4.0, −1.2, 1.6, 3.0}) from the settle camera; if a pole crosses a seat, move it to the neighboring row gap.
- Horizontal grab rail: run it high at Y ≈ 1.90–1.95, above the glass band, so it never occludes a window or a seat row.

### 4.4 Settle framing checklist

- Aisle line is straight and unobstructed to the exit sign.
- Row pitch constant → rows stack in a clean rhythm toward the rear (no broken perspective).
- Seat numbers face the aisle (camera side) and never z-fight with the seat back.
- Rear bench (Normal) or last 2+2 row (Super Luxury) is the visual full-stop before the rear wall.
- Curtains, poles, and the partition never cross the middle third of the frame.

---

## 5. Scale / Realism Checklist — 12 Binary Checks

Run all 12 before shipping a scene change. All must pass as **PASS**; a single FAIL blocks the milestone.

| # | Check | Pass criterion | Typical fail symptom |
|---|---|---|---|
| 1 | Seat pitch constant | Every row gap within ±2 mm of the class pitch (0.70–0.80 m) | One row visibly wider; perspective rhythm breaks |
| 2 | Rear bench exists (Normal) | Normal layout ends in a full-width rear bench; Super Luxury ends in a 2+2 row | Cabin ends with a wall gap or an empty floor |
| 3 | Emergency exit labeled | "Emergency Exit" + green running-man pictogram above the rear exit, emissive at night | Green dot with no sign; exit invisible |
| 4 | No floating geometry | Every mesh touches floor/wall/ceiling or a parent; verify with half-extent math | A seat, rack, or strip hovering off its support |
| 5 | Floor plane extends under seats | Floor mesh footprint covers every seat base, including the rear bench | Visible floor seam / void under a seat row |
| 6 | Door clears the aisle | Door leaf + step-well never intersect the aisle corridor or row 1 when open | Door swings across the aisle or clips row 1 |
| 7 | Door ahead of front axle, correct side | Door leading edge ahead of axle; entrance on the right (project convention) | Door mid-wheelbase, or on the driver side |
| 8 | Aisle headroom ≥ 1.90 m | Lowest ceiling light/rack protrusion ≥ 1.90 m above floor in the aisle | A strip or rack hanging below head height |
| 9 | Aisle clear at seat level | Nothing between Y 0.02 and Y 0.50 in the aisle corridor | Luggage, wires, or props blocking the walk line |
| 10 | Lights recessed | Strip lights flush with the ceiling; nothing protrudes below the ceiling plane | LED strips floating under the ceiling or clipping it |
| 11 | Rear exit path clear | No seat, rack, or pole blocks the rear emergency exit path | Rear bench or luggage rack overhanging the exit |
| 12 | Settle camera unobstructed | No handrail/partition/curtain crosses the settle sightline to any seat row | A pole or curtain slices a seat row in the final frame |

---

## Appendix A — Quick Number Card

```
Bus length         12.0–12.5 m      [≤12.5 HARD]
Bus width           2.50 m          [HARD]
Interior width      2.34 m          [HARD — layout key]
Aisle height        1.90–2.00 m     [≥1.85 HARD]
Seat pitch          0.70–0.80 m     [constant HARD; luxury 0.70–0.76, super 0.78–0.80]
Seat width          0.43–0.46 m
Aisle width         0.40–0.45 m     [≥0.40 HARD]
Cushion top         0.45–0.48 m
Door opening        0.80–0.90 × 1.85–1.95 m, ahead of front axle, right side
Rear exit           labeled, path unobstructed
Ceiling strips      2–3 rows, 3600 K warm
Aisle night lights  amber 2300 K, Y ≈ 0.15–0.30
Accent strips       expressway-400 #2dd4bf, ≤ 1.0 emissive
Exposure            ACES Filmic, 1.0–1.2; bloom threshold ≥ 1.0, intensity 0.15–0.3
```

## Appendix B — Source Alignment Notes (current scene vs this spec)

| Item | Current scene (`BusInterior3D.jsx` / `seatMeta.js`) | Spec | Action |
|---|---|---|---|
| Units | meters ✓ | meters | none |
| Interior width | 2.34 | 2.34 HARD | match ✓ |
| Seat pitch | `ROW_PITCH = 0.85` | 0.70–0.80 | tighten to ≤ 0.80 for authenticity (optional) |
| Seat width | 0.44 | 0.43–0.46 | match ✓ |
| Aisle floor marker | 0.60 | 0.50–0.60 strip; 0.40–0.45 clear | add armrests to constrict walkable width |
| Cushion height | base 0.05 + cushion 0.21 | 0.45–0.48 top | raise seat eye-line |
| Ceiling | Y ≈ 2.03–2.06 | 1.90–2.00 | match ✓ (add racks below 1.75 over seats) |
| Door | right side, Z ≈ −5.12, ahead of row 1 | right, ahead of axle, clears aisle | match ✓ |
| Driver cabin | left, Z ≈ −5.15 | left | match ✓ |
| Ceiling lights | 1 center row (X = 0) | 2–3 rows | add side rows |
| Amber night strips | absent | present at Y 0.15–0.30 | add |
| Teal accents | wall strips X ±0.98 at Y 1.78 | under-seat / sill, brand teal | move lower / toward seats |
| Poles | X ±0.32, Z {−4.0, −1.2, 1.6, 3.0} | edge-hugging, never on settle sightline | verify from settle camera |
| Rear exit | green light ✓ | labeled sign + hatch | add sign geometry |
