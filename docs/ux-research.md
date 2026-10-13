# VyGo UX Research & Audit — Expressway Corridor Remake

**Method**: Code audit of `frontend/src` (Home, Routes, SeatSelect, Payment, AiAssistant, Layout, BusSeatMap) + API contract review (`docs/API_CONTRACT.md`, `docs/ARCHITECTURE.md`). Grounded evidence only; no generative user data collected in this pass. Dates the expressway (E01/E03) + classic CTB route expansion.

## 1. User Jobs → Current Support

| # | User job | Current support | Verdict |
|---|----------|-----------------|---------|
| a | Book an expressway trip Colombo↔Kandy/Galle/Matara/Kataragama fast | Search by free-text city + date; quick chips lack Matara/Kataragama/Airport | Partial |
| b | Compare operator price / time / bus-type | Cards show fare, times, busType badge, seats left; **no operator filter, no ratings** | Weak |
| c | Find which corridor serves a town pair | Routes catalogue filters by Expressway/Normal but shows no human corridor name ("Southern Expressway") | Weak |
| d | Trust SLTB vs private operators | Operator name + reg only; no gov/private badge, no rating (API has `/reviews/operator/{id}` unused) | Missing |
| e | Use AI assistant to plan a trip | FAB + inline links; welcome text is generic; no corridor prompts | Partial |

## 2. Observed UX Gaps (evidence in code)

### G1 — Search is raw free-text, city-only, error-prone
`Home.jsx:149–180` uses plain `<input>`s with placeholders "Departure city"/"Destination city". No typeahead, no datalist, no city vocabulary. A typo or non-city string → `No trips found` dead end (`Home.jsx:262–269`). Expressway trips board at interchanges/stops, so city-level input is also too coarse for corridors.

### G2 — No corridor / expressway / operator filter on the Home search
Hero copy promises "expressway services on E01, E02 and E03" (`Home.jsx:121–124`) but the only filter is Bus type AC/LUXURY/SEMI_LUXURY/NORMAL (`Home.jsx:201–207`). No "Expressway only" toggle, no corridor (E01/E03) picker, no operator filter. Comparison (job b) and corridor discovery (job c) are unsupported at the search level. Sort options are only departure time or fare low→high (`Home.jsx:251–259`) — no duration or time-window (morning/evening) filter for commuters.

### G3 — Operator trust signals absent from trip cards
Result card shows `trip.operator` + `trip.busReg` + seats left (`Home.jsx:300–313`) — no SLTB/private badge, no rating. Backend already exposes `GET /operators/public` and `GET /reviews/operator/{operatorId}` (rating 1–5, reviews) per `API_CONTRACT.md:171–181` — data exists, frontend never calls it. Trust job (d) unsupported.

### G4 — Routes → Home handoff drops the search context (broken micro-interaction)
Route card CTA `Routes.jsx:321–327` navigates with only `{ from, to }`. `Home.jsx:72–83` only auto-runs when `location.state.runSearch === true`, so clicking "Search trips" merely pre-fills the form — the user must click Search again. It also drops the route number/expressway code, so a user browsing "E01" gets a generic untargeted search.

### G5 — Corridor identity is not surfaced to users
Routes shows `E{code}` badge (`Routes.jsx:274–277`) but never the human corridor name (e.g., "Southern Expressway (E01)", "Colombo–Katunayake (E03)"). No field exists in the route model for a display name; stats strip counts expressway routes but can't answer "which corridor serves Galle?" (`Routes.jsx:111–139`). Route cards also hide which operators run each corridor (job b/c).

### G6 — Seat map legend & lock affordance have minor gaps
Legend in `SeatSelect.jsx:186–191` uses swatches `bg-slate-800 / bg-primary-500 / bg-amber-500/40 / bg-red-500/40`; actual states in `BusSeatMap.jsx:45–51` render `amber-500/15` and `red-500/20` — opacity mismatch between legend and seats. Lock expiry is title-tooltip only (`BusSeatMap.jsx:57–62`); no visible countdown, so a locked seat can silently expire mid-selection. Seat selection cap `Math.min(6, ...)` (`SeatSelect.jsx:21–24`) is unexplained to the user.

