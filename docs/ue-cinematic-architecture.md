# VyGo "Cinematic Mode" — UE Pixel Streaming Architecture Plan (Stretch Only)

**Scope:** One optional stretch: a real-UE intro fly-in played as a cinematic before/surrounding seat selection. This is the architecture plan for delivering it via UE Pixel Streaming. Repo untouched. Decision-focused, ~1 page.

---

## 0. TL;DR Recommendation

**Ship the pre-rendered video path as the default. Treat Pixel Streaming as a later opt-in behind an explicit go/no-go gate.**

Rationale up front: this repo has **zero UE assets**, and the master spec's own Agent-1 asset pipeline (the thing that would produce a real fly-in) is **unbuilt**. Pixel Streaming today would stream an empty/placeholder level while carrying a GPU fleet, a TURN relay, and an abuse surface. The customer-visible result of "real UE fly-in" can be reproduced at ~5,000x lower cost with a CI-rendered MP4/WebM until the asset exists.

---

## 1. Pixel Streaming Topology (Intro-Only, if/when built)

- **One UE app instance per stream.** The Pixel Streaming plugin is one-to-one; do not multi-tenant the cinematic.
- **Instance sizing (AWS G5, verified pricing July 2026, us-east-1 Linux on-demand):**

| Instance | vCPU | RAM | GPU | VRAM | $/hr | Verdict |
|---|---|---|---|---|---|---|
| `g5.xlarge` | 4 | 16 GiB | 1× NVIDIA A10G | 24 GiB | **$1.006** | **Default.** Fixed-camera 1080p30 fly-in fits easily |
| `g5.2xlarge` | 8 | 32 GiB | 1× NVIDIA A10G | 24 GiB | $1.212 | Only if scene needs >4 vCPU (heavy physics/streaming shader cost) |
| `g4dn.xlarge` (cheaper alt) | 4 | 16 GiB | 1× NVIDIA T4 | 16 GiB | $0.526 | Acceptable fallback; 1 session/GPU for quality guarantee |

  Note: G5 xlarge vs 2xlarge share the **same A10G — VRAM is 24 GiB on both**, so the sizing decision is CPU/RAM, not VRAM. A bus-scene cinematic sits well under 8 GiB VRAM.

- **Components (per region):**
  - **GPU instance (private subnet, no public IP):** packaged UE app launched with `-RenderOffScreen` + Pixel Streaming plugin, co-located **signalling server** (Epic `PixelStreamingInfrastructure`), and **coturn** for TURN.
  - **Matchmaker** (lightweight m5.large, the only public orchestration endpoint): registers streamers, assigns a browser to a free streamer, enforces capacity/TTL.
  - **Public connectivity:** browser → **WSS** → signalling; WebRTC PeerConnection carries H.264/VP9 media. **STUN** (self-hosted) discovers NAT mappings; **TURN** relays when direct fails (mobile carriers, corporate NAT). coturn with **short-lived HMAC REST credentials** and a restricted relay port range.
- **Connection lifecycle:** (1) backend issues signed session ticket; (2) frontend requests `GET /streaming/ticket`; (3) matchmaker returns a signalling WSS URL bound to the ticket; (4) SDP/ICE negotiation; (5) media flows until video ends; (6) client sends "done" or TTL fires → streamer freed back to pool.
- **Auth/billing guardrails:** ticket TTL 90 s, single-use, bound to `userId + bookingId + nonce`, Redis-backed. Instance hard TTL **120 s** (9 s video + margin) then kill. Warm-pool max cap, per-user daily ticket cap, ticket issuance gated on seat-lock/entitlement. CloudWatch billing alerts on egress and stream-hours.

---

## 2. Latency Reality-Check (Validates the Spec)

- **Interactive round-trip (click → frame):** network RTT 30–80 ms + encode 10–30 ms + decode 5–15 ms + JS/display ≈ **100–250 ms typical, 300 ms+ on poor links**; one-way glass-to-glass for WebRTC is commonly 200–500 ms.
- **Cinematic (6–9 s non-interactive fly-in):** only one-way latency matters. 200–500 ms is **imperceptible** for a cutscene — equivalent to any live-stream delay. No input loop, no precision constraint.
- **Seat selection (existing R3F picker):** runs locally at ~0 ms input latency (<5 ms render). Seat targets are ~40 px with adjacent-seat adjacency; hover feedback and drag-orbit must feel direct (<100 ms). At 150–300 ms round-trip the cursor visibly trails the pointer, adjacent-seat mis-selection rises, and orbit drag feels spongy. **Spec conclusion validated with numbers: pixel streaming is acceptable for the intro, unacceptable for interactive seat picking.**

