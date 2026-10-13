# UE Cinematic Intro — Scene Composition Plan (Stretch Only)

**Date:** 2026-08-02
**Stack:** Unreal Engine 5 · future Agent-1 asset pipeline · current shipping path = pre-rendered MP4/WebM from CI
**Scope:** A real-UE cinematic fly-in as an optional stretch. This is the scene-composition plan that matches the existing R3F `IntroRig` timeline 1:1 so the shipped video and a future pixel-streamed intro are indistinguishable. Document only; no code, no assets, repo untouched.

## Verdict

**Build the UE scene to be a frame-for-frame replica of the existing R3F intro.** The R3F `IntroRig` (BoardingSequence.jsx) defines camera, timing, door, and shell behavior that users already see; a UE version that drifts from it breaks continuity. Matching the timeline 1:1 means the CI-rendered video, the pixel-streamed intro, and the current R3F intro are interchangeable with no user-visible difference.

## Reference timeline (current R3F `IntroRig`, total ≈ 8.7 s)

| t (s) | Phase | Camera | Action |
|---|---|---|---|
| 0.0–0.2 | 1 | (11, 5.5, 10) → look (0, 1.6, 0) | Establish — full coach, slight high-angle hero |
| 0.2–4.4 | — | turntable | Yaw 360° over 4.2 s (power1.inOut) |
| 0.6 | 2 | — | "Step aboard" HUD label |
| 0.7–1.8 | 3 | dolly to (5.2, 2.4, -5.4) → look (1.3, 1.3, -4.9) | Sweep toward the door side |
| 1.7 | — | — | door-open label (hiss) |
| 1.8–2.7 | 4 | — | Door opens 0→1 (power2.out, 0.9 s) + pneumatic hiss |
| 2.7 | — | — | "step aboard" HUD |
| 2.8–4.0 | 5 | dolly to (0.7, 1.6, -4.1) → look (0, 1.2, -2.0) | Low aisle approach; shell fades 1→0 over 1.1 s |
| 4.1–6.1 | — | dolly to (0, 1.65, 1.6) → look (0, 1.35, -2.2) | Aisle pass (power1.inOut, 2.0 s) |
| 6.2–7.2 | 6 | to (0.5, 3.6, 3.8) → look (0, 1.2, -0.4) | Rising hero reveal over roof |
| 7.3–8.3 | 7 | to SETTLE_CAM (4.6, 7.4, 8.6) → look (0, 0.7, 0.3) | Settle — exact seat-selection camera (InteriorRig also uses this) |

**Hard requirement:** the final frame must land exactly on `SETTLE_CAM` so the video ends on the same camera the seat picker starts from.

## Scene contents (mirror the R3F build)

- **Palette:** floor `#0f172a`-family; seats per spec — available `#2563EB`, selected `#16A34A`, booked `#DC2626`, reserved `#F97316`, VIP `#D4AF37`, ladies `#EC4899`, accessible `#7C3AED`; emissive tints matching the tier presets (high-tier glow, low-tier flat).
- **Coach shell:** semi-transparent shell that fades out (the R3F `shell: 1→0`), interior visible through the fly-around.
- **Seat grid:** NORMAL bus = 3+2, LUXURY/SEMI_LUXURY/AC = 2+2, aisle gap and row pitch matching `seatPositionFor` in seatMeta.js.
- **Door rig:** animates open for the "step aboard" beat; audio hiss laid on the same frame.
- **Lighting:** ambient + hemisphere mimic (cool top, warm accents), one key directional, shadow matching tier high.

## Delivery expectations

- Scene built to run at 1080p30 minimum, forced LOD0, baked static lighting; dynamic pass only where the door/camera demand it.
- Exported as glTF with exact colors preserved (no tone-mapping drift) for any runtime use.
- When the asset lands, the CI job renders this scene once and produces the MP4/WebM that the frontend ships today.

## Files consulted

- `frontend/src/components/seat3d/BoardingSequence.jsx` — `IntroRig` timeline + `SETTLE_CAM`
- `frontend/src/components/seat3d/seatMeta.js` — layout math, seat colors/categories
- `frontend/src/components/seat3d/Seat3D.jsx` — spec colors, tier behavior

*Filed by: UnrealWorldBuilder subagent.*