### G7 — Payment flow leaks dev scaffolding and raw IDs
Three manual button presses: "Create booking" → "Initiate payment (CARD)" → "Open PayHere sandbox" + "Confirm payment (dev)" (`Payment.jsx:180,194,219–228`). Real passengers will hit sandbox/dev language and worry payment isn't real. Summary shows `Boarding point #{id} · Drop-off point #{id}` (`Payment.jsx:165–168`) — raw IDs, not stop names, because names aren't passed through navigation state from SeatSelect.

### G8 — Assistant FAB discoverability and corridor ignorance
FAB is icon-only (`AiAssistant.jsx:322–331`), label only on hover/title, no teaser bubble; on mobile it can read as decoration. Welcome message and `QUICK_PROMPTS` (`AiAssistant.jsx:6–13`) mention nothing about E01/E03 or classic routes; no proactive corridor suggestions. Action support is only `search`/`navigate` (`AiAssistant.jsx:169–178`) — cannot deep-link to a specific trip or seat map.

### G9 — Quick routes omit the new corridors
`QUICK_ROUTES` (`Home.jsx:29–34`) has Colombo→Galle but not Matara, Hambantota, Kataragama, or Katunayake (Airport) — the exact expressway endpoints being added. Jaffna (not expressway-served) is included.

### G10 — Trust microcopy conflicts
"Sign in to book — you can still compare fares" (`Home.jsx:322–326`) is honest but signals a gate at the most valuable moment; footer says "Demo build" (`Layout.jsx:131`) — trust-eroding copy for a real booking product.

## 3. Recommendations (ranked by impact)

### R1 — Corridor-aware search on Home (Impact: High · Effort: Med)
- Replace free-text city inputs with typeahead over the route network's city/stop vocabulary (datalist or lightweight endpoint).
- Add a segmented "Expressway / General / All" toggle + corridor chips (E01 Southern: Colombo–Galle–Matara; E03 Colombo–Katunayake; classic CTB corridors).
- Rebuild `QUICK_ROUTES` around corridors: Colombo→Matara, Colombo→Kataragama, Colombo→Katunayake (Airport), Galle→Kandy.
- *Fixes* G1, G2, G9. Directly serves jobs a and c.

### R2 — Operator trust + ratings on results (Impact: High · Effort: Low–Med)
- Surface `/reviews/operator/{id}` rating + an SLTB/Private (Government/Private) badge on every trip card; add an operator filter chip row on results.
- Requires the backend search response to include `operatorId` (+ optionally rating) — a small contract addition (`API_CONTRACT.md:60–72`).
- *Fixes* G3. Directly serves jobs b and d; expected to lift tap-through on expressway vs general options.

### R3 — Fix the Route → Search handoff and add corridor names (Impact: Med-High · Effort: Low)
- Route card CTA must send `runSearch: true` (+ keep/validate date) and pass `routeNumber`/`expresswayCode` through to Home so the search is pre-targeted and auto-runs.
- Add a display corridor name ("Southern Expressway (E01)") to the route model/card and to Home result badges.
- *Fixes* G4, G5. Low risk, removes an observable dead tap.

### R4 — De-sandbox and humanize the payment step (Impact: Med-High · Effort: Med)
- Collapse to a single "Pay now" intent screen: show stop *names* (pass `boardingPoint.name`/`dropoffPoint.name` through navigation state from SeatSelect), amount, and seat list, then a single PayHere flow.
- Gate sandbox/dev controls ("Confirm payment (dev)") behind an env flag so real users never see them.
- *Fixes* G7. Protects conversion at the final, highest-friction step.

### R5 — Assistant corridor onboarding + labelled FAB (Impact: Med · Effort: Low)
- Update welcome message and quick prompts: "E01 Colombo to Matara", "Which buses go to Kataragama?", "Expressway vs normal bus?".
- Add a persistent FAB label/teaser ("Ask VyGo") or first-visit hint bubble; keep keyboard-focus return behavior (`AiAssistant.jsx:117–122`).
- *Fixes* G8. Serves job e and reduces empty-state reliance on the assistant (`Home.jsx:262–269`).

**Secondary (next quarter)**: legend swatch alignment + lock countdown (G6); time-window and duration sorts (G2); remove "Demo build" copy (G10).

## 4. Suggested measurement plan
- Task completion: % of searches landing on a selected seat within 3 min (target ≥70%).
- Corridor adoption: % of expressway searches using the corridor toggle/chip.
- Trust: rating-badge engagement on cards; tap-through rate SLTB vs private.
- Funnel: Home → SeatSelect and SeatSelect → Payment-complete drop-off (target ≤40% loss).
