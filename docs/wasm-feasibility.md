# WebAssembly Feasibility Analysis — VyGo

**Date:** 2026-08-02
**Stack:** Spring Boot 3 / Java 21 backend · React 18 + Vite 5 + Tailwind frontend · no WASM today
**Scope:** Does WebAssembly add value to VyGo? Document only; no code, no builds.

## Verdict

**No WebAssembly today. Every candidate hot path is either server-side JVM/DB work (where Wasm
cannot help) or browser DOM glue (where Wasm is a proven loss). Revisit only if a client-side
compute kernel ≥1ms per call, called repeatedly, with data crossing the boundary in bulk, actually
appears — and even then, benchmark it against JS first.**

## Files read

- `frontend/src/components/BusSeatMap.jsx` — seat grid rendering
- `frontend/src/pages/SeatSelect.jsx` — seat selection flow + preview calc
- `frontend/src/components/AiAssistant.jsx` — chat UI
- `frontend/src/pages/BookingDetail.jsx` — QR display
- `backend/src/main/java/com/vygo/service/BookingService.java` — booking creation/cancel
- `backend/src/main/java/com/vygo/service/SeatLockService.java` — seat-lock concurrency
- `backend/src/main/java/com/vygo/service/FareCalculator.java` — fare arithmetic
- `backend/src/main/java/com/vygo/util/QrCodeGenerator.java` — QR generation
- `frontend/package.json` — dependency audit

## Candidate-by-candidate

### 1. QR ticket generation / parsing — JS sufficient (and already unused)

- QR codes are generated **server-side** by `QrCodeGenerator.java` (Google zxing) and exposed as
  `/api/v1/tickets/{ref}/qr` (`TicketService.java:76`). The browser never generates or parses a QR;
  `BookingDetail.jsx:175` just renders `<img src={t.qrCodeUrl}>`.
- `qrcode.react` is in `package.json:13` but is **imported nowhere** in `frontend/src` — a dead
  dependency, not a hot path. The realistic cleanup is *removing* it, not compiling it to Wasm.
- If a future feature adds on-device QR *scanning* (conductor app, camera capture), a native
  barcode decoder (zxing-cpp/zbar → Wasm) becomes a genuine candidate — compute-bound, boundary-light.
  That feature does not exist today.

### 2. Seat-map rendering / seat-lock interactions — trivial DOM

- `BusSeatMap.jsx` is pure declarative rendering: a `useMemo` Map lookup (line 17), small layout
  arithmetic (lines 23–30), and at most ~50 `<button>` elements. No canvas, no per-frame loop, no
  data churn. React renders this in single-digit milliseconds; Wasm would add marshalling on top of
  a render it cannot own (React owns the DOM).
- `SeatSelect.jsx` is state toggling (`toggleSeat`, lines 58–68) plus one GET and one POST. The
  409-recovery path (lines 95–105) just re-fetches. Zero compute.
- This is the textbook **"Wasm is slower"** profile: every seat click is a React state update that
  would cross the Wasm boundary to do nothing, then cross back to touch the DOM.

### 3. CPU-heavy numeric work — there is none in the browser

- Fare is computed in the JVM (`FareCalculator.java`, BigDecimal multiply/add — microseconds).
- The only client-side "preview" math is `farePerSeat * selected.length` (`SeatSelect.jsx:221`) —
  a single multiplication. There is no kernel to speed up.

### 4. Rust module for seat-lock concurrency — wrong layer entirely

- Correctness comes from the **database row lock**, not in-process state:
  `seatInventoryRepository.lockSeatsForUpdate(...)` (`SeatLockService.java:64`,
  `BookingService.java:116`) is `SELECT … FOR UPDATE` inside `@Transactional`. The
  `ConcurrentHashMap` (`SeatLockService.java:36`) is only a token store.
- Wasm cannot make a DB transaction faster, and an in-memory Rust module would be a *second* source
  of truth that diverges from the DB across instances — an anti-pattern, not an optimization. JVM
  threads and the DB already solve this.

### 5. WASM for client-side fare/preview — nothing to move

- Candidate 3 shows the preview calc is one multiplication on numbers already in JS memory. Moving
  it into Wasm would cross the boundary to compute `a * b` and cross back — net loss, guaranteed.

### AI Assistant (bonus candidate)

- `AiAssistant.jsx` is chat glue: a POST to `/assistant/chat`, simple regex markdown rendering
  (`renderInline`, `renderMessageText`), and DOM updates. The LLM work is server-side. The client
  regex on strings <1KB is nanoseconds in JS. DOM glue is Wasm's worst category.

## Decision table

| Candidate | Verdict | Why |
|-----------|---------|-----|
| QR generation (server zxing) | ❌ No | Already JVM; browser only displays `<img>` |
| QR parsing (future camera scan) | ⚠️ Revisit | Compute-bound, boundary-light — real Wasm fit, feature absent today |
| Seat map render | ❌ No | ~50 buttons, trivial DOM, Wasm can't own React's DOM |
| Seat-lock concurrency | ❌ No | DB row lock is the authority; Wasm adds a second, divergent truth |
| Client fare preview | ❌ No | `fare * n` — crossing the boundary to multiply loses |
| Assistant UI | ❌ No | Chat glue + server-side LLM |

## Why Wasm loses here, structurally

- **Everything the browser does is DOM/state glue.** Wasm's edge is compute-bound kernels with
  batched buffers crossing the boundary once. VyGo's client never iterates a large buffer.
- **Every win in this app is server-side:** booking, locking, fare, QR, LLM. Wasm runs in the
  browser or as a sandboxed server runtime — neither accelerates a Spring/JVM + Postgres path.
- **Cost with no benefit:** a Rust toolchain, a wasm-pack build step, a linear-memory ownership
  model, and a boundary design discipline would be added to pay for nothing measurable.

## How Wasm could be introduced later (if a real kernel appears)

1. **Toolchain:** Rust + `wasm-pack build --target web` (wasm-bindgen), Vite 5 loads the generated
   ESM directly; no `@vitejs/plugin` for wasm is needed (Vite handles `.wasm` via `?init`/`?url`).
2. **Boundary discipline:** export one coarse function over a shared buffer —
   `process(buf) -> void` — never per-element calls. Copy data in once with a typed-array view over
   `wasm.memory.buffer`, copy results out once.
3. **Threads (only if the kernel is genuinely parallel):** Wasm threads need `SharedArrayBuffer`,
   which requires cross-origin isolation headers (`COOP: same-origin`, `COEP: require-corp`) and a
   worker pool (`new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`). This is
   a deployment change, not just a build change — do not take it on lightly.
4. **Size/load discipline when it does ship:** `wasm-opt -Oz --strip-debug --dce`, size budget in
   CI, `WebAssembly.instantiateStreaming(fetch(...))`, lazy instantiation on first use.

## Payoff trigger (when Wasm becomes worth it)

- A client-side kernel that runs **≥1ms per call and is called many times per interaction**, with
  data that can cross the boundary as one bulk buffer — e.g., on-device QR scanning for a conductor
  flow, or client-side validation of a large offline route/seat dataset.
- **Not** micro-optimizations of single multiplications or DOM rendering.

## Bottom line

VyGo's browser code is thin presentation over a JVM backend. Wasm would add toolchain complexity
and a memory model to a codebase with zero compute-bound client work, and it cannot help the DB,
the JVM, or React. **Decision: do not adopt Wasm. Remove the dead `qrcode.react` dependency, and
re-evaluate only if a genuine client-side kernel (e.g., QR scanning) enters the roadmap.**
