# VyGo User Journeys — Expressway & Classic Routes

Three journeys mapped to the current build with friction points marked `[FRICTION]` (rooted in `frontend/src`) and acceptance criteria. Passages with **Acceptance** = must pass in the expressway remake.

---

## Journey A — First-time passenger books an E01 expressway seat (Colombo → Galle)

**Persona**: "Dilani", 29, marketing exec in Colombo, commutes home to Galle every other weekend. Mobile-first, busy, will abandon if a task takes >3 minutes. Wants the fast expressway bus, cares about departure time and operator.

### Step-by-step flow
1. **Land on Home** (`Layout.jsx` header + `Home.jsx` hero). Hero says "including expressway services on E01, E02 and E03" — but no expressway UI in the search card.
   - `[FRICTION]` No corridor/expressway filter; only Bus type AC/Luxury/Semi/Normal (`Home.jsx:201–207`).
2. **Type "Colombo" → "Galle"**, pick a date.
   - `[FRICTION]` Free-text inputs, no autocomplete; typo ("Gallle") → dead-end empty state (`Home.jsx:262–269`).
3. **Search** → results grid (`Home.jsx:242–331`). Cards show time, duration, km, bus type, operator, reg, seats left, fare.
   - `[FRICTION]` No operator ratings/trust signals — Dilani can't tell SLTB from a private operator she's never heard of (`Home.jsx:300–313`).
   - `[FRICTION]` Expressway vs general trips aren't distinguishable except by time/duration; she must mentally filter.
   - `[FRICTION]` Sort is only departure or fare low→high — she can't filter morning departures.
4. **Tap a trip** → `SeatSelect.jsx`. Summary shows operator + bus reg + fare per seat; boarding/dropoff selects pre-default to first/last stop (`SeatSelect.jsx:28–29`).
   - `[FRICTION]` Expressway stops (e.g., Welipenna interchange) appear only as names in dropdowns; no indication which is the expressway interchange vs city terminal.
5. **Pick seat** → legend (Available/Selected/Locked/Booked) shows, but legend swatches don't match rendered seat opacity (`SeatSelect.jsx:186–191` vs `BusSeatMap.jsx:45–51`); max-6 cap unexplained (`SeatSelect.jsx:21–24`).
6. **"Continue with N seats"** → locks seats (`Home` state → `POST /bookings/lock-seats`, `SeatSelect.jsx:70–112`) → navigates to `Payment.jsx`.
7. **Payment** — three manual steps: Create booking → Initiate payment → Open sandbox → Confirm (dev) (`Payment.jsx:174–230`).
   - `[FRICTION]` "PayHere sandbox" + "Confirm payment (dev)" copy erodes trust; boarding/drop-off shown as raw `#id`s (`Payment.jsx:165–168`).
   - `[FRICTION]` Payment opens in a new tab; user must return and click confirm manually — easy to lose.
8. **Land on booking detail** with QR ticket.

### Acceptance criteria (must all pass)
- AC1: Dilani can search Colombo→Galle and one-tap filter to **Expressway only**, with an E01 corridor label on the trip card, in ≤3 taps.
- AC2: Every result card shows a trust signal: operator name + **SLTB/Private badge** + rating, or a "New operator" fallback.
- AC3: From a result card to "Seats locked" requires no more than 2 actions and shows stop **names** (not IDs) at every later step.
- AC4: The payment screen is a single "Pay now" intent (amount, stops, seats) with **no sandbox/dev language** in the passenger flow.
- AC5: Total time Home→payment-confirmed ≤ 3.5 min on a 4G connection; zero steps silently drop context.

---

## Journey B — Kataragama pilgrim uses a classic numbered route (Route 99 / 122)

**Persona**: "Ammu", 55, from Ratnapura district, travels once a month to Kataragama for poya pilgrimages. Uses a shared smartphone, moderate digital literacy, budgets tightly, strongly prefers the **government SLTB service** ("sarkari bus") for safety and fixed fares. Rarely books online; may be searching on a relative's phone.

### Step-by-step flow
1. **Open Routes** via nav (`Layout.jsx:41–43,55–57`; `Routes.jsx`). Header: "Browse every bus route across Sri Lanka, including expressway services".
   - `[FRICTION]` Nav item is labelled "Routes" — Ammu may not know that's where numbered CTB routes live.
2. **Type "Kataragama" or "99"** in the catalogue search (`Routes.jsx:146–153`); debounced 300 ms → filtered list.
   - `[FRICTION]` Search is single free-text over city or route number; no operator filter, no "Government (SLTB)" filter, so the classic routes page can't answer "is there an SLTB 99?" at a glance.
3. **See route card** — Route 99/122, from/to cities, duration, boarding points count, type/class badges (`Routes.jsx:261–330`).
   - `[FRICTION]` Card shows no fare range, no operator, no timetable (first/last departure) — a pilgrim can't judge if it fits poya timing.
   - `[FRICTION]` Corridor names absent; "Expressway service / General road" is the only route-type cue (`Routes.jsx:279`).