---

## 3. Scaling & Cost

- **Concurrency model:** one GPU per stream. Sustained concurrency C ⇒ ~C×(margin) booted instances (GPU boot = 3–5 min, so warm pool is mandatory; you cannot cold-start on demand).
- **Per-session cost:** 45 s hold (warm-up + 9 s intro + teardown) at $1.006/hr ≈ **$0.013 on-demand**.
- **Sustained reality:** 5 concurrent ⇒ ~6 instances × $1.006 × 730 h ≈ **$4,400/mo mostly idle**. Contrast: pre-rendered 9 s MP4 on CloudFront ≈ **$0.02–0.05 per 1,000 views** (~5,000× cheaper). TURN-relayed sessions add ~15–20 Mbps egress each (hairpin bandwidth).
- **Autoscale:** matchmaker publishes CloudWatch custom metrics (active sessions, queue depth); ASG target-tracking at 70% utilization, min 1 warm instance, cooldown 5–10 min, spot for burst with on-demand fallback.
- **Session TTL:** hard cap 120 s, idle timeout 20 s, reconnect window 60 s.
- **Hard fallback chain (client-side, in `frontend`):** (1) attempt pixel stream only if ticket endpoint reachable AND device is not mobile/metered AND WebRTC connects + first frame < 6 s; (2) on any failure → play **pre-rendered MP4/WebM from CDN** (same content, rendered once in CI from the future UE asset); (3) if video fails or data-saver → **plain CSS fade**. Same player component in all three paths.

---

## 4. Security

- Browser **never** learns or touches the UE instance. Backend (Spring Boot) issues a signed ticket: HMAC/JWT, TTL 90 s, single-use, bound to user+booking+nonce, hash-stored in Redis.
- Signalling is **WSS only** (browser secure-context rule: HTTPS page ⇒ wss). Matchmaker/signalling validate signature + TTL before issuing the streamer WSS URL and before PeerConnection is allowed.
- **UE instances in a private subnet — no public IP, no inbound ports.** Only matchmaker, signalling, and coturn (3478 + restricted relay range) are public; coturn uses HMAC short-lived credentials; relay port range locked down; CloudFront/WAF + rate limiting in front of the ticket endpoint; all sessions audit-logged.
- **No ticket ⇒ no streamer route.** Per-user daily cap prevents "stream all day for free"; entitlement gate prevents unauthenticated streaming.

---

## 5. Recommended Decision for THIS Product

**Shipped default: pre-rendered MP4/WebM.** Zero UE assets exist; the Agent-1 asset pipeline is unbuilt; video delivers identical customer value at ~5,000× lower cost, works on mobile/metered, has no GPU fleet to operate, and no abuse surface. CI renders the video once from the future UE scene.

**Pixel Streaming = later opt-in. GO only when all pass:**
- [ ] A real UE fly-in level/asset exists and is exported from the (future) Agent-1 pipeline
- [ ] A distinct interactive hook video cannot do (live camera, teaser interactivity) is defined
- [ ] Projected peak concurrency justifies a sustained warm pool (≥ ~$1,000/mo streaming budget)
- [ ] Ops capacity to run matchmaker + coturn + ASG + monitoring
- [ ] Mobile/metered users are confirmed NOT the majority of the funnel
- [ ] Security review of ticket → matchmaker → TURN path passed

**NO-GO if any item above is missing** — especially "no UE asset" and "budget ≤ $500/mo." Deferring costs ~zero because the frontend fallback chain is the same player in every path; when the asset lands, the video path simply gets re-rendered from the real UE build, and pixel streaming can be switched on behind the same ticket gate.

*Filed by: UnrealMultiplayerArchitect subagent. Research: AWS G5/G4dn specs & pricing (July 2026), Epic PixelStreamingInfrastructure reference architecture, WebRTC latency budgets, AWS pixel-streaming-at-scale sample.*
