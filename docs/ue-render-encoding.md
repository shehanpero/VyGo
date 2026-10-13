# UE Cinematic Intro — Render & Encoding Pipeline Plan (Stretch Only)

**Date:** 2026-08-02
**Stack:** Unreal Engine 5 · Movie Render Queue (MRQ) · CI (the future Agent-1 asset pipeline)
**Scope:** Producing the shipped intro video from the UE scene. The frontend today plays a pre-rendered MP4/WebM; this plan defines how that file is authored from the real UE build, at what quality, and how the frontend decodes/falls back safely. Document only; no code, no assets, repo untouched.

## Verdict

**Encode the CI-rendered UE intro as 1080p30 H.264 (2-pass, ~3 Mbps) with a VP9 fallback, and keep the existing frontend decode watchdog.** This is the default shipped path. Pixel streaming stays gated behind the separate go/no-go (see `ue-cinematic-architecture.md`); when the asset lands, the same job simply re-renders from the real UE build.

## Render settings (MRQ)

- **Resolution:** 1920×1080, 30 fps.
- **Accumulations:** 8 samples per frame for static clarity; dynamic segments (door open) may need 16 — benchmark once.
- **Anti-aliasing:** use MRQ's temporal accumulation; do not add extra post-AA.
- **Lighting:** baked where possible (scene plan forces LOD0 + baked static), dynamic only for the door/camera beats.
- **Output:** EXR frames → encode pipeline (not a single giant render).

## Encode ladder

| Deliverable | Codec | Spec | Purpose |
|---|---|---|---|
| Primary | H.264 | 1080p30, 2-pass, ~3 Mbps, keyframe ≤ 2 s, `faststart` (moov front) | Broadest device support, low file size |
| Fallback | VP9 | 1080p30, ~2.5 Mbps | Browsers/OS lacking H.264 hardware decode |
| Poster | JPEG | 1280×720 | Preload placeholder before `play()` |

- Target file size ≈ 9 s × 3 Mbps / 8 ≈ **3.4 MB** (H.264), comfortably inside any budget.
- CDN headers: `Cache-Control: public, max-age=31536000, immutable` (video is content-addressed/versioned).

## Frontend playback contract (unchanged from today's plan)

- `<video>` with `preload="metadata"` (poster first), `muted`, `playsInline`, `autoplay` attempted only after a user gesture or visibility is verified.
- **Decode watchdog:** if no `canplay`/`timeupdate` within 2.5 s of attempting play, fall back to the next path in the chain (CSS fade). Prevents a stuck black screen on flaky networks.
- Same player component used by all three paths (pixel stream → MP4/WebM → CSS fade), so a failure at any layer degrades gracefully.

## Verification gate

- Watchdog-tested with throttled emulation (Slow 3G) — must reach fallback within the budget.
- Mobile/metered check before video playback: if data-saver or metered connection, go straight to CSS fade.

*Filed by: UnrealSystemsEngineer subagent.*