4. **Tap "Search trips"** → navigates to Home with `{ from, to }` only.
   - `[FRICTION]` **Search does not auto-run** (`Home.jsx:72–83` requires `runSearch: true`, which `Routes.jsx:321–327` never sends) — Ammu must press "Search trips" a second time.
5. **Results** show whichever operators serve the route that day.
   - `[FRICTION]` If no trips that date → dead end; the only fallback is "Ask VyGo Assistant" (`Home.jsx:265–268`), which may be too advanced for this user.
6. **Book** → same SeatSelect/Payment flow as Journey A; the sandbox/dev steps (`Payment.jsx:219–228`) and "Sign in to book" gate (`Home.jsx:322–326`) are high-risk drop-off points for a user with low digital confidence.

### Acceptance criteria (must all pass)
- AC1: Ammu can reach the Route 99/122 catalogue entry from Home in ≤2 taps (add a "Classic routes" or numbered-route shortcut, not only the "Routes" nav).
- AC2: Route cards for classic services show **fare range, first/last departure time, and which operators (SLTB badge first)** so she can trust a government bus exists.
- AC3: "Search trips" from a route card **auto-runs a pre-targeted search** on the route's date and keeps the route number context.
- AC4: If no trips show, the empty state offers a **plain-language** alternative (other dates / nearby stops), not just the AI assistant.
- AC5: The whole path is legible in Sinhala-friendly formatting (LKR fares, 12-hour times) and works on a low-end 4G device.

---

## Journey C — Returning user plans with the AI assistant, then books

**Persona**: "Nuwan", 24, student in Colombo, returns to Kandy for holidays; already has a VyGo account and a saved QR ticket. Likes delegating: "just tell me the best bus". Uses the assistant because he doesn't want to re-type searches.

### Step-by-step flow
1. **Tap FAB** bottom-right (`AiAssistant.jsx:322–331`), present on every page via `Layout.jsx:136`.
   - `[FRICTION]` Icon-only FAB, no label/teaser — first-time discovery weak; on mobile can look like a decorative bubble.
2. **Welcome bubble** appears with suggestions: 'Book a bus', 'My bookings', 'Refund policy', 'What can you do?' (`AiAssistant.jsx:6–13`).
   - `[FRICTION]` No corridor/expressway prompts; Nuwan must phrase his own question ("E01 Colombo to Kandy Saturday?").
3. **Nuwan types** "Plan Colombo to Kandy this Saturday" → `POST /assistant/chat` (`AiAssistant.jsx:135`) → reply with trip suggestions + action button.
   - `[FRICTION]` Reply formatting is plain text + numbered lines (`AiAssistant.jsx:46–78`); trips aren't rendered as comparable cards — price/time comparison (job b) is weaker in-chat than on Home.
4. **Tap action "Search Colombo → Kandy"** → `navigate('/', { state: { ..., runSearch: true } })` (`AiAssistant.jsx:169–178`) → Home auto-searches (`Home.jsx:72–83`).
   - `[FRICTION]` Context is narrowed to a search, not a selected trip; Nuwan re-evaluates options on the results grid (acceptable, but a "Book this seat" deep link would cut steps).
5. **Complete booking** (SeatSelect → Payment) as in Journey A; assistant closes on action (`AiAssistant.jsx:177`).
6. **Checkout on My Bookings** (nav `Layout.jsx:58–60`) → sees QR ticket.

### Acceptance criteria (must all pass)
- AC1: The FAB is discoverable: persistent label or first-visit teaser, with the dialog keyboard-focusable and Escape-closable (already implemented — keep it).
- AC2: The assistant answers corridor questions correctly, e.g., "Which buses go to Matara via E01?" with operator + expressway badges, and cites sources (citation chips already render, `AiAssistant.jsx:245–257`).
- AC3: Any trip the assistant recommends has a one-tap action that lands Nuwan on SeatSelect (or a pre-filled, auto-run search at minimum).
- AC4: Returning users see their identity carried through: no repeated "Sign in to book" warning after login (`Home.jsx:322–326`).
- AC5: In-chat trip suggestions are scannable (structured chips/cards, not only numbered text) with fare + time + bus type visible at a glance.

---

## Cross-journey notes
- **Shared blocker**: every journey ends in the Payment screen, so G7 (sandbox/dev copy + raw IDs) is the single highest-leverage fix for all three journeys.
- **Shared enabler**: corridor metadata (R3/R5) reduces mental filtering in all journeys and makes the AI assistant and Routes catalogue coherent with the expressway expansion.
- **Friction density** is highest for Journey B (low-digital-literacy user), which argues for the plain-language empty state (AC4-B) before any power-user feature.
